import asyncio
import json
from sqlalchemy import select, desc
from app.database.database import AsyncSessionLocal
from app.models.models import Asset

async def verify_latest_asset():
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Asset).order_by(desc(Asset.created_at)).limit(1))
        asset = result.scalars().first()
        
        if asset:
            print(f"Latest Asset:")
            print(f"  Name: {asset.name}")
            print(f"  Vendor: {asset.vendor}")
            print(f"  Model: {asset.model}")
            print(f"  Serial: {asset.serial_number}")
            print(f"  Specifications: {json.dumps(asset.specifications, indent=2)}")
        else:
            print("No assets found in database.")

if __name__ == "__main__":
    asyncio.run(verify_latest_asset())
