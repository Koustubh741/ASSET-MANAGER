import asyncio
import sys
import os
from sqlalchemy import select

# Add parent directory to sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database.database import AsyncSessionLocal
from app.models.models import User, Department

async def audit():
    async with AsyncSessionLocal() as db:
        print("\n=== DEPARTMENTAL ALIGNMENT AUDIT ===\n")
        
        # 1. List key users
        res = await db.execute(select(User).filter(User.email.in_(['it_mgr@enterprise.com', 'it_staff@itsm.com'])))
        users = res.scalars().all()
        for u in users:
            print(f"USER: {u.email} | ROLE: {u.role} | DEPT_ID: {u.department_id} | POSITION: {u.position}")
            
        # 2. List all departments
        res = await db.execute(select(Department))
        depts = res.scalars().all()
        print("\nAVAILABLE DEPARTMENTS:")
        for d in depts:
            print(f"  ID: {d.id} | NAME: {d.name} | SLUG: {d.slug}")

if __name__ == "__main__":
    asyncio.run(audit())
