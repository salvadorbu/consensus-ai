"""Supabase-backed CRUD helpers for **Chat** and **Message** tables.

Only chat-level operations are implemented for now; message helpers will be
added in a later pass when we refactor the message endpoints in *chat_router*.
"""
from __future__ import annotations

import asyncio
import uuid
from typing import Any, Dict, List

from supabase import Client as SupabaseClient

CHAT_TABLE = "chats"

# ---------------------------------------------------------------------------
# Low-level wrappers (blocking SDK) – executed in background threads
# ---------------------------------------------------------------------------

def _insert_chat(client: SupabaseClient, payload: Dict[str, Any]) -> Dict[str, Any]:
    resp = client.table(CHAT_TABLE).insert(payload).execute()
    return resp.data[0] if resp.data else None


def _select_chats_by_user(client: SupabaseClient, user_id: uuid.UUID) -> List[Dict[str, Any]]:
    resp = (
        client.table(CHAT_TABLE)
        .select("*")
        .eq("user_id", str(user_id))
        .order("created_at", desc=True)
        .execute()
    )
    return resp.data or []


def _select_chat(client: SupabaseClient, chat_id: uuid.UUID) -> Dict[str, Any] | None:
    resp = client.table(CHAT_TABLE).select("*").eq("id", str(chat_id)).limit(1).execute()
    return resp.data[0] if resp.data else None


def _update_chat(client: SupabaseClient, chat_id: uuid.UUID, user_id: uuid.UUID, updates: Dict[str, Any]) -> Dict[str, Any] | None:
    resp = (
        client.table(CHAT_TABLE)
        .update(updates)
        .eq("id", str(chat_id))
        .eq("user_id", str(user_id))
        .execute()
    )
    return resp.data[0] if resp.data else None


def _delete_chat(client: SupabaseClient, chat_id: uuid.UUID, user_id: uuid.UUID) -> int:
    resp = (
        client.table(CHAT_TABLE)
        .delete()
        .eq("id", str(chat_id))
        .eq("user_id", str(user_id))
        .execute()
    )
    return resp.count or 0

# ---------------------------------------------------------------------------
# Public async helpers
# ---------------------------------------------------------------------------

async def create_chat(client: SupabaseClient, user_id: uuid.UUID, data: Dict[str, Any]):
    payload = {"user_id": str(user_id), **data}
    return await asyncio.to_thread(_insert_chat, client, payload)


async def list_chats(client: SupabaseClient, user_id: uuid.UUID):
    return await asyncio.to_thread(_select_chats_by_user, client, user_id)


async def get_chat(client: SupabaseClient, chat_id: uuid.UUID):
    return await asyncio.to_thread(_select_chat, client, chat_id)


async def update_chat(client: SupabaseClient, chat_id: uuid.UUID, user_id: uuid.UUID, updates: Dict[str, Any]):
    return await asyncio.to_thread(_update_chat, client, chat_id, user_id, updates)


async def delete_chat(client: SupabaseClient, chat_id: uuid.UUID, user_id: uuid.UUID) -> bool:
    deleted = await asyncio.to_thread(_delete_chat, client, chat_id, user_id)
    return deleted > 0
