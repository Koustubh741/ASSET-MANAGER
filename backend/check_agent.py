import asyncio
from app.database.database import AsyncSessionLocal
from app.models.models import Asset
from sqlalchemy import select

async def main():
    async with AsyncSessionLocal() as db:
        res = await db.execute(select(Asset))
        assets = res.scalars().all()
        for a in assets:
            keys = [k for k in (a.specifications or {}).keys() if 'agent' in k.lower()]
            if len(keys) > 1:
                print(f"Asset: {a.name} has duplicate agent keys: {keys}")
                print(a.specifications)
        print("Done")

if __name__ == "__main__":
    asyncio.run(main())
