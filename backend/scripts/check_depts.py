import asyncio
import os
import sys
from sqlalchemy.future import select

# Add backend to sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database.database import AsyncSessionLocal
from app.models.models import Department

async def check_depts():
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Department))
        depts = result.scalars().all()
        for d in depts:
            print(f"Slug: {d.slug} | Name: {d.name}")

if __name__ == "__main__":
    asyncio.run(check_depts())
