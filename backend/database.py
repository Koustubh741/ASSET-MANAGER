"""
Proxy for the unified database configuration.
Ensures legacy scripts use the same MetaData and Engine as the FastAPI app.
"""
from app.database.database import (
    DATABASE_URL,
    SYNC_DATABASE_URL,
    async_engine,
    AsyncSessionLocal,
    engine,
    SessionLocal,
    Base,
    get_db,
    test_connection,
    get_connection_info
)
