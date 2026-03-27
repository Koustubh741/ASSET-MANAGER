"""
Diagnostic: Check Ticket table columns.
"""
import asyncio
import os, sys
sys.path.insert(0, os.path.dirname(__file__))

from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.join(os.path.dirname(__file__), ".env")))

from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

DATABASE_URL = os.getenv("DATABASE_URL", "").replace("postgresql://", "postgresql+asyncpg://")

async def main():
    engine = create_async_engine(DATABASE_URL)
    async with engine.connect() as conn:
        print("--- Ticket Table Columns ---")
        res = await conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name = 'tickets' AND table_schema = 'support'"))
        for row in res:
            print(f"  {row[0]}")
            
asyncio.run(main())
