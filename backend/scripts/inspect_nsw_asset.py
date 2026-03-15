import asyncio
import os
import sys
import json
from sqlalchemy import select

# Add backend to path
sys.path.append(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))

from app.database.database import AsyncSessionLocal
from app.models.models import Asset

async def inspect_asset(hostname):
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(Asset).where(Asset.name.ilike(f"%{hostname}%"))
        )
        asset = result.scalars().first()
        if asset:
            print(f"Asset Found: {asset.name}")
            print(f"ID: {asset.id}")
            print(f"Model: {asset.model}")
            print(f"Vendor: {asset.vendor}")
            print(f"Serial: {asset.serial_number}")
            print(f"Specifications: {json.dumps(asset.specifications, indent=2)}")
        else:
            print(f"Asset with hostname '{hostname}' not found.")

if __name__ == "__main__":
    hostname = "Cache_Digitech_Primary"
    asyncio.run(inspect_asset(hostname))
