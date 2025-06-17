from fastapi import APIRouter, BackgroundTasks, HTTPException, Depends
from typing import List, Dict, Any, Optional
import uuid
from uuid import uuid4, UUID
import asyncio
from concurrent.futures import ThreadPoolExecutor
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, func
from ..db import get_session, async_session_factory
from ..models.consensus_channel import ConsensusChannel
from ..models.chat import Chat
from ..models.message import Message
from ..agent import Agent
from ..channel import Channel, ChannelConfig

router = APIRouter(prefix="/channels", tags=["channels"])

_channels: Dict[str, Channel] = {}
_channel_status: Dict[str, Dict[str, Any]] = {}
_executor = ThreadPoolExecutor(max_workers=4)

async def _update_db(channel_id: str, status: str, rounds: int | None = None, answer: str | None = None, log: Dict[str, Any] | None = None) -> None:
    """Internal helper to persist Channel run status."""
    async with async_session_factory() as session:
        stmt = (
            update(ConsensusChannel)
            .where(ConsensusChannel.id == channel_id)
            .values(status=status, rounds_executed=rounds, answer=answer, finished_at=func.now(), log=log)
        )
        await session.execute(stmt)
        await session.commit()

class CreateChannelRequest(BaseModel):
    task: str = Field(..., description="Task description presented to the agents.")
    guiding_model: str = Field(..., description="Model identifier for the guiding / moderator agent.")
    participant_models: List[str] = Field(..., min_length=1, description="List of model identifiers for participant agents.")
    max_rounds: int = Field(8, ge=1, le=20, description="Maximum number of discussion rounds.")
    chat_id: Optional[UUID] = Field(None, description="Existing chat to attach this consensus run to.")

class ChannelStatusResponse(BaseModel):
    status: str
    rounds_executed: int
    answer: str | None = None
    error: str | None = None

async def _persist_consensus_message(chat_id: UUID, answer: str) -> None:
    """Persist the consensus *answer* as an assistant message in the given chat."""
    async with async_session_factory() as session:
        assistant_msg = Message(
            chat_id=chat_id,
            role="assistant",
            model="consensus",
            content=answer,
        )
        session.add(assistant_msg)
        await session.commit()


def _run_channel(channel_id: str, chat_id: Optional[UUID], loop: asyncio.AbstractEventLoop) -> None:
    channel = _channels[channel_id]
    _channel_status[channel_id]["status"] = "running"
    try:
        answer = channel.run()
        # Build serialisable log
        log_payload = {agent.model: history for agent, history in channel._history.items()}
        _channel_status[channel_id].update(
            {
                "status": "finished",
                "rounds_executed": channel.rounds_executed,
                "answer": answer,
            }
        )
        # Persist to DB (fire-and-forget; we cannot await inside ThreadPool)
        asyncio.run_coroutine_threadsafe(
            _update_db(channel_id, "finished", channel.rounds_executed, answer, log_payload),
            loop,
        )
        # Also persist the answer to the associated chat (if any)
        if chat_id is not None:
            asyncio.run_coroutine_threadsafe(_persist_consensus_message(chat_id, answer), loop)
    except Exception as exc:
        _channel_status[channel_id].update({"status": "error", "error": str(exc)})
        asyncio.run_coroutine_threadsafe(
            _update_db(channel_id, "error", 0, str(exc)),
            loop,
        )

@router.post("/", response_model=dict)
async def create_channel(req: CreateChannelRequest, background_tasks: BackgroundTasks, session: AsyncSession = Depends(get_session)):
    """Spin up a new consensus channel and return its ID."""
    # Validate associated chat if provided
    if req.chat_id is not None and await session.get(Chat, req.chat_id) is None:
        raise HTTPException(status_code=404, detail="Chat not found")

    channel_id = str(uuid4())

    guiding_agent = Agent(req.guiding_model)
    participant_agents = [Agent(m) for m in req.participant_models]
    config = ChannelConfig(max_rounds=req.max_rounds)

    channel = Channel(req.task, guiding_agent, participant_agents, config)
    _channels[channel_id] = channel
    _channel_status[channel_id] = {"status": "pending", "rounds_executed": 0, "answer": None, "chat_id": req.chat_id}

    # Persist initial DB record
    db_row = ConsensusChannel(
        id=channel_id,
        task=req.task,
        guiding_model=req.guiding_model,
        participant_models=req.participant_models,
        max_rounds=req.max_rounds,
        chat_id=req.chat_id,
    )
    session.add(db_row)
    await session.commit()

    loop = asyncio.get_event_loop()
    background_tasks.add_task(loop.run_in_executor, _executor, _run_channel, channel_id, req.chat_id, loop)

    return {"channel_id": channel_id}

@router.get("/{channel_id}", response_model=ChannelStatusResponse)
async def get_channel_status(channel_id: str, session: AsyncSession = Depends(get_session)):
    """Return the latest known status for a channel.

    We prioritise the **in-memory** tracking dictionary because the background
    worker thread updates it synchronously, whereas the database update is
    asynchronous and may lag by a few hundred milliseconds. Falling back to the
    persisted record ensures robustness if the API process is restarted and
    the in-memory cache is lost.
    """
    cache = _channel_status.get(channel_id)
    if cache is not None and cache.get("status") != "pending":
        # In-memory record is authoritative once it moves beyond 'pending'.
        return ChannelStatusResponse(
            status=cache["status"],
            rounds_executed=cache.get("rounds_executed", 0),
            answer=cache.get("answer"),
            error=cache.get("error"),
        )

    # Either still pending or not in cache – read from DB
    row = await session.get(ConsensusChannel, channel_id)
    if row is None:
        raise HTTPException(status_code=404, detail="Channel not found")
    return ChannelStatusResponse(status=row.status, rounds_executed=row.rounds_executed or 0, answer=row.answer, error=row.answer if row.status == "error" else None)
