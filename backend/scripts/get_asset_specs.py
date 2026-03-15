import asyncio
import os
import sys

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), "backend"))

from app.database.database import AsyncSessionLocal
from app.models.models import Asset
from sqlalchemy import select

async def get_specs(name):
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Asset).where(Asset.name == name))
        row = result.scalars().first()
        if row:
            print(f"[*] Specs for {name}:")
            print(row.specifications)
        else:
            print(f"[!] Asset {name} not found.")

if __name__ == "__main__":
    import sys
    name = sys.argv[1] if len(sys.argv) > 1 else "Cache_Digitech_Primary"
    asyncio.run(get_specs(name))
