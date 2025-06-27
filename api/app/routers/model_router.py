"""API router exposing the `/models` endpoint.

Supports:
- Pagination via `page` (1-indexed) and `limit` query parameters (default: 20).
- Case-insensitive substring search via the `q` query parameter.
- Optional `force_refresh` (bool) parameter for admins/tests to bypass the
  cache. **Not intended for production clients.**
"""
from __future__ import annotations

from typing import Any, List

from fastapi import APIRouter, Depends, HTTPException, Query, status

from ..services.model_service import get_models

router = APIRouter(prefix="/models", tags=["models"])


class PaginatedModelsResponse(dict):
    """Typed response helper returned by the `/models` endpoint."""


@router.get("/", response_model=Any, status_code=status.HTTP_200_OK)
async def list_models(
    page: int = Query(1, ge=1, description="Page number (1-indexed)"),
    limit: int = Query(20, ge=1, le=100, description="Number of models per page"),
    q: str | None = Query(None, description="Case-insensitive substring search"),
    force_refresh: bool = Query(False, description="Bypass cache – for admins/testing"),
) -> dict[str, Any]:
    """Return a paginated list of models with optional search."""

    # Retrieve (and maybe refresh) the cached models list.
    models_raw: Any = await get_models(force_refresh=force_refresh)
    # Safety: ensure *models* is a list even if service returns a dict
    models: List[dict[str, Any]] = (
        list(models_raw.values()) if isinstance(models_raw, dict) else list(models_raw)
    )

    # Apply search filter if provided.
    if q:
        needle = q.lower()
        models = [m for m in models if needle in str(m.get("id", "")).lower() or needle in str(m.get("name", "")).lower()]

    total = len(models)

    # Pagination calculation.
    start = (page - 1) * limit
    end = start + limit

    if start >= total:
        raise HTTPException(status_code=404, detail="Page out of range")

    results = models[start:end]

    return {
        "total": total,
        "page": page,
        "page_size": limit,
        "default_model": models[0] if models else None,
        "results": results,
    }
