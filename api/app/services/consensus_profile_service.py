"""Supabase-backed CRUD helpers for **ConsensusProfile** rows."""
from __future__ import annotations

import asyncio
import uuid
from typing import Any, Dict, List

from supabase import Client as SupabaseClient

_TABLE = "consensus_profiles"

# ---------------------------------------------------------------------------
# Helper wrappers that run synchronous SDK methods off the event loop thread.
# ---------------------------------------------------------------------------

def _insert(client: SupabaseClient, payload: Dict[str, Any]) -> Dict[str, Any]:
    resp = client.table(_TABLE).insert(payload).execute()
    return resp.data[0] if resp.data else None


def _select_by_user(client: SupabaseClient, user_id: uuid.UUID) -> List[Dict[str, Any]]:
    resp = (
        client.table(_TABLE)
        .select("*")
        .eq("user_id", str(user_id))
        .order("created_at", desc=True)
        .execute()
    )
    return resp.data or []


def _select_one(client: SupabaseClient, profile_id: uuid.UUID, user_id: uuid.UUID) -> Dict[str, Any] | None:
    resp = (
        client.table(_TABLE)
        .select("*")
        .eq("id", str(profile_id))
        .eq("user_id", str(user_id))
        .limit(1)
        .execute()
    )
    return resp.data[0] if resp.data else None


def _update(client: SupabaseClient, profile_id: uuid.UUID, user_id: uuid.UUID, updates: Dict[str, Any]) -> Dict[str, Any] | None:
    resp = (
        client.table(_TABLE)
        .update(updates)
        .eq("id", str(profile_id))
        .eq("user_id", str(user_id))
        .execute()
    )
    return resp.data[0] if resp.data else None


def _delete(client: SupabaseClient, profile_id: uuid.UUID, user_id: uuid.UUID) -> int:
    resp = (
        client.table(_TABLE)
        .delete()
        .eq("id", str(profile_id))
        .eq("user_id", str(user_id))
        .execute()
    )
    return resp.count or 0

# ---------------------------------------------------------------------------
# Public async API
# ---------------------------------------------------------------------------

async def create_profile(client: SupabaseClient, user_id: uuid.UUID, data: Dict[str, Any]):
    payload = {"user_id": str(user_id), **data}
    return await asyncio.to_thread(_insert, client, payload)


async def list_profiles(client: SupabaseClient, user_id: uuid.UUID):
    return await asyncio.to_thread(_select_by_user, client, user_id)


async def get_profile(client: SupabaseClient, profile_id: uuid.UUID, user_id: uuid.UUID):
    return await asyncio.to_thread(_select_one, client, profile_id, user_id)


async def update_profile(client: SupabaseClient, profile_id: uuid.UUID, user_id: uuid.UUID, updates: Dict[str, Any]):
    return await asyncio.to_thread(_update, client, profile_id, user_id, updates)


async def delete_profile(client: SupabaseClient, profile_id: uuid.UUID, user_id: uuid.UUID) -> bool:
    deleted = await asyncio.to_thread(_delete, client, profile_id, user_id)
    return deleted > 0
