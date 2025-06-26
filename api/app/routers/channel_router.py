from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, Field
from supabase import Client as SupabaseClient

from ..db.supabase_client import get_supabase_client
# models module no longer used
#
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
    req: CreateChannelRequest, client: SupabaseClient = Depends(get_supabase_client)
):
    # TODO: optionally verify chat existence via Supabase

    channel_id = await spawn_channel(client=client,
        task=req.task,
        guiding_model=req.guiding_model,
        participant_models=req.participant_models,
        max_rounds=req.max_rounds,
        chat_id=req.chat_id,
        #
    )
    return {"channel_id": channel_id}


@router.get("/{channel_id}", response_model=ChannelStatusResponse)
async def get_channel_status_endpoint(
    channel_id: str, client: SupabaseClient = Depends(get_supabase_client)
):
    cache = await get_channel_status(client, channel_id)
    if cache and cache["status"] != "pending":
        return ChannelStatusResponse(
            status=cache["status"],
            rounds_executed=cache.get("rounds_executed", 0),
            answer=cache.get("answer"),
            error=cache.get("error"),
        )

    if cache is None:
        raise HTTPException(status_code=404, detail="Channel not found")
    return ChannelStatusResponse(**cache)
