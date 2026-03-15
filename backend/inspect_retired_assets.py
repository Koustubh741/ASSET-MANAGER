import asyncio
from sqlalchemy import select
from app.database.database import AsyncSessionLocal
from app.models.models import Asset

async def inspect_retired():
    async with AsyncSessionLocal() as db:
        res = await db.execute(select(Asset).where(Asset.status.in_(["Retired", "Disposed"])))
        assets = res.scalars().all()
        for a in assets:
            print(f"Asset: {a.name}, Status: {a.status}, AssignedToID: {a.assigned_to_id}")

if __name__ == "__main__":
    import os
    import sys
    sys.path.append(os.getcwd())
    asyncio.run(inspect_retired())
