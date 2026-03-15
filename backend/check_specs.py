import asyncio
from app.database.database import AsyncSessionLocal
from app.models.models import Asset
from sqlalchemy import select

async def main():
    async with AsyncSessionLocal() as db:
        res = await db.execute(select(Asset).limit(10))
        assets = res.scalars().all()
        for a in assets:
            print(f"Asset: {a.name}")
            print(f"Specs: {a.specifications}")
            print("-" * 20)

if __name__ == "__main__":
    asyncio.run(main())
