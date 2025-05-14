"""Pydantic schemas for Message."""
import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, ConfigDict

class UserMessageCreate(BaseModel):
    """Payload for sending a *user* message inside a chat."""
    content: str = Field(..., description="Raw user message content.")
    model: Optional[str] = Field(
        None,
        description="Optional model name to use for the *assistant* response."
        "If omitted, the chat's default model is used.",
    )
    use_consensus: Optional[bool] = Field(
        False,
        description="Whether to use consensus mode for the assistant response."
    )

class MessageRead(BaseModel):
    """Representation of a stored message returned to the client."""
    id: uuid.UUID
    chat_id: uuid.UUID
    role: str
    model: str
    content: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
