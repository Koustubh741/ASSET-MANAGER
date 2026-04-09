import asyncio
import os
import sys
from uuid import UUID

# Add project root to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from sqlalchemy import select
from app.database.database import AsyncSessionLocal
from app.models.models import AssignmentGroup, Department

MAPPING = {
    "Architecture": "Architecture", # Might need to create
    "Engineering": "Engineering & Technology",
    "Executive": "Executive Management",
    "Operations": "Operations & Logistics",
    "HR": "Human Resources",
    "Technology": "Information Technology",
    "Legal": "Legal & Compliance"
}

async def migrate_groups():
    async with AsyncSessionLocal() as db:
        print("Starting Assignment Group -> Department Migration...")
        
        # 1. Fetch all groups
        result = await db.execute(select(AssignmentGroup))
        groups = result.scalars().all()
        
        # 2. Fetch all departments for lookup
        result = await db.execute(select(Department))
        depts = result.scalars().all()
        dept_map = {d.name: d.id for d in depts}
        dept_slug_map = {d.slug: d.id for d in depts}

        for g in groups:
            target_dept_name = MAPPING.get(g.department)
            if not target_dept_name:
                print(f"[WARN] No mapping for group '{g.name}' department string: '{g.department}'")
                continue
            
            dept_id = dept_map.get(target_dept_name)
            
            if not dept_id and g.department == "Architecture":
                # Special case: Create Architecture department if missing
                print(f"[INFO] Creating missing department: Architecture")
                import uuid
                new_dept = Department(
                    id=uuid.uuid4(),
                    name="Architecture",
                    slug="architecture",
                    dept_metadata={"domain": "DESIGN"}
                )
                db.add(new_dept)
                await db.flush()
                dept_id = new_dept.id
                dept_map["Architecture"] = dept_id

            if dept_id:
                print(f"[OK] Mapping group '{g.name}' to department '{target_dept_name}'")
                g.department_id = dept_id
            else:
                print(f"[ERROR] Could not find department '{target_dept_name}' for group '{g.name}'")

        await db.commit()
        print("Migration Complete.")

if __name__ == "__main__":
    asyncio.run(migrate_groups())
