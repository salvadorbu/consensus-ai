"""FastAPI router exposing user registration & login endpoints."""
from __future__ import annotations

import logging
from datetime import timedelta
from uuid import UUID
from typing import Annotated, List

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from supabase import Client as SupabaseClient

from app.db.supabase_client import get_supabase_client
from app.schemas.user import UserCreate, UserLogin, UserOut, Token
from app.services import auth_service
from app.services import user_service as user_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/users", tags=["users"])

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/users/login")


# ---------------------------------------------------------------------------
# Dependencies
# ---------------------------------------------------------------------------


async def get_current_user(
    token: Annotated[str, Depends(oauth2_scheme)],
    client: SupabaseClient = Depends(get_supabase_client),
) -> UserOut:
    """Decode *token* and return the associated user (or raise 401)."""
    try:
        payload = auth_service.parse_token(token)
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid credentials") from None

    user = await user_service.get_user_by_id(client, payload.sub)
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
    return UserOut.model_validate(user)


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------


@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
async def register(user_in: UserCreate, client: SupabaseClient = Depends(get_supabase_client)):
    """Register a new user account."""
    existing = await user_service.get_user_by_email(client, user_in.email)
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    user = await user_service.create_user(client, user_in.email, user_in.password)
    return UserOut.model_validate(user)


@router.post("/login", response_model=Token)
async def login(form_data: Annotated[OAuth2PasswordRequestForm, Depends()], client: SupabaseClient = Depends(get_supabase_client)):
    """Authenticate user and return a JWT access token."""
    user = await user_service.get_user_by_email(client, form_data.username)
    # Supabase returns a plain dict; extract hashed password safely
    hashed_pw = user.get("hashed_password") if user else None
    if user is None or hashed_pw is None or not auth_service.verify_password(form_data.password, hashed_pw):
        raise HTTPException(status_code=401, detail="Incorrect email or password")

    access_token_expires = timedelta(minutes=auth_service.ACCESS_TOKEN_EXPIRE_MINUTES)
    token = auth_service.create_access_token(UUID(user["id"]), access_token_expires)
    return Token(access_token=token, token_type="bearer", expires_in=int(access_token_expires.total_seconds()))


@router.get("/me", response_model=UserOut)
async def read_current_user(current_user: Annotated[UserOut, Depends(get_current_user)]):
    """Return the authenticated user's profile."""
    return current_user


@router.delete("/me", status_code=status.HTTP_204_NO_CONTENT)
async def delete_current_user(
    current_user: Annotated[UserOut, Depends(get_current_user)],
    client: SupabaseClient = Depends(get_supabase_client),
):
    """Delete the authenticated user's account and related data."""
    # Fetch ORM instance
    db_user = current_user  # Supabase already returned Pydantic obj
    if db_user is None:
        raise HTTPException(status_code=404, detail="User not found")
    await user_service.delete_user(client, current_user.id)
    return None
