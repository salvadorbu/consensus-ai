"""FastAPI router exposing CRUD endpoints for user **ConsensusProfile** templates."""
from __future__ import annotations

import logging
import uuid
from typing import List, Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from supabase import Client as SupabaseClient

from ..db.supabase_client import get_supabase_client
from ..services import consensus_profile_service as profile_service
from ..schemas.consensus_profile import (
    ConsensusProfileCreate,
    ConsensusProfileRead,
    ConsensusProfileUpdate,
)
from .user_router import get_current_user
from ..schemas.user import UserOut

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/profiles", tags=["profiles"])

# ---------------------------------------------------------------------------
# Profile CRUD – always scoped to the authenticated user
# ---------------------------------------------------------------------------


@router.post("", response_model=ConsensusProfileRead, status_code=status.HTTP_201_CREATED)
async def create_profile(
    profile_in: ConsensusProfileCreate,
    current_user: Annotated[UserOut, Depends(get_current_user)],
    client: SupabaseClient = Depends(get_supabase_client),
):
    row = await profile_service.create_profile(client, current_user.id, profile_in.model_dump())
    return ConsensusProfileRead.model_validate(row)


@router.get("", response_model=List[ConsensusProfileRead])
async def list_profiles(
    current_user: Annotated[UserOut, Depends(get_current_user)],
    client: SupabaseClient = Depends(get_supabase_client),
):
    rows = await profile_service.list_profiles(client, current_user.id)
    return [ConsensusProfileRead.model_validate(r) for r in rows]


@router.get("/{profile_id}", response_model=ConsensusProfileRead)
async def get_profile(
    profile_id: uuid.UUID,
    current_user: Annotated[UserOut, Depends(get_current_user)],
    client: SupabaseClient = Depends(get_supabase_client),
):
    row = await profile_service.get_profile(client, profile_id, current_user.id)
    if row is None:
        raise HTTPException(status_code=404, detail="Profile not found")
    return ConsensusProfileRead.model_validate(row)


@router.patch("/{profile_id}", response_model=ConsensusProfileRead)
async def update_profile(
    profile_id: uuid.UUID,
    profile_in: ConsensusProfileUpdate,
    current_user: Annotated[UserOut, Depends(get_current_user)],
    client: SupabaseClient = Depends(get_supabase_client),
):
    updates = {k: v for k, v in profile_in.model_dump(exclude_none=True).items()}
    row = await profile_service.update_profile(client, profile_id, current_user.id, updates)
    if row is None:
        raise HTTPException(status_code=404, detail="Profile not found")
    return ConsensusProfileRead.model_validate(row)


@router.delete("/{profile_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_profile(
    profile_id: uuid.UUID,
    current_user: Annotated[UserOut, Depends(get_current_user)],
    client: SupabaseClient = Depends(get_supabase_client),
):
    deleted = await profile_service.delete_profile(client, profile_id, current_user.id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Profile not found")
