import asyncio
from app.db import engine, Base
from app.models.chat import Chat
from app.models.message import Message

async def create_all():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

if __name__ == "__main__":
    asyncio.run(create_all())
