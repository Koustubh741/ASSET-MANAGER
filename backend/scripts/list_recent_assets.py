import asyncio
import os
import sys
import json
from sqlalchemy import select

# Add backend to path
sys.path.append(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))

from app.database.database import AsyncSessionLocal
from app.models.models import Asset

async def list_recent_assets():
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(Asset).order_by(Asset.updated_at.desc()).limit(10)
        )
        assets = result.scalars().all()
        if assets:
            for asset in assets:
                print(f"Asset: {asset.name} | Model: {asset.model} | Vendor: {asset.vendor} | IP: {asset.specifications.get('IP Address', 'N/A')}")
                # print(f"Specs: {json.dumps(asset.specifications, indent=2)}")
                print("-" * 20)
        else:
            print("No assets found.")

if __name__ == "__main__":
    asyncio.run(list_recent_assets())
