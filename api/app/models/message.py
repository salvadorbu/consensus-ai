"""SQLAlchemy ORM model for Message."""
import uuid
from datetime import datetime
from sqlalchemy import String, ForeignKey, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db import Base
from app.models.chat import Chat


class Message(Base):
    __tablename__ = "messages"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    chat_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("chats.id", ondelete="CASCADE"), nullable=False
    )
    role: Mapped[str] = mapped_column(String(length=20), nullable=False)  # e.g., "user" / "assistant"
    model: Mapped[str] = mapped_column(String(length=120), nullable=False)
    generation_mode: Mapped[str] = mapped_column(String(length=20), nullable=False, default="direct")  # 'direct' | 'consensus'
    channel_id: Mapped[str | None] = mapped_column(String(length=36), ForeignKey("consensus_channels.id", ondelete="SET NULL"), nullable=True)
    # ORM relationship back to ConsensusChannel (may be None)
    channel: Mapped["ConsensusChannel"] = relationship("ConsensusChannel", back_populates="messages")
    content: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())

    chat: Mapped[Chat] = relationship("Chat", back_populates="messages")
