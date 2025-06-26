"""Supabase helper functions for Message table interactions."""
from __future__ import annotations

import asyncio
import uuid
from typing import Any, Dict, List

from supabase import Client as SupabaseClient

_TABLE = "messages"

# ---------------------------------------------------------------------------
# Blocking helpers (run in threadpool)
# ---------------------------------------------------------------------------

def _insert(client: SupabaseClient, payload: Dict[str, Any]) -> Dict[str, Any]:
    resp = client.table(_TABLE).insert(payload).execute()
    return resp.data[0] if resp.data else None


def _select_by_chat(client: SupabaseClient, chat_id: uuid.UUID) -> List[Dict[str, Any]]:
    resp = (
        client.table(_TABLE)
        .select("*")
        .eq("chat_id", str(chat_id))
        .order("created_at", desc=False)
        .execute()
    )
    return resp.data or []

# ---------------------------------------------------------------------------
# Public async API
# ---------------------------------------------------------------------------


def _update_by_channel(client: SupabaseClient, channel_id: str, content: str) -> Dict[str, Any] | None:
    """Update the *content* of the assistant placeholder linked to *channel_id*.

    We only ever expect a single placeholder message for a given channel so the
    UPDATE should affect at most one row. We return the updated row (or *None*
    if no placeholder was found).
    """
    resp = (
        client.table(_TABLE)
        .update({"content": content})
        .eq("channel_id", channel_id)
        .execute()
    )
    return resp.data[0] if resp.data else None


async def fill_assistant_placeholder(
    client: SupabaseClient,
    channel_id: str,
    content: str,
):
    """Replace the empty placeholder content with the final *answer*."""
    return await asyncio.to_thread(_update_by_channel, client, channel_id, content)

async def create_user_message(client: SupabaseClient, chat_id: uuid.UUID, content: str):
    payload = {
        "chat_id": str(chat_id),
        "role": "user",
        "model": "user",
        "generation_mode": "direct",
        "content": content,
    }
    return await asyncio.to_thread(_insert, client, payload)


async def create_assistant_placeholder(client: SupabaseClient, chat_id: uuid.UUID, channel_id: str):
    payload = {
        "chat_id": str(chat_id),
        "role": "assistant",
        "model": "consensus",
        "generation_mode": "consensus",
        "channel_id": channel_id,
        "content": "",
    }
    return await asyncio.to_thread(_insert, client, payload)


async def create_assistant_message(client: SupabaseClient, chat_id: uuid.UUID, model: str, content: str):
    payload = {
        "chat_id": str(chat_id),
        "role": "assistant",
        "model": model,
        "generation_mode": "direct",
        "content": content,
    }
    return await asyncio.to_thread(_insert, client, payload)


async def list_messages(client: SupabaseClient, chat_id: uuid.UUID):
    return await asyncio.to_thread(_select_by_chat, client, chat_id)
