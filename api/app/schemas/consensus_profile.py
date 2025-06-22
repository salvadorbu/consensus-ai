"""Pydantic schemas for ConsensusProfile."""
from __future__ import annotations

import uuid
from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field, constr, ConfigDict


class ConsensusProfileBase(BaseModel):
    name: constr(strip_whitespace=True, max_length=120) = Field(..., description="Display name for the template")
    guiding_model: constr(strip_whitespace=True, max_length=120)
    participant_models: List[constr(strip_whitespace=True, max_length=120)]
    max_rounds: int = Field(..., ge=1, le=32)


class ConsensusProfileCreate(ConsensusProfileBase):
    """Payload for creating a profile."""


class ConsensusProfileUpdate(BaseModel):
    name: Optional[constr(strip_whitespace=True, max_length=120)] = None
    guiding_model: Optional[constr(strip_whitespace=True, max_length=120)] = None
    participant_models: Optional[List[constr(strip_whitespace=True, max_length=120)]] = None
    max_rounds: Optional[int] = Field(None, ge=1, le=32)


class ConsensusProfileRead(ConsensusProfileBase):
    id: uuid.UUID
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
