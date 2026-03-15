import asyncio
import os
import sys

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), "backend"))

from app.database.database import AsyncSessionLocal
from app.models.models import Asset
from sqlalchemy import select

async def list_assets():
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Asset))
        rows = result.scalars().all()
        print(f"[*] Found {len(rows)} assets total:")
        for row in rows:
            print(f"  - {row.name} ({row.type}) Status:{row.status}")
            if row.specifications:
                ip = row.specifications.get('IP Address') or row.specifications.get('ip') or 'N/A'
                print(f"    IP: {ip}")

if __name__ == "__main__":
    asyncio.run(list_assets())
