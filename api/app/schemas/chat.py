"""Pydantic schemas for Chat."""
from __future__ import annotations
import uuid
from datetime import datetime
from typing import Optional, List
from app.schemas.consensus_channel import ConsensusChannelRead
from pydantic import BaseModel, Field, constr, ConfigDict
from app.schemas.message import MessageRead

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

    model_config = ConfigDict(from_attributes=True)

class ChatWithMessages(ChatRead):
    """Chat including its associated messages (ordered by timestamp).
    NOTE: Do NOT use from_attributes here, as messages must always be set explicitly in the endpoint to avoid async SQLAlchemy lazy loading errors.
    """
    messages: List[MessageRead] = []
    channels: List["ConsensusChannelRead"] = []

# Resolve forward refs for type checkers
ChatWithMessages.model_rebuild()
