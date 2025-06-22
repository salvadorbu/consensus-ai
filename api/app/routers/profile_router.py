"""FastAPI router exposing CRUD endpoints for user **ConsensusProfile** templates."""
from __future__ import annotations

import logging
import uuid
from typing import List, Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, delete, update
from sqlalchemy.ext.asyncio import AsyncSession

from ..db import get_session
from ..models.consensus_profile import ConsensusProfile
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
    session: AsyncSession = Depends(get_session),
):
    profile = ConsensusProfile(user_id=current_user.id, **profile_in.model_dump())
    session.add(profile)
    await session.commit()
    await session.refresh(profile)
    return ConsensusProfileRead.model_validate(profile)


@router.get("", response_model=List[ConsensusProfileRead])
async def list_profiles(
    current_user: Annotated[UserOut, Depends(get_current_user)],
    session: AsyncSession = Depends(get_session),
):
    result = await session.execute(
        select(ConsensusProfile).where(ConsensusProfile.user_id == current_user.id).order_by(ConsensusProfile.created_at.desc())
    )
    profiles = result.scalars().all()
    return [ConsensusProfileRead.model_validate(p) for p in profiles]


@router.get("/{profile_id}", response_model=ConsensusProfileRead)
async def get_profile(
    profile_id: uuid.UUID,
    current_user: Annotated[UserOut, Depends(get_current_user)],
    session: AsyncSession = Depends(get_session),
):
    profile = await session.get(ConsensusProfile, profile_id)
    if profile is None or profile.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Profile not found")
    return ConsensusProfileRead.model_validate(profile)


@router.patch("/{profile_id}", response_model=ConsensusProfileRead)
async def update_profile(
    profile_id: uuid.UUID,
    profile_in: ConsensusProfileUpdate,
    current_user: Annotated[UserOut, Depends(get_current_user)],
    session: AsyncSession = Depends(get_session),
):
    stmt = (
        update(ConsensusProfile)
        .where(ConsensusProfile.id == profile_id, ConsensusProfile.user_id == current_user.id)
        .values(**{k: v for k, v in profile_in.model_dump(exclude_none=True).items()})
        .returning(ConsensusProfile)
    )
    result = await session.execute(stmt)
    profile = result.scalar_one_or_none()
    if profile is None:
        raise HTTPException(status_code=404, detail="Profile not found")
    await session.commit()
    return ConsensusProfileRead.model_validate(profile)


@router.delete("/{profile_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_profile(
    profile_id: uuid.UUID,
    current_user: Annotated[UserOut, Depends(get_current_user)],
    session: AsyncSession = Depends(get_session),
):
    result = await session.execute(
        delete(ConsensusProfile).where(
            ConsensusProfile.id == profile_id, ConsensusProfile.user_id == current_user.id
        )
    )
    if result.rowcount == 0:
        raise HTTPException(status_code=404, detail="Profile not found")
    await session.commit()
