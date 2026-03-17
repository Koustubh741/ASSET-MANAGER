import asyncio
import os
import sys

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), "backend"))

from app.database.database import AsyncSessionLocal
from app.models.models import Asset
from sqlalchemy import select

async def search():
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Asset).where(Asset.name.ilike('%FortiGate%')))
        rows = result.scalars().all()
        print(f"[*] Found {len(rows)} FortiGate assets:")
        for row in rows:
            # Check for IP in specifications if not in column
            ip = row.specifications.get('IP Address') if row.specifications else 'Unknown'
            print(f"  Name: {row.name}")
            print(f"  Serial: {row.serial_number}")
            print(f"  IP (from specs): {ip}")
            print(f"  Full Specs: {row.specifications}")

if __name__ == "__main__":
    asyncio.run(search())
