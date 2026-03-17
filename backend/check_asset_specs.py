import asyncio
from app.database.database import AsyncSessionLocal
from app.models.models import Asset
from sqlalchemy import select

async def check_asset_specs():
    async with AsyncSessionLocal() as db:
        res = await db.execute(select(Asset).filter(Asset.name == 'aws-prod-web-01').limit(1))
        asset = res.scalars().first()
        if asset:
            print(f"Asset: {asset.name}")
            print(f"Specifications: {asset.specifications}")
        else:
            print("Asset not found")

if __name__ == "__main__":
    asyncio.run(check_asset_specs())
