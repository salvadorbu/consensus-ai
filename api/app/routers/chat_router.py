"""FastAPI router exposing CRUD endpoints for **Chat** + **Message**."""

from __future__ import annotations

import asyncio
import logging
import uuid
from typing import List, Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, delete, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from ..db import get_session
from ..models.chat import Chat
from ..models.message import Message
from ..models.consensus_channel import ConsensusChannel
from ..schemas.chat import ChatCreate, ChatRead, ChatUpdate, ChatWithMessages
from ..schemas.consensus_channel import ConsensusChannelRead
from ..schemas.message import MessageRead, UserMessageCreate
from ..agent import Agent
from .user_router import get_current_user
from ..schemas.user import UserOut

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/chats", tags=["chats"])

# ---------------------------------------------------------------------------
# Chat CRUD
# ---------------------------------------------------------------------------


@router.post("", response_model=ChatRead, status_code=status.HTTP_201_CREATED)
async def create_chat(
    chat_in: ChatCreate,
    current_user: Annotated[UserOut, Depends(get_current_user)],
    session: AsyncSession = Depends(get_session),
):
    """Create a new chat room."""
    chat = Chat(
        name=chat_in.name,
        default_model=chat_in.default_model,
        user_id=current_user.id,
    )
    session.add(chat)
    await session.commit()
    await session.refresh(chat)
    return ChatRead.model_validate(chat)


@router.get("", response_model=List[ChatRead])
async def list_chats(
    current_user: Annotated[UserOut, Depends(get_current_user)],
    session: AsyncSession = Depends(get_session),
):
    """Return all chats ordered by creation date (descending)."""
    result = await session.execute(
        select(Chat)
        .where(Chat.user_id == current_user.id)
        .order_by(Chat.created_at.desc())
    )
    chats = result.scalars().all()
    return [ChatRead.model_validate(c) for c in chats]


@router.get("/{chat_id}", response_model=ChatWithMessages)
async def get_chat(
    chat_id: uuid.UUID,
    current_user: Annotated[UserOut, Depends(get_current_user)],
    session: AsyncSession = Depends(get_session),
):
    """
    Return chat metadata **plus** its messages (ascending by time).

    NOTE: Never return ChatWithMessages directly from an ORM object, as this can cause
    lazy loading errors in async SQLAlchemy. Always explicitly set the messages attribute.
    """
    chat = await session.get(Chat, chat_id)
    if chat is None or chat.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Chat not found")

    # Eager load messages ordered by timestamp
    msg_result = await session.execute(
        select(Message).options(selectinload(Message.channel)).where(Message.chat_id == chat_id).order_by(Message.created_at.asc())
    )
    messages = msg_result.scalars().all()

    # Eager load consensus channels for this chat
    chan_result = await session.execute(
        select(ConsensusChannel).where(ConsensusChannel.chat_id == chat_id).order_by(ConsensusChannel.created_at.asc())
    )
    channels = chan_result.scalars().all()

    # Build Message DTOs with optional channel
    message_dtos: list[MessageRead] = []
    for m in messages:
        dto = MessageRead.model_validate(m)
        if m.channel_id:
            chan_row = await session.get(ConsensusChannel, m.channel_id)
            if chan_row:
                dto.channel = ConsensusChannelRead.model_validate(chan_row)
        message_dtos.append(dto)

    chat_dto = ChatWithMessages(
        id=chat.id,
        name=chat.name,
        default_model=chat.default_model,
        created_at=chat.created_at,
        updated_at=chat.updated_at,
        messages=message_dtos,
        channels=[ConsensusChannelRead.model_validate(c) for c in channels],
    )
    return chat_dto


@router.patch("/{chat_id}", response_model=ChatRead)
async def update_chat(
    chat_id: uuid.UUID,
    chat_in: ChatUpdate,
    current_user: Annotated[UserOut, Depends(get_current_user)],
    session: AsyncSession = Depends(get_session),
):
    """Partially update a chat's metadata."""
    stmt = (
        update(Chat)
        .where(Chat.id == chat_id, Chat.user_id == current_user.id)
        .values(**{k: v for k, v in chat_in.model_dump(exclude_none=True).items()})
        .returning(Chat)
    )
    result = await session.execute(stmt)
    chat = result.scalar_one_or_none()
    if chat is None:
        raise HTTPException(status_code=404, detail="Chat not found")
    await session.commit()
    return ChatRead.model_validate(chat)


@router.delete("/{chat_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_chat(
    chat_id: uuid.UUID,
    current_user: Annotated[UserOut, Depends(get_current_user)],
    session: AsyncSession = Depends(get_session),
):
    """Remove a chat and **all** its messages."""
    result = await session.execute(delete(Chat).where(Chat.id == chat_id, Chat.user_id == current_user.id))
    if result.rowcount == 0:
        raise HTTPException(status_code=404, detail="Chat not found")
    await session.commit()


# ---------------------------------------------------------------------------
# Messages
# ---------------------------------------------------------------------------


async def _call_agent(model: str, messages: list[dict[str, str]]) -> str | None:
    """Helper to run *Agent.chat* in a thread pool to avoid blocking the event loop."""

    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(None, Agent(model).chat, messages)


# In-memory busy state per chat
_chat_busy = {}
_chat_futures: dict[str, asyncio.Future] = {}


@router.post("/{chat_id}/messages", response_model=MessageRead, status_code=status.HTTP_201_CREATED)
async def send_message(
    chat_id: uuid.UUID,
    msg_in: UserMessageCreate,
    current_user: Annotated[UserOut, Depends(get_current_user)],
    session: AsyncSession = Depends(get_session),
):
    """Send a *user* message and return the assistant response (both stored)."""

    # Check if agent is busy for this chat
    if _chat_busy.get(str(chat_id), False):
        raise HTTPException(status_code=409, detail="Agent is still responding. Please wait for the previous response to complete.")
    _chat_busy[str(chat_id)] = True
    try:
        chat = await session.get(Chat, chat_id)
        if chat is None or chat.user_id != current_user.id:
            _chat_busy[str(chat_id)] = False
            raise HTTPException(status_code=404, detail="Chat not found")

        # 1) Persist *user* message
        user_msg = Message(
            chat_id=chat_id,
            role="user",
            model="user",
            content=msg_in.content,
        )
        session.add(user_msg)
        await session.flush()  # obtain PK before calling LLM

        # 2) Build conversation history for the assistant call
        result = await session.execute(
            select(Message).options(selectinload(Message.channel)).where(Message.chat_id == chat_id).order_by(Message.created_at.asc())
        )
        history = result.scalars().all()
        messages_payload = [
            {"role": m.role, "content": m.content} for m in history if m.content is not None
        ]

        # 3) Call the model (potentially different from default)
        model_to_use = msg_in.model or chat.default_model

        # ------------------------------
        # CONSENSUS path
        # ------------------------------
        if msg_in.use_consensus or msg_in.profile_id is not None:
            # Resolve consensus parameters
            if msg_in.profile_id:
                from ..models.consensus_profile import ConsensusProfile
                prof = await session.get(ConsensusProfile, msg_in.profile_id)
                if prof is None or prof.user_id != current_user.id:
                    raise HTTPException(status_code=404, detail="Profile not found")
                guiding = prof.guiding_model
                participants = prof.participant_models
                rounds = prof.max_rounds
            else:
                guiding = msg_in.guiding_model or chat.default_model
                participants = msg_in.participant_models or [chat.default_model]
                rounds = msg_in.max_rounds or 8
            from ..services.consensus_service import spawn_channel  # local import to avoid cycles
            channel_id = await spawn_channel(
                task=msg_in.content,
                guiding_model=guiding,
                participant_models=participants,
                max_rounds=rounds,
                chat_id=chat_id,
                session=session,
            )
            # Placeholder assistant message (empty until consensus finishes)
            assistant_msg = Message(
                generation_mode="consensus",
                channel_id=channel_id,
                chat_id=chat_id,
                role="assistant",
                model="consensus",
                content="",  # will be updated asynchronously
            )
            session.add(assistant_msg)
            await session.flush()
            await session.commit()
            # Re-fetch with relationship eagerly loaded to avoid lazy-load during Pydantic conversion

            
            result = await session.execute(
                select(Message).options(selectinload(Message.channel)).where(Message.id == assistant_msg.id)
            )
            msg_with_channel = result.scalar_one()
            return MessageRead.model_validate(msg_with_channel)

        # ------------------------------
        # DIRECT LLM path
        # ------------------------------
        loop = asyncio.get_running_loop()
        future: asyncio.Future = loop.run_in_executor(None, Agent(model_to_use).chat, messages_payload)
        _chat_futures[str(chat_id)] = future
        try:
            assistant_content = await future
        except asyncio.CancelledError:
            logger.info("Generation cancelled for chat %s", chat_id)
            raise HTTPException(status_code=499, detail="Generation cancelled")
        finally:
            _chat_futures.pop(str(chat_id), None)
        assistant_content = assistant_content or ""

        # 4) Persist assistant reply
        assistant_msg = Message(
            generation_mode="direct", 
            chat_id=chat_id,
            role="assistant",
            model=model_to_use,
            content=assistant_content,
        )
        session.add(assistant_msg)

        await session.commit()
        await session.refresh(assistant_msg)

        return MessageRead.model_validate(assistant_msg)
    finally:
        _chat_busy[str(chat_id)] = False


@router.get("/{chat_id}/messages", response_model=List[MessageRead])
async def list_messages(
    chat_id: uuid.UUID,
    current_user: Annotated[UserOut, Depends(get_current_user)],
    session: AsyncSession = Depends(get_session),
):
    """Return all messages for a chat ordered by creation time ascending."""
    result = await session.execute(
        select(Message).options(selectinload(Message.channel)).where(Message.chat_id == chat_id).order_by(Message.created_at.asc())
    )
    messages = result.scalars().all()
    if not messages:
        # Validate chat exists
        chat = await session.get(Chat, chat_id)
        if chat is None or chat.user_id != current_user.id:
            raise HTTPException(status_code=404, detail="Chat not found")
    message_dtos: list[MessageRead] = []
    for m in messages:
        dto = MessageRead.model_validate(m)
        if m.channel_id:
            chan_row = await session.get(ConsensusChannel, m.channel_id)
            if chan_row:
                dto.channel = ConsensusChannelRead.model_validate(chan_row)
        message_dtos.append(dto)
    return message_dtos


@router.post("/{chat_id}/cancel", status_code=status.HTTP_202_ACCEPTED)
async def cancel_chat(
    chat_id: uuid.UUID,
    current_user: Annotated[UserOut, Depends(get_current_user)],
    session: AsyncSession = Depends(get_session),
):
    """Attempt to cancel an in-flight generation for this chat."""
    chat = await session.get(Chat, chat_id)
    if chat is None or chat.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Chat not found")

    fut = _chat_futures.get(str(chat_id))
    if fut and not fut.done():
        fut.cancel()
    _chat_busy[str(chat_id)] = False
    return {"status": "cancellation_requested"}
