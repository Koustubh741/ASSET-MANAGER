
import asyncio
import os
import sys
from sqlalchemy import select

# Add parent directory to path
sys.path.append(os.getcwd())

from backend.app.database.database import AsyncSessionLocal
from backend.app.models.models import Asset

async def check():
    async with AsyncSessionLocal() as db:
        res = await db.execute(select(Asset).where(Asset.name == 'NSW_2ndFloor.cachedigitech.local'))
        a = res.scalars().first()
        if a:
            print(f"ID: {a.id}")
            print(f"Name: {a.name}")
            print(f"Model: {a.model}")
            print(f"Vendor: {a.vendor}")
            print(f"Specs: {a.specifications}")
        else:
            print("Not found")

if __name__ == "__main__":
    asyncio.run(check())
