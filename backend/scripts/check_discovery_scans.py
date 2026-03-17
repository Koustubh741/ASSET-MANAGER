import asyncio
import os
import sys
import json
from sqlalchemy import select

# Add backend to path
sys.path.append(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))

from app.database.database import AsyncSessionLocal
from app.models.models import DiscoveryScan

async def check_scans():
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(DiscoveryScan).order_by(DiscoveryScan.start_time.desc()).limit(10)
        )
        scans = result.scalars().all()
        if scans:
            for s in scans:
                print(f"Scan ID: {s.id} | Status: {s.status} | Start: {s.start_time} | Assets: {s.assets_processed}")
        else:
            print("No discovery scans found.")

if __name__ == "__main__":
    asyncio.run(check_scans())
