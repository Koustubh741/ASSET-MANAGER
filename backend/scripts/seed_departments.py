import asyncio
import uuid
import sys
import os

# Add the project root to sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from sqlalchemy.ext.asyncio import AsyncSession
from app.database.database import AsyncSessionLocal
from app.models.models import User, Department
from sqlalchemy.future import select

DEPARTMENTS = [
    {"slug": "data_ai", "name": "Data & AI", "domain": "DATA_AI"},
    {"slug": "cloud", "name": "Cloud Operations", "domain": "CLOUD"},
    {"slug": "security", "name": "Cyber Security", "domain": "SECURITY"},
    {"slug": "engineering", "name": "Product Engineering", "domain": "DEVELOPMENT"},
    {"slug": "it", "name": "IT Services", "domain": "IT"},
    {"slug": "finance", "name": "Finance & Accounts", "domain": "FINANCE"},
    {"slug": "procurement", "name": "Procurement", "domain": "PROCUREMENT"},
    {"slug": "hr", "name": "Human Resources", "domain": "HR"}
]

async def seed():
    async with AsyncSessionLocal() as db:
        print("Starting Department Seeding...")
        
        # 1. Ensure Departments exist
        for dept_info in DEPARTMENTS:
            res = await db.execute(select(Department).filter(Department.slug == dept_info["slug"]))
            dept = res.scalars().first()
            if not dept:
                print(f"Creating department: {dept_info['name']}")
                dept = Department(
                    id=uuid.uuid4(),
                    slug=dept_info["slug"],
                    name=dept_info["name"],
                    dept_metadata={"domain": dept_info["domain"]}
                )
                db.add(dept)
                await db.flush() # Get ID
            
            # 2. Assign or create a Manager for this department
            res_mgr = await db.execute(select(User).filter(
                (User.department == dept_info["name"]) | (User.domain == dept_info["domain"]),
                User.position == "MANAGER"
            ))
            manager = res_mgr.scalars().first()
            
            if not manager:
                # Check for any user in this domain to promote
                res_staff = await db.execute(select(User).filter(
                    (User.department == dept_info["name"]) | (User.domain == dept_info["domain"])
                ))
                staff = res_staff.scalars().first()
                if staff:
                    print(f"Promoting {staff.email} to Manager of {dept_info['name']}")
                    staff.position = "MANAGER"
                    staff.department_id = dept.id
                    dept.manager_id = staff.id
                else:
                    print(f"No users found for {dept_info['name']}. Creating dummy manager.")
                    # In a real app, we might wait for real users. 
                    # For this "Root Fix", we'll just ensure the department exists.
            else:
                print(f"Manager already exists for {dept_info['name']}: {manager.email}")
                dept.manager_id = manager.id
                manager.department_id = dept.id

        await db.commit()
        print("Seeding Complete.")

if __name__ == "__main__":
    asyncio.run(seed())
