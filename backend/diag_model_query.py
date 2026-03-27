import asyncio
from sqlalchemy.future import select
from app.database.database import get_db
from app.models.models import Asset

async def check_model_query():
    async for db in get_db():
        result = await db.execute(select(Asset))
        assets = result.scalars().all()
        print(f"Total Assets found via SQLAlchemy model: {len(assets)}")
        if assets:
            print(f"First Asset name: {assets[0].name}")
        break

if __name__ == "__main__":
    asyncio.run(check_model_query())
