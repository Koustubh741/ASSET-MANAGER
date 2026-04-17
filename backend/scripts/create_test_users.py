import asyncio
import os
import sys
import uuid
from sqlalchemy.future import select

# Add the 'backend' directory to sys.path
base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(base_dir)

from app.database.database import AsyncSessionLocal
from app.models.models import User, Department, AssignmentGroup
from app.services.user_service import get_password_hash

async def create_test_users():
    """
    Ensure each department has a test user (TEAM_MEMBER) and a MANAGER.
    """
    async with AsyncSessionLocal() as db:
        # Get all departments
        res = await db.execute(select(Department))
        departments = res.scalars().all()
        
        created_count = 0
        
        for dept in departments:
            # Check for existing manager
            mgr_email = f"manager.{dept.slug}@itsm-test.com"
            mgr_res = await db.execute(select(User).where(User.email == mgr_email))
            if not mgr_res.scalars().first():
                mgr = User(
                    id=uuid.uuid4(),
                    email=mgr_email,
                    full_name=f"{dept.name} Manager",
                    password_hash=get_password_hash("testpass123"),
                    role="END_USER",
                    position="MANAGER",
                    department_id=dept.id,
                    status="ACTIVE"
                )
                db.add(mgr)
                print(f"  Created Manager for {dept.name}")
                created_count += 1
            
            # Check for existing team member
            user_email = f"user.{dept.slug}@itsm-test.com"
            user_res = await db.execute(select(User).where(User.email == user_email))
            if not user_res.scalars().first():
                user = User(
                    id=uuid.uuid4(),
                    email=user_email,
                    full_name=f"{dept.name} User",
                    password_hash=get_password_hash("testpass123"),
                    role="END_USER",
                    position="TEAM_MEMBER",
                    department_id=dept.id,
                    status="ACTIVE"
                )
                db.add(user)
                print(f"  Created User for {dept.name}")
                created_count += 1
                
        await db.commit()
        print(f"[TEST_SETUP] Created {created_count} test users across departments.")

if __name__ == "__main__":
    asyncio.run(create_test_users())
