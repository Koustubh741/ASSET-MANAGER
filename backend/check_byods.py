
import asyncio
from sqlalchemy import select, func
from app.database.database import AsyncSessionLocal
from app.models.models import Asset, ByodDevice

async def count_all():
    async with AsyncSessionLocal() as db:
        # 1. Asset Table
        assets = await db.execute(select(func.count(Asset.id)))
        asset_count = assets.scalar()
        
        # 2. ByodDevice Table
        byods = await db.execute(select(func.count(ByodDevice.id)))
        byod_count = byods.scalar()
        
        print(f"Asset Table Count: {asset_count}")
        print(f"BYOD Device Table Count: {byod_count}")
        print(f"Combined Total: {asset_count + byod_count}")

if __name__ == "__main__":
    asyncio.run(count_all())
