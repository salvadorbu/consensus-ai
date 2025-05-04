"""FastAPI router exposing CRUD endpoints for **Chat** + **Message**."""

from __future__ import annotations

import asyncio
import logging
import uuid
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, delete, update
from sqlalchemy.ext.asyncio import AsyncSession

from ..db import get_session
from ..models import Chat, Message
from ..schemas import (
    ChatCreate,
    ChatRead,
    ChatUpdate,
    ChatWithMessages,
    MessageRead,
    UserMessageCreate,
)
from ..agent import Agent

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/chats", tags=["chats"])

# ---------------------------------------------------------------------------
# Chat CRUD
# ---------------------------------------------------------------------------


@router.post("", response_model=ChatRead, status_code=status.HTTP_201_CREATED)
async def create_chat(chat_in: ChatCreate, session: AsyncSession = Depends(get_session)):
    """Create a new chat room."""
    chat = Chat(name=chat_in.name, default_model=chat_in.default_model)
    session.add(chat)
    await session.commit()
    await session.refresh(chat)
    return ChatRead.model_validate(chat)


@router.get("", response_model=List[ChatRead])
async def list_chats(session: AsyncSession = Depends(get_session)):
    """Return all chats ordered by creation date (descending)."""
    result = await session.execute(select(Chat).order_by(Chat.created_at.desc()))
    chats = result.scalars().all()
    return [ChatRead.model_validate(c) for c in chats]


@router.get("/{chat_id}", response_model=ChatWithMessages)
async def get_chat(chat_id: uuid.UUID, session: AsyncSession = Depends(get_session)):
    """Return chat metadata **plus** its messages (ascending by time)."""
    chat = await session.get(Chat, chat_id)
    if chat is None:
        raise HTTPException(status_code=404, detail="Chat not found")

    # Eager load messages ordered by timestamp
    result = await session.execute(
        select(Message).where(Message.chat_id == chat_id).order_by(Message.created_at.asc())
    )
    messages = result.scalars().all()

    chat_dto = ChatWithMessages.model_validate(chat)
    chat_dto.messages = [MessageRead.model_validate(m) for m in messages]
    return chat_dto


@router.patch("/{chat_id}", response_model=ChatRead)
async def update_chat(
    chat_id: uuid.UUID, chat_in: ChatUpdate, session: AsyncSession = Depends(get_session)
):
    """Partially update a chat's metadata."""
    stmt = (
        update(Chat)
        .where(Chat.id == chat_id)
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
async def delete_chat(chat_id: uuid.UUID, session: AsyncSession = Depends(get_session)):
    """Remove a chat and **all** its messages."""
    result = await session.execute(delete(Chat).where(Chat.id == chat_id))
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


@router.post("/{chat_id}/messages", response_model=MessageRead, status_code=status.HTTP_201_CREATED)
async def send_message(
    chat_id: uuid.UUID, msg_in: UserMessageCreate, session: AsyncSession = Depends(get_session)
):
    """Send a *user* message and return the assistant response (both stored)."""

    chat = await session.get(Chat, chat_id)
    if chat is None:
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
        select(Message).where(Message.chat_id == chat_id).order_by(Message.created_at.asc())
    )
    history = result.scalars().all()
    messages_payload = [
        {"role": m.role, "content": m.content} for m in history if m.content is not None
    ]

    # 3) Call the model (potentially different from default)
    model_to_use = msg_in.model or chat.default_model
    assistant_content = await _call_agent(model_to_use, messages_payload) or ""

    # 4) Persist assistant reply
    assistant_msg = Message(
        chat_id=chat_id,
        role="assistant",
        model=model_to_use,
        content=assistant_content,
    )
    session.add(assistant_msg)

    await session.commit()
    await session.refresh(assistant_msg)

    return MessageRead.model_validate(assistant_msg)


@router.get("/{chat_id}/messages", response_model=List[MessageRead])
async def list_messages(chat_id: uuid.UUID, session: AsyncSession = Depends(get_session)):
    """Return all messages for a chat ordered by creation time ascending."""
    result = await session.execute(
        select(Message).where(Message.chat_id == chat_id).order_by(Message.created_at.asc())
    )
    messages = result.scalars().all()
    if not messages:
        # Validate chat exists
        if await session.get(Chat, chat_id) is None:
            raise HTTPException(status_code=404, detail="Chat not found")
    return [MessageRead.model_validate(m) for m in messages]
