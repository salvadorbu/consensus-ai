"""Pydantic schemas for ConsensusChannel."""
from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field

class ConsensusChannelRead(BaseModel):
    """Minimal read-only representation of a consensus channel, attached to a chat."""

    id: str = Field(..., description="Channel UUID")
    status: str = Field(..., description="Current execution status")
    rounds_executed: Optional[int] = Field(None, description="Number of discussion rounds executed")
    answer: Optional[str] = Field(None, description="Final answer (if finished)")
    created_at: datetime
    finished_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)
