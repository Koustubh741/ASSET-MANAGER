import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
import sys
import os

async def check():
    DATABASE_URL = "postgresql+asyncpg://postgres:Koustubh%40123@127.0.0.1:5432/ITSM"
    engine = create_async_engine(DATABASE_URL)
    try:
        async with engine.connect() as conn:
            r = await conn.execute(text("SELECT email, role FROM auth.users"))
            users = r.fetchall()
            for email, role in users:
                print(f"User: {email}, Role: {role}")
    finally:
        await engine.dispose()

if __name__ == "__main__":
    asyncio.run(check())
