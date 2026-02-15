import asyncio
from app.database.database import AsyncSessionLocal
from app.models.models import Asset
from sqlalchemy import select

async def check_asset_agent_ids():
    async with AsyncSessionLocal() as db:
        res = await db.execute(select(Asset).limit(5))
        assets = res.scalars().all()
        print(f"Checking {len(assets)} assets...")
        for asset in assets:
            if asset.specifications:
                agent_id = asset.specifications.get("Agent ID")
                print(f"Asset {asset.name} (ID: {asset.id}) discovered by Agent ID: {agent_id}")
            else:
                print(f"Asset {asset.name} (ID: {asset.id}) has no specifications")

if __name__ == "__main__":
    asyncio.run(check_asset_agent_ids())
