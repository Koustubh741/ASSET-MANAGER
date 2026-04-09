import asyncio
import json
from sqlalchemy import select
from backend.app.database.database import AsyncSessionLocal
from backend.app.models.models import Asset

async def find_asset():
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(Asset).filter(Asset.name == "Cache_Digitech_Primary")
        )
        asset = result.scalars().first()
        if asset:
            print(f"Asset Found: {asset.name}")
            print(f"IP: {asset.ip_address}")
            print(f"Vendor: {asset.vendor}")
            print(f"Type: {asset.type}")
            print(f"Serial: {asset.serial_number}")
            print(f"Model: {asset.model}")
            print(f"Specs: {json.dumps(asset.specifications, indent=2)}")
        else:
            print("Asset not found")

if __name__ == "__main__":
    asyncio.run(find_asset())
