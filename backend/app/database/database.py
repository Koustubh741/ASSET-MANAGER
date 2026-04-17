import os
from dotenv import load_dotenv
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker

load_dotenv()
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy import create_engine
from typing import AsyncGenerator
from contextlib import asynccontextmanager

# DATABASE_URL configuration
DATABASE_URL = os.environ["DATABASE_URL"]
SYNC_DATABASE_URL = DATABASE_URL.replace("postgresql+asyncpg://", "postgresql://")

# 1. Asynchronous Configuration (for FastAPI)
# Root Fix: tuned for 100,000+ users with robust connection pooling
async_engine = create_async_engine(
    DATABASE_URL, 
    echo=False,
    pool_size=50,          # Increased from 20 to handle concurrent dashboard auth + data sessions
    max_overflow=20,       # Increased from 10 for burst capacity during heavy navigation
    pool_recycle=3600,     # Cycle every hour
    pool_pre_ping=True     # Check connections before use
)
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

async def test_async_connection():
    """Simple asynchronous connection test for status checks"""
    from sqlalchemy import text
    try:
        async with async_engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
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
