from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from ..db import get_session
from ..models.consensus_channel import ConsensusChannel
from ..models.chat import Chat
from ..services.consensus_service import spawn_channel, get_channel_status

router = APIRouter(prefix="/channels", tags=["channels"])


class CreateChannelRequest(BaseModel):
    task: str
    guiding_model: str
    participant_models: List[str]
    max_rounds: int = 8
    chat_id: Optional[UUID] = None


class ChannelStatusResponse(BaseModel):
    status: str
    rounds_executed: int
    answer: str | None = None
    error: str | None = None


@router.post("/", response_model=dict)
async def create_channel(
    req: CreateChannelRequest, session: AsyncSession = Depends(get_session)
):
    if req.chat_id and await session.get(Chat, req.chat_id) is None:
        raise HTTPException(status_code=404, detail="Chat not found")

    channel_id = await spawn_channel(
        task=req.task,
        guiding_model=req.guiding_model,
        participant_models=req.participant_models,
        max_rounds=req.max_rounds,
        chat_id=req.chat_id,
        session=session,
    )
    return {"channel_id": channel_id}


@router.get("/{channel_id}", response_model=ChannelStatusResponse)
async def get_channel_status_endpoint(
    channel_id: str, session: AsyncSession = Depends(get_session)
):
    cache = get_channel_status(channel_id)
    if cache and cache["status"] != "pending":
        return ChannelStatusResponse(
            status=cache["status"],
            rounds_executed=cache.get("rounds_executed", 0),
            answer=cache.get("answer"),
            error=cache.get("error"),
        )

    row = await session.get(ConsensusChannel, channel_id)
    if row is None:
        raise HTTPException(status_code=404, detail="Channel not found")

    return ChannelStatusResponse(
        status=row.status,
        rounds_executed=row.rounds_executed or 0,
        answer=row.answer,
        error=row.answer if row.status == "error" else None,
    )