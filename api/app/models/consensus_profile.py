"""SQLAlchemy ORM model for a saved consensus profile belonging to a user."""
from __future__ import annotations

import uuid
from datetime import datetime
from typing import List

from sqlalchemy import String, Integer, JSON, ForeignKey, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base


class ConsensusProfile(Base):
    """Persisted template for spawning a consensus channel."""

    __tablename__ = "consensus_profiles"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # Owning user
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    user: Mapped["User"] = relationship("User", back_populates="profiles")

    # Display name
    name: Mapped[str] = mapped_column(String(length=120), nullable=False)

    guiding_model: Mapped[str] = mapped_column(String(length=120), nullable=False)
    participant_models: Mapped[List[str]] = mapped_column(JSON, nullable=False)
    max_rounds: Mapped[int] = mapped_column(Integer, nullable=False)

    created_at: Mapped[datetime] = mapped_column(server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(server_default=func.now(), onupdate=func.now())
