import asyncio
import sys
import os
from sqlalchemy import select, update

# Add backend and root to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database.database import AsyncSessionLocal
from app.models.models import User, Department

async def align_departments():
    async with AsyncSessionLocal() as db:
        print("\n=== STARTING DEPARTMENTAL ALIGNMENT (ROOT FIX) ===\n")
        
        # 1. Fetch all departments for mapping
        res = await db.execute(select(Department))
        depts = res.scalars().all()
        dept_map = {d.name.lower(): d.id for d in depts}
        dept_slug_map = {d.slug.lower(): d.id for d in depts}
        
        print(f"Loaded {len(depts)} departments.")
        for d in depts:
            print(f"  - {d.name} ({d.slug})")

        # 2. Fetch users without department_id
        res = await db.execute(select(User).filter(User.department_id == None))
        users = res.scalars().all()
        print(f"\nFound {len(users)} users needing alignment.")

        updated_count = 0
        for u in users:
            target_id = None
            
            # Strategy: Match by 'domain' string
            domain_str = (u.domain or "").lower()
            if domain_str in dept_slug_map:
                target_id = dept_slug_map[domain_str]
            elif domain_str in dept_map:
                target_id = dept_map[domain_str]
            elif "security" in domain_str:
                target_id = dept_slug_map.get("security") or dept_map.get("it")
            elif "dev" in domain_str or "cloud" in domain_str:
                target_id = dept_slug_map.get("engineering")
            elif "finance" in domain_str:
                target_id = dept_slug_map.get("finance")

            if target_id:
                u.department_id = target_id
                updated_count += 1
                print(f"  FIXED: {u.email} -> Managed by Dept ID {target_id} (Matched from domain '{domain_str}')")
            else:
                print(f"  SKIPPED: {u.email} (No clear match for domain '{domain_str}')")

        await db.commit()
        print(f"\nSuccessfully aligned {updated_count} users.")

if __name__ == "__main__":
    asyncio.run(align_departments())
