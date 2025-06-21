"""FastAPI router exposing user registration & login endpoints."""
from __future__ import annotations

import logging
from datetime import timedelta
from typing import Annotated, List

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_session
from app.schemas.user import UserCreate, UserLogin, UserOut, Token
from app.services import auth_service, user_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/users", tags=["users"])

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/users/login")


# ---------------------------------------------------------------------------
# Dependencies
# ---------------------------------------------------------------------------


async def get_current_user(
    token: Annotated[str, Depends(oauth2_scheme)],
    session: AsyncSession = Depends(get_session),
) -> UserOut:
    """Decode *token* and return the associated user (or raise 401)."""
    try:
        payload = auth_service.parse_token(token)
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid credentials") from None

    user = await session.get(user_service.User, payload.sub)
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
    return UserOut.model_validate(user)


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------


@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
async def register(user_in: UserCreate, session: AsyncSession = Depends(get_session)):
    """Register a new user account."""
    existing = await user_service.get_user_by_email(session, user_in.email)
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    user = await user_service.create_user(session, user_in.email, user_in.password)
    return UserOut.model_validate(user)


@router.post("/login", response_model=Token)
async def login(form_data: Annotated[OAuth2PasswordRequestForm, Depends()], session: AsyncSession = Depends(get_session)):
    """Authenticate user and return a JWT access token."""
    user = await user_service.get_user_by_email(session, form_data.username)
    if user is None or not auth_service.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Incorrect email or password")

    access_token_expires = timedelta(minutes=auth_service.ACCESS_TOKEN_EXPIRE_MINUTES)
    token = auth_service.create_access_token(user.id, access_token_expires)
    return Token(access_token=token, token_type="bearer", expires_in=int(access_token_expires.total_seconds()))


@router.get("/me", response_model=UserOut)
async def read_current_user(current_user: Annotated[UserOut, Depends(get_current_user)]):
    """Return the authenticated user's profile."""
    return current_user
