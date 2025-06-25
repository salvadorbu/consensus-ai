"""Database setup with asynchronous SQLAlchemy engine and session factory."""

import os
from typing import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import declarative_base, DeclarativeMeta
from sqlalchemy.schema import MetaData

# -----------------------------------------------------------------------------
# Configuration
# -----------------------------------------------------------------------------

# Example:
#   postgresql+asyncpg://user:password@hostname:port/database
DATABASE_URL = os.getenv(
    "DATABASE_URL", "postgresql+asyncpg://postgres:postgres@localhost:5432/consensus_db"
)

# Naming convention recommended by Alembic to avoid issues when autogenerating
# migrations. Even if we do not yet provide Alembic migrations, having the
# convention in place means future integration will be smooth.
NAMING_CONVENTION = {
    "ix": "ix_%(column_0_label)s",
    "uq": "uq_%(table_name)s_%(column_0_name)s",
    "ck": "ck_%(table_name)s_%(constraint_name)s",
    "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",
    "pk": "pk_%(table_name)s",
}

metadata_obj = MetaData(naming_convention=NAMING_CONVENTION)

Base: DeclarativeMeta = declarative_base(metadata=metadata_obj)

# Create async engine & session factory
engine = create_async_engine(
    DATABASE_URL,
    connect_args={"ssl": "require"},
    future=True,
    echo=False,
)
async_session_factory = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)


async def get_session() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI dependency that yields a database session and ensures cleanup."""
    async with async_session_factory() as session:
        yield session
