import asyncio
from sqlalchemy.future import select
from sqlalchemy.orm import joinedload
from app.database.database import get_db
from app.models.models import Asset

async def check_model_query_v2():
    async for db in get_db():
        # Matching asset_service.get_all_assets exactly
        query = select(Asset).options(joinedload(Asset.assigned_user))
        result = await db.execute(query)
        standard_assets = result.unique().scalars().all()
        
        print(f"Total Assets found via SQLAlchemy model (with joinedload): {len(standard_assets)}")
        if standard_assets:
            print(f"First Asset name: {standard_assets[0].name}")
        break

if __name__ == "__main__":
    asyncio.run(check_model_query_v2())
