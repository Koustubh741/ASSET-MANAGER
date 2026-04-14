import asyncio
import sys
import os
from sqlalchemy import select
from sqlalchemy.orm import joinedload

# Add root and backend to path
sys.path.append(os.getcwd())
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from backend.app.database.database import AsyncSessionLocal
from backend.app.services.user_service import create_user, get_user_by_email
from backend.app.schemas.user_schema import UserCreate
from backend.app.models.models import User, Department

async def verify():
    async with AsyncSessionLocal() as db:
        test_email = "integration_test@retail.pulse"
        
        # 1. Cleanup old test user
        existing = await get_user_by_email(db, test_email)
        if existing:
            await db.delete(existing)
            await db.commit()
            print(f"Cleaned up old test user: {test_email}")

        # 2. Create test user (Simulating registration payload)
        user_in = UserCreate(
            email=test_email,
            password="testpassword123",
            full_name="Integration Test User",
            department="RETAIL OPERATION",
            sub_dept="ST-MGMT",
            designation="SM",
            location="HB05",
            loc_type="STORE",
            role="END_USER",
            position="TEAM_MEMBER"
        )
        
        print(f"Creating user with department: {user_in.department}")
        db_user = await create_user(db, user_in)
        
        # 3. Verify linkage
        res = await db.execute(
            select(User).options(joinedload(User.dept_obj)).filter(User.id == db_user.id)
        )
        verified_user = res.scalars().first()
        
        print(f"\n--- VERIFICATION RESULTS ---")
        print(f"User Email: {verified_user.email}")
        print(f"Resolved Department ID: {verified_user.department_id}")
        
        if verified_user.dept_obj:
            print(f"Linked Department Name: {verified_user.dept_obj.name}")
            if verified_user.dept_obj.name.upper() == "RETAIL OPERATION":
                print("\nSUCCESS: Database Integration Verified!")
            else:
                print(f"\nFAILURE: Linked to wrong department: {verified_user.dept_obj.name}")
        else:
            print("\nFAILURE: department_id is NULL or Linkage failed!")

if __name__ == "__main__":
    asyncio.run(verify())
