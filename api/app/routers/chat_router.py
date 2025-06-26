"""FastAPI router exposing CRUD endpoints for **Chat** + **Message**."""

from __future__ import annotations

import asyncio
import logging
import uuid
from typing import List, Annotated

from fastapi import APIRouter, Depends, HTTPException, status

from supabase import Client as SupabaseClient

from ..db.supabase_client import get_supabase_client
from ..services import chat_service as chat_service
from ..services.consensus_service import spawn_channel, get_channel_status
from ..services import message_service as message_service
from ..services import consensus_profile_service as profile_service

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
    client: SupabaseClient = Depends(get_supabase_client),
):
    """Create a new chat room."""
    row = await chat_service.create_chat(client, current_user.id, chat_in.model_dump())
    return ChatRead.model_validate(row)


@router.get("", response_model=List[ChatRead])
async def list_chats(
    current_user: Annotated[UserOut, Depends(get_current_user)],
    client: SupabaseClient = Depends(get_supabase_client),
):
    """Return all chats ordered by creation date (descending)."""
    rows = await chat_service.list_chats(client, current_user.id)
    return [ChatRead.model_validate(r) for r in rows]


@router.get("/{chat_id}", response_model=ChatWithMessages)
async def get_chat(
    chat_id: uuid.UUID,
    current_user: Annotated[UserOut, Depends(get_current_user)],
    client: SupabaseClient = Depends(get_supabase_client),
):
    """
    Return chat metadata **plus** its messages (ascending by time).

    NOTE: Never return ChatWithMessages directly from an ORM object, as this can cause
    lazy loading errors in async SQLAlchemy. Always explicitly set the messages attribute.
    """
    row = await chat_service.get_chat(client, chat_id)
    if row is None or row["user_id"] != str(current_user.id):
        raise HTTPException(status_code=404, detail="Chat not found")

    # Fetch messages via service
    msg_rows = await message_service.list_messages(client, chat_id)
    message_dtos: list[MessageRead] = []
    channel_ids: set[str] = set()
    for r in msg_rows:
        dto_dict = r.copy()
        if r.get("channel_id"):
            channel_ids.add(r["channel_id"])
        message_dtos.append(dto_dict)

    # Fetch channel statuses (if any)
    channels_read: list[ConsensusChannelRead] = []
    for cid in channel_ids:
        chan = await get_channel_status(client, cid)
        if chan:
            channels_read.append(ConsensusChannelRead.model_validate(chan))

    chat_dto = ChatWithMessages(
        id=row["id"],
        name=row.get("name"),
        default_model=row["default_model"],
        created_at=row["created_at"],
        updated_at=row["updated_at"],
        messages=[MessageRead.model_validate(d) for d in message_dtos],
        channels=channels_read,
    )
    return chat_dto


@router.patch("/{chat_id}", response_model=ChatRead)
async def update_chat(
    chat_id: uuid.UUID,
    chat_in: ChatUpdate,
    current_user: Annotated[UserOut, Depends(get_current_user)],
    client: SupabaseClient = Depends(get_supabase_client),
):
    """Partially update a chat's metadata."""
    updates = {k: v for k, v in chat_in.model_dump(exclude_none=True).items()}
    row = await chat_service.update_chat(client, chat_id, current_user.id, updates)
    if row is None:
        raise HTTPException(status_code=404, detail="Chat not found")
    return ChatRead.model_validate(row)


@router.delete("/{chat_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_chat(
    chat_id: uuid.UUID,
    current_user: Annotated[UserOut, Depends(get_current_user)],
    client: SupabaseClient = Depends(get_supabase_client),
):
    """Remove a chat and **all** its messages."""
    deleted = await chat_service.delete_chat(client, chat_id, current_user.id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Chat not found")


# ---------------------------------------------------------------------------
# Messages
# ---------------------------------------------------------------------------




# In-memory busy state per chat
_chat_busy = {}
_chat_futures: dict[str, asyncio.Future] = {}


@router.post("/{chat_id}/messages", response_model=MessageRead, status_code=status.HTTP_201_CREATED)
async def send_message(
    chat_id: uuid.UUID,
    msg_in: UserMessageCreate,
    current_user: Annotated[UserOut, Depends(get_current_user)],
    client: SupabaseClient = Depends(get_supabase_client),
):
    """Send a *user* message and return the assistant response (both stored)."""

    # Check if agent is busy for this chat
    if _chat_busy.get(str(chat_id), False):
        raise HTTPException(status_code=409, detail="Agent is still responding. Please wait for the previous response to complete.")
    _chat_busy[str(chat_id)] = True
    try:
        row_chat = await chat_service.get_chat(client, chat_id)
        if row_chat is None or row_chat["user_id"] != str(current_user.id):
            _chat_busy[str(chat_id)] = False
            raise HTTPException(status_code=404, detail="Chat not found")

        # 1) Persist *user* message
        user_msg = await message_service.create_user_message(client, chat_id, msg_in.content)
        user_msg_id = user_msg["id"]

        # 2) Build conversation history for the assistant call
        rows_history = await message_service.list_messages(client, chat_id)
        messages_payload = [
            {"role": r["role"], "content": r["content"]} for r in rows_history if r.get("content")
        ]

        # 3) Call the model (potentially different from default)
        model_to_use = msg_in.model or row_chat["default_model"]

        # ------------------------------
        # CONSENSUS path
        # ------------------------------
        if msg_in.use_consensus or msg_in.profile_id is not None:
            # Resolve consensus parameters
            if msg_in.profile_id:
                # Fetch the profile via Supabase service (no SQLAlchemy dependency)
                profile_row = await profile_service.get_profile(client, msg_in.profile_id, current_user.id)
                if profile_row is None:
                    raise HTTPException(status_code=404, detail="Profile not found")
                guiding = profile_row["guiding_model"]
                participants = profile_row["participant_models"]
                rounds = profile_row["max_rounds"]
            else:
                guiding = msg_in.guiding_model or row_chat["default_model"]
                participants = msg_in.participant_models or [row_chat["default_model"]]
                rounds = msg_in.max_rounds or 8
            # spawn_channel imported from supabase service above
            channel_id = await spawn_channel(
                client=client,
                task=msg_in.content,
                guiding_model=guiding,
                participant_models=participants,
                max_rounds=rounds,
                chat_id=chat_id,
            )
            # Placeholder assistant message (empty until consensus finishes)
            assistant_msg = await message_service.create_assistant_placeholder(client, chat_id, channel_id)
            # Attach minimal channel info
            return MessageRead.model_validate({**assistant_msg, "channel": {"id": channel_id, "status": "pending", "rounds_executed": 0, "created_at": assistant_msg["created_at"], "answer": None}})

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
        assistant_msg = await message_service.create_assistant_message(client, chat_id, model_to_use, assistant_content)

        return MessageRead.model_validate(assistant_msg)
    finally:
        _chat_busy[str(chat_id)] = False


@router.get("/{chat_id}/messages", response_model=List[MessageRead])
async def list_messages(
    chat_id: uuid.UUID,
    current_user: Annotated[UserOut, Depends(get_current_user)],
    client: SupabaseClient = Depends(get_supabase_client),
):
    """Return all messages for a chat ordered by creation time ascending."""
    rows = await message_service.list_messages(client, chat_id)
    if not rows:
        chat_row = await chat_service.get_chat(client, chat_id)
        if chat_row is None or chat_row["user_id"] != str(current_user.id):
            raise HTTPException(status_code=404, detail="Chat not found")
    msg_dtos: list[MessageRead] = []
    for r in rows:
        dto_dict = r.copy()
        if r.get("channel_id"):
            chan = await get_channel_status(client, r["channel_id"])
            if chan:
                dto_dict["channel"] = chan
        msg_dtos.append(MessageRead.model_validate(dto_dict))
    return msg_dtos


@router.post("/{chat_id}/cancel", status_code=status.HTTP_202_ACCEPTED)
async def cancel_chat(
    chat_id: uuid.UUID,
    current_user: Annotated[UserOut, Depends(get_current_user)],
    client: SupabaseClient = Depends(get_supabase_client),
):
    """Attempt to cancel an in-flight generation for this chat."""
    row_chat = await chat_service.get_chat(client, chat_id)
    if row_chat is None or row_chat["user_id"] != str(current_user.id):
        raise HTTPException(status_code=404, detail="Chat not found")

    fut = _chat_futures.get(str(chat_id))
    if fut and not fut.done():
        fut.cancel()
    _chat_busy[str(chat_id)] = False
    return {"status": "cancellation_requested"}
