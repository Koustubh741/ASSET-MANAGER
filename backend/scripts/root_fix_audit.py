import asyncio
from sqlalchemy import select
from app.database.database import AsyncSessionLocal
from app.models.models import User, Department

async def audit():
    async with AsyncSessionLocal() as db:
        print("\n=== DEPARTMENTAL ALIGNMENT AUDIT ===\n")
        
        # 1. List key users
        res = await db.execute(select(User).filter(User.email.in_(['it_mgr@enterprise.com', 'it_staff@itsm.com'])))
        users = res.scalars().all()
        for u in users:
            print(f"USER: {u.email} | ROLE: {u.role} | DEPT_ID: {u.department_id} | DEPT_STR: {u.department}")
            
        # 2. List all departments
        res = await db.execute(select(Department))
        depts = res.scalars().all()
        print("\nAVAILABLE DEPARTMENTS:")
        for d in depts:
            print(f"  ID: {d.id} | NAME: {d.name} | SLUG: {d.slug}")

if __name__ == "__main__":
    asyncio.run(audit())
