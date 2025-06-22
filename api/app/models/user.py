"""SQLAlchemy ORM model for User accounts."""
import uuid
from datetime import datetime

from sqlalchemy import String, func, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base


class User(Base):
    """Represents an authenticated application user."""

    __tablename__ = "users"
    __table_args__ = (
        UniqueConstraint("email", name="uq_users_email"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    email: Mapped[str] = mapped_column(String(length=256), unique=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(length=512), nullable=False)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(server_default=func.now(), onupdate=func.now())

    # Back-reference to owned chats
    chats: Mapped[list["Chat"]] = relationship(
        "Chat", back_populates="user", cascade="all, delete-orphan"
    )

    # Saved consensus profiles
    profiles: Mapped[list["ConsensusProfile"]] = relationship(
        "ConsensusProfile", back_populates="user", cascade="all, delete-orphan"
    )
