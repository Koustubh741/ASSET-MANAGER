import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
from app.models.models import Base

DATABASE_URL = "postgresql+asyncpg://postgres:Koustubh%40123@127.0.0.1:5432/ITSM"

async def create_tables():
    engine = create_async_engine(DATABASE_URL)
    async with engine.begin() as conn:
        print("Synchronizing database schema...")
        # Create schema if not exists
        await conn.execute(text("CREATE SCHEMA IF NOT EXISTS system;"))
        await conn.execute(text("CREATE SCHEMA IF NOT EXISTS asset;"))
        await conn.execute(text("CREATE SCHEMA IF NOT EXISTS auth;"))
        
        # Create all tables
        await conn.run_sync(Base.metadata.create_all)
        print("Schema synchronization complete.")

if __name__ == "__main__":
    asyncio.run(create_tables())
