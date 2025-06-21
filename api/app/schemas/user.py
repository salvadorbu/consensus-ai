"""Pydantic schemas for User authentication endpoints."""
from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field, ConfigDict


class UserBase(BaseModel):
    email: EmailStr = Field(..., examples=["user@example.com"])


class UserCreate(UserBase):
    password: str = Field(..., min_length=8, examples=["strongpassword123"])


class UserLogin(UserBase):
    password: str = Field(..., min_length=8)


class UserOut(UserBase):
    id: UUID
    created_at: datetime
    updated_at: datetime

    # Enable loading from ORM objects in Pydantic v2
    model_config = ConfigDict(from_attributes=True)


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int  # seconds


class TokenPayload(BaseModel):
    sub: UUID
    exp: int
