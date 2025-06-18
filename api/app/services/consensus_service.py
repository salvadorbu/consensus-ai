"""Shared utilities to spawn and track multi-agent ConsensusChannel runs.

This centralises logic that was previously duplicated in *channel_router* so
that other parts of the application (e.g. *chat_router*) can create consensus
runs without re-implementing the heavy lifting.
"""
from __future__ import annotations

import asyncio
import uuid
from concurrent.futures import ThreadPoolExecutor
from typing import Dict, Any, List, Optional

from sqlalchemy import update, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.channel import Channel, ChannelConfig
from app.agent import Agent
from app.db import async_session_factory
from app.models.consensus_channel import ConsensusChannel
from app.models.message import Message

# ---------------------------------------------------------------------------
# In-memory caches (per process)
# ---------------------------------------------------------------------------

_channels: Dict[str, Channel] = {}
_channel_status: Dict[str, Dict[str, Any]] = {}
_executor: ThreadPoolExecutor = ThreadPoolExecutor(max_workers=4)

# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

async def _update_db(
    channel_id: str,
    status: str,
    rounds: int | None = None,
    answer: str | None = None,
    log: Dict[str, Any] | None = None,
) -> None:
    """Persist Channel run status to the database."""
    async with async_session_factory() as session:
        stmt = (
            update(ConsensusChannel)
            .where(ConsensusChannel.id == channel_id)
            .values(
                status=status,
                rounds_executed=rounds,
                answer=answer,
                finished_at=func.now() if status in {"finished", "error"} else None,
                log=log,
            )
        )
        await session.execute(stmt)
        await session.commit()

async def _persist_consensus_message(chat_id: uuid.UUID, channel_id: str, answer: str) -> None:
    """Save the final consensus *answer* as an assistant message."""
    async with async_session_factory() as session:
        # Find the placeholder message
        result = await session.execute(
            update(Message)
            .where(Message.channel_id == channel_id)
            .values(content=answer)
            .returning(Message)
        )
        row = result.scalar_one_or_none()
        if row is None:
            # Fallback: create a new message if placeholder missing
            assistant_msg = Message(
                chat_id=chat_id,
                role="assistant",
                model="consensus",
                generation_mode="consensus",
                channel_id=channel_id,
                content=answer,
            )
            session.add(assistant_msg)
        await session.commit()

# ---------------------------------------------------------------------------
# Background task
# ---------------------------------------------------------------------------

def _run_channel(channel_id: str, chat_id: Optional[uuid.UUID], loop: asyncio.AbstractEventLoop) -> None:  # noqa: D401
    """Blocking execution of Channel.run() inside ThreadPool."""
    channel = _channels[channel_id]
    _channel_status[channel_id]["status"] = "running"
    try:
        answer = channel.run()
        log_payload = {agent.model: history for agent, history in channel._history.items()}
        _channel_status[channel_id].update(
            {"status": "finished", "rounds_executed": channel.rounds_executed, "answer": answer}
        )
        # Fire-and-forget DB persistence
        asyncio.run_coroutine_threadsafe(
            _update_db(channel_id, "finished", channel.rounds_executed, answer, log_payload),
            loop,
        )
        if chat_id is not None:
            asyncio.run_coroutine_threadsafe(_persist_consensus_message(chat_id, channel_id, answer), loop)
    except Exception as exc:  # pylint: disable=broad-except
        _channel_status[channel_id].update({"status": "error", "error": str(exc)})
        asyncio.run_coroutine_threadsafe(_update_db(channel_id, "error", 0, str(exc)), loop)

# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

async def spawn_channel(
    *,
    task: str,
    guiding_model: str,
    participant_models: List[str],
    max_rounds: int = 8,
    chat_id: uuid.UUID | None = None,
    session: AsyncSession,
) -> str:
    """Create *ConsensusChannel* DB row, launch background discussion, return channel_id."""

    channel_id = str(uuid.uuid4())

    guiding_agent = Agent(guiding_model)
    participant_agents = [Agent(m) for m in participant_models]
    config = ChannelConfig(max_rounds=max_rounds)
    channel = Channel(task, guiding_agent, participant_agents, config)

    # Persist DB row using provided session
    db_row = ConsensusChannel(
        id=channel_id,
        task=task,
        guiding_model=guiding_model,
        participant_models=participant_models,
        max_rounds=max_rounds,
        chat_id=chat_id,
    )
    session.add(db_row)
    await session.commit()

    # Track in memory and launch background thread
    _channels[channel_id] = channel
    _channel_status[channel_id] = {
        "status": "pending",
        "rounds_executed": 0,
        "answer": None,
        "chat_id": chat_id,
    }

    loop = asyncio.get_event_loop()
    loop.run_in_executor(_executor, _run_channel, channel_id, chat_id, loop)

    return channel_id


def get_channel_status(channel_id: str) -> Dict[str, Any] | None:
    """Return cached status if available (used by routers for fast polling)."""
    return _channel_status.get(channel_id)
