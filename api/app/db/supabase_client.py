"""Supabase client setup and dependency helpers.

This module centralises the creation of a shared Supabase client instance and
exposes FastAPI dependencies that can be injected into routes and services.

We keep the helper thin so that business-logic and data-access code can focus
on PostgREST calls rather than connection details.
"""
from __future__ import annotations

import os
from functools import lru_cache
from typing import Generator

from fastapi import Depends
from supabase import create_client, Client as SupabaseClient

__all__ = [
    "get_supabase_client",
    "SupabaseClient",
]


@lru_cache(maxsize=1)
def _init_client() -> SupabaseClient:
    """Initialise and cache a singleton Supabase client.

    The URL and service role / anon key are loaded from the environment. If they
    are missing we raise early so that the application fails fast instead of
    performing API calls with an invalid configuration.
    """

    url: str | None = os.getenv("SUPABASE_URL")
    key: str | None = os.getenv("SUPABASE_KEY")  # service or anon key

    if not url or not key:
        raise RuntimeError(
            "Missing Supabase credentials: ensure SUPABASE_URL and SUPABASE_KEY are set."
        )

    return create_client(url, key)


def get_supabase_client() -> Generator[SupabaseClient, None, None]:
    """FastAPI dependency that yields the singleton Supabase client."""
    client = _init_client()
    yield client
