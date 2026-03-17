import asyncio
import os
import sys
from datetime import datetime, timedelta, timezone
from sqlalchemy import select

# Add backend to path
sys.path.append(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))

from app.database.database import AsyncSessionLocal
from app.models.models import Asset

async def check_new_assets():
    async with AsyncSessionLocal() as db:
        one_hour_ago = datetime.now(timezone.utc) - timedelta(hours=1)
        result = await db.execute(
            select(Asset).where(Asset.created_at >= one_hour_ago)
        )
        assets = result.scalars().all()
        if assets:
            print(f"Found {len(assets)} assets created in the last hour:")
            for asset in assets:
                print(f"Asset: {asset.name} | Model: {asset.model} | Vendor: {asset.vendor}")
        else:
            print("No new assets found in the last hour.")

if __name__ == "__main__":
    asyncio.run(check_new_assets())
