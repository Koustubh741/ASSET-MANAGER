import asyncio
from app.database.database import AsyncSessionLocal
from app.models.models import Asset
from sqlalchemy import select

async def test_query():
    agent_id = "00000000-0000-0000-0000-000000000002"
    async with AsyncSessionLocal() as db:
        # Test the exact query from asset_service.py
        query = select(Asset).filter(Asset.specifications['Agent ID'].as_string() == str(agent_id))
        result = await db.execute(query)
        assets = result.scalars().all()
        print(f"Query for Agent ID '{agent_id}' returned {len(assets)} assets")
        for asset in assets[:5]:
            print(f" - {asset.name}")

if __name__ == "__main__":
    asyncio.run(test_query())
