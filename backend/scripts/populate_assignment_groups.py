import asyncio
import sys
import os
import uuid
from sqlalchemy import select
sys.path.append(os.path.abspath('d:/ASSET-MANAGER/backend'))

from app.database.database import AsyncSessionLocal
from app.models.models import Department, AssignmentGroup

target_depts = ['ADMIN', 'B&M', 'BD', 'F&A', 'INVENTORY', 'IT', 'LEGAL & COMPANY SECRETARY', 'LOSS PREVENTION', 'MARKETING', 'NSO', 'PLANNING', 'PROJECT', 'RETAIL', 'RETAIL OPERATION', 'SCM']

async def populate():
    async with AsyncSessionLocal() as db:
        print("Starting Population...")
        res = await db.execute(select(Department).where(Department.name.in_(target_depts)))
        depts = res.scalars().all()
        
        # also fetch existing assignment groups to avoid duplicates
        res_existing = await db.execute(select(AssignmentGroup.department_id))
        existing_dept_ids = [str(r) for r in res_existing.scalars() if r is not None]
        
        count = 0
        for dept in depts:
            if str(dept.id) not in existing_dept_ids:
                print(f"Creating Assignment Group for {dept.name}")
                new_group = AssignmentGroup(
                    id=uuid.uuid4(),
                    name=f"{dept.name} Division",
                    department_id=dept.id,
                    description=f"Automated group for {dept.name}"
                )
                db.add(new_group)
                count += 1
        
        await db.commit()
        print(f"Success! Added {count} assignment groups.")

if __name__ == "__main__":
    asyncio.run(populate())
