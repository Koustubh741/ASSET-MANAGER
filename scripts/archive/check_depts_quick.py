import asyncio
import os
import sys

# Add backend to sys.path
sys.path.append(os.path.join(os.getcwd(), "backend"))

from backend.app.database.database import AsyncSessionLocal
from backend.app.models.models import Department
from sqlalchemy.future import select

async def check():
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Department.name, Department.slug))
        rows = result.all()
        print(f"\n[DEPARTMENTS] Found {len(rows)} departments:")
        for name, slug in rows:
            print(f"- {name} ({slug})")

if __name__ == "__main__":
    asyncio.run(check())
