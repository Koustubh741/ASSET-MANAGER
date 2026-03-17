import asyncio
import os
import sys

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from app.database.database import AsyncSessionLocal
from app.models.models import AssignmentGroup, AssignmentGroupMember, User
from sqlalchemy.future import select
from sqlalchemy import func

async def audit():
    async with AsyncSessionLocal() as db:
        res = await db.execute(select(AssignmentGroup))
        groups = res.scalars().all()
        print(f"TOTAL GROUPS: {len(groups)}")
        for g in groups:
            members_res = await db.execute(select(func.count(AssignmentGroupMember.id)).where(AssignmentGroupMember.group_id == g.id))
            members = members_res.scalar()
            
            mgr_name = "NONE"
            if g.manager_id:
                mgr_res = await db.execute(select(User.full_name).where(User.id == g.manager_id))
                mgr_name = mgr_res.scalar() or "NONE"
                
            print(f"- {g.name:25} | Dept: {g.department:15} | Members: {members:2} | Manager: {mgr_name}")

if __name__ == "__main__":
    asyncio.run(audit())
