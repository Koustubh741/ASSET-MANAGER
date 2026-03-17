import os
from dotenv import load_dotenv
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker

load_dotenv()
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy import create_engine
from typing import AsyncGenerator
from contextlib import asynccontextmanager

# DATABASE_URL configuration
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+asyncpg://postgres:postgres@localhost:5432/itsm")
SYNC_DATABASE_URL = DATABASE_URL.replace("postgresql+asyncpg://", "postgresql://")

# 1. Asynchronous Configuration (for FastAPI)
async_engine = create_async_engine(DATABASE_URL, echo=False)
AsyncSessionLocal = async_sessionmaker(
    bind=async_engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False
)

# 2. Synchronous Configuration (for standalone scripts / migrations)
# We name it 'engine' to maintain compatibility with 130+ existing scripts
engine = create_engine(SYNC_DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    Dependency function to get asynchronous database session.
    Use this in FastAPI route dependencies.
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()

def test_connection():
    """Simple synchronous connection test for status checks"""
    try:
        with engine.connect() as conn:
            return True
    except Exception as e:
        print(f"Database connection error: {e}")
        return False

def get_connection_info():
    """Return parsed connection details from URL"""
    from sqlalchemy.engine import make_url
    url = make_url(SYNC_DATABASE_URL)
    return {
        "host": url.host,
        "port": url.port,
        "database": url.database,
        "user": url.username
    }

@asynccontextmanager
async def get_db_context() -> AsyncGenerator[AsyncSession, None]:
    """
    Async context manager for database sessions.
    Used for background tasks or manual session management.
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
