import asyncio
from sqlalchemy import select
from app.database.database import AsyncSessionLocal
from app.models.models import AssignmentGroup, User
import uuid

async def seed_groups():
    async with AsyncSessionLocal() as db:
        print("[INFO] Seeding Assignment Groups...")
        
        groups_to_seed = [
            {"name": "IT Support Team", "department": "Technology", "description": "General IT support and troubleshooting"},
            {"name": "HR Department", "department": "Human Resources", "description": "HR related queries and onboarding"},
            {"name": "Finance Department", "department": "Operations", "description": "Financial approvals and procurement"},
            {"name": "Facilities Team", "department": "Operations", "description": "Physical infrastructure and maintenance"},
            {"name": "Network Ops", "department": "Technology", "description": "Network infrastructure and security"},
            {"name": "Executive Support", "department": "Executive", "description": "VIP support for C-suite executives"},
        ]
        
        # Get an admin user to be the manager for these groups
        admin_res = await db.execute(select(User).filter(User.role == "ADMIN"))
        admin = admin_res.scalars().first()
        
        for g_data in groups_to_seed:
            existing = await db.execute(select(AssignmentGroup).filter(AssignmentGroup.name == g_data["name"]))
            if existing.scalars().first():
                print(f"[SKIP] Group {g_data['name']} already exists.")
                continue
            
            new_group = AssignmentGroup(
                id=uuid.uuid4(),
                name=g_data["name"],
                department=g_data["department"],
                description=g_data["description"],
                manager_id=admin.id if admin else None
            )
            db.add(new_group)
            print(f"[OK] Created Group: {g_data['name']}")
            
        await db.commit()
        print("[SUCCESS] Assignment Groups seeded.")

if __name__ == "__main__":
    asyncio.run(seed_groups())
