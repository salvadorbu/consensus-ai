"""Package exposing individual FastAPI routers for the service."""

from fastapi import FastAPI

from .chat_router import router as chat_router
from .channel_router import router as channel_router
from .user_router import router as user_router
from .profile_router import router as profile_router
from .model_router import router as model_router

__all__ = [
    "chat_router",
    "channel_router",
    "user_router",
    "profile_router",
    "model_router",
]


def init_app(app: "FastAPI") -> None:
    """Register all routers with the given FastAPI *app*."""
    app.include_router(chat_router)
    app.include_router(channel_router)
    app.include_router(user_router)
    app.include_router(profile_router)
    app.include_router(model_router)
