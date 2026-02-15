import asyncio
from sqlalchemy import select, func
from app.database.database import AsyncSessionLocal
from app.models.models import Asset

async def count_assets():
    async with AsyncSessionLocal() as db:
        # Check assets by discovery source in specifications JSON
        # Note: specifications is a JSONB column in Postgres (usually)
        result = await db.execute(select(Asset))
        assets = result.scalars().all()
        
        counts = {}
        for asset in assets:
            source = asset.specifications.get("Discovery", "Unknown") if asset.specifications else "None"
            counts[source] = counts.get(source, 0) + 1
            
        print("--- Asset Counts by Discovery Source ---")
        for source, count in counts.items():
            print(f"{source}: {count}")
            
        # Also check the total count
        print(f"Total Assets: {len(assets)}")

if __name__ == "__main__":
    asyncio.run(count_assets())
