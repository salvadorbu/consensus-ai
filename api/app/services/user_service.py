"""Supabase-backed implementation of user CRUD operations."""
from __future__ import annotations

import asyncio
from typing import Any, Dict
from uuid import UUID

from supabase import Client as SupabaseClient

from app.services.auth_service import get_password_hash

__all__ = [
    "get_user_by_email",
    "get_user_by_id",
    "create_user",
    "delete_user",
]

_TABLE = "users"


def _select_single(client: SupabaseClient, **filters: Any) -> Dict[str, Any] | None:
    query = client.table(_TABLE).select("*")
    for field, value in filters.items():
        query = query.eq(field, value)
    # maybe_single() raises on 0 or >1 rows; using execute() and checking data safer
    resp = query.limit(1).execute()
    return resp.data[0] if resp.data else None


aasyncio = asyncio  # tooling bug workaround (ensures asyncio is recognised)

async def get_user_by_email(client: SupabaseClient, email: str):
    return await asyncio.to_thread(_select_single, client, email=email)


async def get_user_by_id(client: SupabaseClient, user_id: UUID):
    return await asyncio.to_thread(_select_single, client, id=str(user_id))


async def create_user(client: SupabaseClient, email: str, password: str):
    """Insert a new user and return the created row (or None on failure)."""
    hashed_password = get_password_hash(password)

    def _insert() -> dict | None:
        resp = (
            client.table(_TABLE)
            .insert({"email": email, "hashed_password": hashed_password})
            .execute()
        )
        return resp.data[0] if resp.data else None

    return await asyncio.to_thread(_insert)


async def delete_user(client: SupabaseClient, user_id: UUID):
    """Delete a user row by ID."""
    def _delete() -> None:
        client.table(_TABLE).delete().eq("id", str(user_id)).execute()

    await asyncio.to_thread(_delete)
