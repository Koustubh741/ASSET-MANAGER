import asyncio
import os
import sys
from pathlib import Path

# Add backend root to sys.path for IDE and runtime imports
backend_root = str(Path(__file__).resolve().parent.parent)
if backend_root not in sys.path:
    sys.path.append(backend_root)

from app.database.database import AsyncSessionLocal
from app.models.models import User, AssignmentGroup
from sqlalchemy import select

async def get_departments():
    async with AsyncSessionLocal() as db:
        # Get unique departments from Users
        res_u = await db.execute(select(User.department).distinct())
        depts_u = set(row[0] for row in res_u.all() if row[0])
        
        # Get unique departments from Assignment Groups
        res_g = await db.execute(select(AssignmentGroup.department).distinct())
        depts_g = set(row[0] for row in res_g.all() if row[0])
        
        all_depts = sorted(list(depts_u | depts_g))
        print(f"Count: {len(all_depts)}")
        print(f"Departments: {', '.join(all_depts)}")

if __name__ == "__main__":
    asyncio.run(get_departments())
