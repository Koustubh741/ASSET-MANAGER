"""
Diagnostic: Check asset count and a few sample assets.
"""
import asyncio
import os, sys
sys.path.insert(0, os.path.dirname(__file__))

from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select, func
from app.models.models import Asset

DATABASE_URL = os.getenv("DATABASE_URL")
if DATABASE_URL and DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://", 1)

engine = create_async_engine(DATABASE_URL)
async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

async def check_assets():
    async with async_session() as db:
        count_res = await db.execute(select(func.count(Asset.id)))
        total = count_res.scalar()
        print(f"Total Assets in DB: {total}")
        
        status_res = await db.execute(select(Asset.status, func.count(Asset.id)).group_by(Asset.status))
        print("Status Distribution:")
        for status, count in status_res:
            print(f"  - {status}: {count}")
        
        if total > 0:
            sample_res = await db.execute(select(Asset).limit(5))
            samples = sample_res.scalars().all()
            for a in samples:
                print(f"Asset: {a.name} (ID: {a.id}, Status: {a.status})")
        else:
            print("No assets found in the Asset table.")

if __name__ == "__main__":
    asyncio.run(check_assets())
