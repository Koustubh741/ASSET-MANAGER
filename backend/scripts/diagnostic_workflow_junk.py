
import asyncio
from sqlalchemy.ext.asyncio import create_async_session, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select
import sys
import os

# Internal imports
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from app.database.database import ASYNC_SQLALCHEMY_DATABASE_URL
from app.models.models import Asset

async def inspect_workflow_junk():
    from sqlalchemy.ext.asyncio import create_async_engine
    engine = create_async_engine(ASYNC_SQLALCHEMY_DATABASE_URL)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session() as session:
        # Look for the specific assets from the screenshot
        query = select(Asset).where(Asset.name.ilike('%dhankhar%') | (Asset.type == 'i'))
        result = await session.execute(query)
        assets = result.scalars().all()

        print(f"--- Diagnostic Report: Malformed Assets ---")
        for a in assets:
            print(f"ID: {a.id}")
            print(f"Name: {a.name}")
            print(f"Type: {a.type}")
            print(f"Status: {a.status}")
            print(f"Warranty: {a.warranty_expiry}")
            print(f"Cost: {a.cost}")
            print("-" * 30)

if __name__ == "__main__":
    asyncio.run(inspect_workflow_junk())
