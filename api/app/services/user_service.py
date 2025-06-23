"""Service layer for user CRUD operations."""
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.services.auth_service import get_password_hash


async def get_user_by_email(session: AsyncSession, email: str) -> User | None:
    """Return the first user matching *email* or ``None`` if not found."""
    result = await session.execute(select(User).where(User.email == email))
    return result.scalar_one_or_none()


async def create_user(session: AsyncSession, email: str, password: str) -> User:
    """Create and persist a new user with *email* + *password* (hashed)."""

    db_user = User(email=email, hashed_password=get_password_hash(password))
    session.add(db_user)
    await session.commit()
    await session.refresh(db_user)
    return db_user


async def delete_user(session: AsyncSession, user: User) -> None:
    """Delete *user* and commit transaction."""
    await session.delete(user)
    await session.commit()
