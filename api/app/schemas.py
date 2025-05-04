"""Pydantic schemas for the Chat + Message API layer."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional, List

from pydantic import BaseModel, Field, constr

# ---------------------------------------------------------------------------
# Chat
# ---------------------------------------------------------------------------


class ChatBase(BaseModel):
    name: Optional[constr(strip_whitespace=True, max_length=120)] = Field(
        None, description="Optional display name for the chat room."
    )
    default_model: constr(strip_whitespace=True, max_length=120) = Field(
        ..., description="The default LLM model used for assistant replies."
    )


class ChatCreate(ChatBase):
    """Payload for creating a new chat."""


class ChatUpdate(BaseModel):
    """Partial update for an existing chat."""

    name: Optional[constr(strip_whitespace=True, max_length=120)] = None
    default_model: Optional[constr(strip_whitespace=True, max_length=120)] = None


class ChatRead(BaseModel):
    """Representation of a chat returned to API consumers."""

    id: uuid.UUID
    name: Optional[str]
    default_model: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ---------------------------------------------------------------------------
# Message
# ---------------------------------------------------------------------------


class UserMessageCreate(BaseModel):
    """Payload for sending a *user* message inside a chat."""

    content: str = Field(..., description="Raw user message content.")
    model: Optional[str] = Field(
        None,
        description="Optional model name to use for the *assistant* response."
        "If omitted, the chat's default model is used.",
    )


class MessageRead(BaseModel):
    """Representation of a stored message returned to the client."""

    id: uuid.UUID
    chat_id: uuid.UUID
    role: str
    model: str
    content: str
    created_at: datetime

    class Config:
        from_attributes = True


# ---------------------------------------------------------------------------
# Convenience containers
# ---------------------------------------------------------------------------


class ChatWithMessages(ChatRead):
    """Chat including its associated messages (ordered by timestamp)."""

    messages: List[MessageRead] = []

    class Config:
        from_attributes = True
