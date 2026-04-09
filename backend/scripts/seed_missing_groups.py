import asyncio
import os
import sys
import uuid
from sqlalchemy import select

# Add project root to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.database.database import AsyncSessionLocal
from app.models.models import AssignmentGroup, Department, User

GROUPS_TO_ADD = [
    {"name": "Cloud Operations Team", "slug": "cloud", "description": "Cloud infrastructure and platform support"},
    {"name": "Customer Success", "slug": "customer_success", "description": "Assistance for customer onboarding and success"},
    {"name": "Cyber Security Team", "slug": "security", "description": "Security incident response and vulnerability management"},
    {"name": "Data & AI Team", "slug": "data_ai", "description": "Support for data engineering and AI initiatives"},
    {"name": "Procurement Team", "slug": "procurement", "description": "Purchasing and vendor management requests"},
    {"name": "Product Management", "slug": "product", "description": "Feature requests and product roadmap queries"},
    {"name": "Sales & Marketing", "slug": "sales", "description": "Marketing assets and sales enablement support"}
]

async def seed_missing_groups():
    async with AsyncSessionLocal() as db:
        print("Starting Seeding for Missing Assignment Groups...")
        
        # Get an admin to be the manager
        admin_res = await db.execute(select(User).filter(User.role == "ADMIN"))
        admin = admin_res.scalars().first()
        
        # Get all departments for lookup
        dept_res = await db.execute(select(Department))
        depts = dept_res.scalars().all()
        dept_slug_map = {d.slug: d for d in depts}
        dept_name_map = {d.name: d for d in depts}

        # 1. Fix existing Finance Department link
        finance_group_res = await db.execute(select(AssignmentGroup).filter(AssignmentGroup.name == "Finance Department"))
        finance_group = finance_group_res.scalars().first()
        finance_dept = dept_slug_map.get("finance")
        if finance_group and finance_dept:
            print(f"[FIX] Updating Finance Department link to: {finance_dept.name}")
            finance_group.department_id = finance_dept.id
            finance_group.department = "Finance" # Consistent label

        # 2. Add missing groups
        for g_data in GROUPS_TO_ADD:
            existing = await db.execute(select(AssignmentGroup).filter(AssignmentGroup.name == g_data["name"]))
            if existing.scalars().first():
                print(f"[SKIP] Group '{g_data['name']}' already exists.")
                continue
            
            dept = dept_slug_map.get(g_data["slug"])
            if not dept:
                print(f"[WARN] No department found with slug '{g_data['slug']}' for group '{g_data['name']}'")
                continue

            new_group = AssignmentGroup(
                id=uuid.uuid4(),
                name=g_data["name"],
                department=dept.name.split(" ")[0], # Short label
                department_id=dept.id,
                description=g_data["description"],
                manager_id=admin.id if admin else None
            )
            db.add(new_group)
            print(f"[OK] Created Assignment Group: {g_data['name']}")
        
        await db.commit()
        print("Seeding Complete.")

if __name__ == "__main__":
    asyncio.run(seed_missing_groups())
