import asyncio
from app.database.database import AsyncSessionLocal
from app.models.models import Asset
from sqlalchemy import select

async def main():
    async with AsyncSessionLocal() as db:
        res = await db.execute(select(Asset).filter(Asset.name == 'DESKTOP-78I99HT'))
        assets = res.scalars().all()
        for a in assets:
            print(f"ID: {a.id}, Serial: '{a.serial_number}', Specs: {a.specifications}")
        print(f"Total: {len(assets)}")

if __name__ == "__main__":
    asyncio.run(main())
