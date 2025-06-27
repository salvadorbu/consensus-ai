"""Service for fetching and caching model metadata from OpenRouter.

This service lazily downloads the list of available models from
https://openrouter.ai/api/v1/models and caches the response in memory for a
configurable period of time (default: 6 hours). The cached data is then served
by the API router with optional client-side filtering (search and pagination).
"""
from __future__ import annotations

import time
from typing import Any, List

import httpx

# Public URL that returns all available models in ~400 kB JSON.
_OPENROUTER_MODELS_URL = "https://openrouter.ai/api/v1/models"

# Refresh interval for the cached models list (seconds). Six hours ~= 21 600 s.
_REFRESH_SECONDS = 60 * 60 * 6  # 6 h

# ---------------------------------------------------------------------------
# In-memory cache representation
# ---------------------------------------------------------------------------

_cached_models: List[dict[str, Any]] = []
_last_refresh_ts: float = 0.0


async def _download_models() -> List[dict[str, Any]]:
    """Download the models list from OpenRouter and return the JSON payload."""
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.get(_OPENROUTER_MODELS_URL)
        resp.raise_for_status()
        raw = resp.json()
        # The OpenRouter API may evolve; handle dict payloads gracefully.
        if isinstance(raw, dict):
            # Common pattern {"data": [...]} or {<id>: {...}}
            if "data" in raw and isinstance(raw["data"], list):
                raw = raw["data"]
            else:
                raw = list(raw.values())
        data: List[dict[str, Any]] = raw  # type: ignore
        return data


async def get_models(force_refresh: bool = False) -> List[dict[str, Any]]:
    """Return the cached models list, refreshing it if stale.

    Args:
        force_refresh: If *True*, always download the latest list regardless
            of cache age.
    """
    global _cached_models, _last_refresh_ts

    # Decide if we need to re-download the models list.
    need_refresh = (
        force_refresh
        or not _cached_models
        or (time.time() - _last_refresh_ts) > _REFRESH_SECONDS
    )

    if need_refresh:
        _cached_models = await _download_models()
        _last_refresh_ts = time.time()

    return _cached_models


# Convenience synchronous wrapper ------------------------------------------------

def get_models_sync(force_refresh: bool = False) -> List[dict[str, Any]]:  # pragma: no cover
    """Blocking wrapper around *get_models* for non-async contexts (e.g. tests)."""
    import anyio  # imported lazily to avoid mandatory dependency

    return anyio.run(get_models, force_refresh)
