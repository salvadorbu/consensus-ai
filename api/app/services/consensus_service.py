"""Supabase-backed version of *consensus_service*.

Differs from the original only in the persistence layer: instead of SQLAlchemy we
write to Supabase tables via the REST client. The in-memory execution & caching
logic remains identical.
"""
from __future__ import annotations

import asyncio
import uuid
from concurrent.futures import ThreadPoolExecutor
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone

from supabase import Client as SupabaseClient

from app.channel import Channel, ChannelConfig
from app.agent import Agent

# ---------------------------------------------------------------------------
# In-memory caches (per process)
# ---------------------------------------------------------------------------

_channels: Dict[str, Channel] = {}
_channel_status: Dict[str, Dict[str, Any]] = {}
_executor: ThreadPoolExecutor = ThreadPoolExecutor(max_workers=4)

_TABLE = "consensus_channels"
_MESSAGES_TABLE = "messages"

# ---------------------------------------------------------------------------
# Persistence helpers
# ---------------------------------------------------------------------------


def _insert_row(client: SupabaseClient, payload: dict[str, Any]) -> None:
    client.table(_TABLE).insert(payload).execute()


def _update_row(client: SupabaseClient, channel_id: str, payload: dict[str, Any]) -> None:
    client.table(_TABLE).update(payload).eq("id", channel_id).execute()


def _select_row(client: SupabaseClient, channel_id: str) -> dict[str, Any] | None:
    resp = client.table(_TABLE).select("*").eq("id", channel_id).limit(1).execute()
    return resp.data[0] if resp.data else None

# ---------------------------------------------------------------------------
# Internal helpers (called from background thread)
# ---------------------------------------------------------------------------

def _run_channel(client: SupabaseClient, channel_id: str, chat_id: Optional[uuid.UUID], loop: asyncio.AbstractEventLoop) -> None:  # noqa: D401
    """Blocking execution of *Channel.run()* inside ThreadPool."""
    channel = _channels[channel_id]
    _channel_status[channel_id]["status"] = "running"
    try:
        answer = channel.run()
        log_payload = {agent.model: history for agent, history in channel._history.items()}
        _channel_status[channel_id].update(
            {
                "id": channel_id,
                "created_at": _channel_status[channel_id]["created_at"],
                "status": "finished",
                "rounds_executed": channel.rounds_executed,
                "answer": answer,
            }
        )
        # Persist channel row async
        loop.call_soon_threadsafe(
            _update_row,
            client,
            channel_id,
            {
                "status": "finished",
                "rounds_executed": channel.rounds_executed,
                "answer": answer,
                "log": log_payload,
                "finished_at": "now()",  # postgres function evaluated server-side
            },
        )
        # Schedule placeholder update on the main event-loop to avoid sharing the
        # Supabase client between threads (httpx connection issues).
        from app.services import message_service  # local import to avoid circular
        loop.call_soon_threadsafe(
            asyncio.create_task,
            message_service.fill_assistant_placeholder(client, channel_id, answer),
        )
    except Exception as exc:  # pylint: disable=broad-except
        _channel_status[channel_id].update({"status": "error", "error": str(exc)})
        loop.call_soon_threadsafe(_update_row, client, channel_id, {
            "status": "error",
            "answer": str(exc),
        })

# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

async def spawn_channel(
    *,
    client: SupabaseClient,
    task: str,
    guiding_model: str,
    participant_models: List[str],
    max_rounds: int = 8,
    chat_id: uuid.UUID | None = None,
) -> str:
    """Insert DB row, launch background discussion, return *channel_id*."""

    channel_id = str(uuid.uuid4())

    # Build Channel object
    guiding_agent = Agent(guiding_model)
    participant_agents = [Agent(m) for m in participant_models]
    config = ChannelConfig(max_rounds=max_rounds)
    channel = Channel(task, guiding_agent, participant_agents, config)

    # Persist row synchronously in thread pool to avoid blocking event loop
    await asyncio.to_thread(
        _insert_row,
        client,
        {
            "id": channel_id,
            "task": task,
            "guiding_model": guiding_model,
            "participant_models": participant_models,
            "max_rounds": max_rounds,
            "status": "pending",
            "chat_id": str(chat_id) if chat_id else None,
        },
    )

    # Track in memory and launch background thread
    _channels[channel_id] = channel
    _channel_status[channel_id] = {
        "id": channel_id,
        "status": "pending",
        "rounds_executed": 0,
        "answer": None,
        "chat_id": chat_id,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }

    loop = asyncio.get_event_loop()
    loop.run_in_executor(_executor, _run_channel, client, channel_id, chat_id, loop)

    return channel_id


async def get_channel_status(client: SupabaseClient, channel_id: str) -> Dict[str, Any] | None:
    """Return cached status or fetch from Supabase."""
    cache = _channel_status.get(channel_id)
    if cache and cache.get("status") != "pending":
        return cache

    row = await asyncio.to_thread(_select_row, client, channel_id)
    return row
