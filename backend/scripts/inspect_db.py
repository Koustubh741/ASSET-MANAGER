import asyncio
import sys
import os
from sqlalchemy import select
from sqlalchemy.orm import selectinload

# Add backend and root to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database.database import AsyncSessionLocal
from app.models.models import User, AssetRequest, Department

async def inspect():
    async with AsyncSessionLocal() as db:
        print("\n=== INSPECTING DATABASE STATE (V2) ===\n")
        
        # 1. it_staff@itsm.com
        res = await db.execute(select(User).filter(User.email == "it_staff@itsm.com"))
        staff = res.scalars().first()
        if staff:
            print(f"STAFF: id={staff.id}, email={staff.email}, domain={staff.domain}, dept_id={staff.department_id}, role={staff.role}")
            if staff.department_id:
                dept_res = await db.execute(select(Department).filter(Department.id == staff.department_id))
                dept = dept_res.scalars().first()
                if dept:
                    print(f"  STAFF Department: {dept.name} ({dept.slug})")
        else:
            print("STAFF not found")

        # 2. it_mgr@enterprise.com
        res = await db.execute(select(User).filter(User.email == "it_mgr@enterprise.com"))
        mgr = res.scalars().first()
        if mgr:
            print(f"MANAGER: id={mgr.id}, email={mgr.email}, domain={mgr.domain}, dept_id={mgr.department_id}, role={mgr.role}, position={mgr.position}")
            if mgr.department_id:
                dept_res = await db.execute(select(Department).filter(Department.id == mgr.department_id))
                dept = dept_res.scalars().first()
                if dept:
                    print(f"  MANAGER Department: {dept.name} ({dept.slug})")
        else:
            print("MANAGER not found")

        # 3. Request
        if staff:
            res = await db.execute(select(AssetRequest).filter(AssetRequest.requester_id == staff.id))
            reqs = res.scalars().all()
            print(f"\nREQUESTS from STAFF ({len(reqs)}):")
            for r in reqs:
                print(f"  ID={r.id}, Status={r.status}, OwnerRole={r.current_owner_role}")

if __name__ == "__main__":
    asyncio.run(inspect())
