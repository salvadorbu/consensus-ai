import asyncio
from app.db import engine, Base
from app.models.chat import Chat
from app.models.message import Message
from app.models.consensus_channel import ConsensusChannel
from app.models.user import User

import asyncio
import logging

logger = logging.getLogger(__name__)

async def create_all(max_retries: int = 10, delay: int = 2):
    """Attempt to connect and create tables, retrying if the DB isn't ready yet."""
    attempt = 0
    while True:
        try:
            async with engine.begin() as conn:
                await conn.run_sync(Base.metadata.create_all)
            logger.info("Database tables created successfully")
            break
        except Exception as exc:  # broad catch as DB may not be ready
            attempt += 1
            if attempt > max_retries:
                logger.error("Exceeded max DB connection retries")
                raise
            logger.warning("DB not ready (attempt %s/%s): %s", attempt, max_retries, exc)
            await asyncio.sleep(delay)

if __name__ == "__main__":
    asyncio.run(create_all())
