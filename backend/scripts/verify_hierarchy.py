import asyncio
import sys
import os
from sqlalchemy import select, delete

# Add backend root to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database.database import AsyncSessionLocal
from app.models.models import Company, Department, User
from app.utils.uuid_gen import get_uuid_str

async def verify_hierarchy():
    print("==================================================")
    print("  Testing Multi-Tenant Hierarchy & Inheritances")
    print("==================================================")
    
    async with AsyncSessionLocal() as db:
        try:
            print("\n[STEP 1] Creating a Master Company...")
            company = Company(name="Acme Global Corp", timezone="UTC")
            db.add(company)
            await db.flush()
            print(f"         [OK] Company ID: {company.id}")

            print("\n[STEP 2] Creating a Parent Department assigned to Company...")
            parent_dept = Department(
                slug=f"parent-{get_uuid_str()[:8]}",
                name=f"Parent Department {get_uuid_str()[:5]}",
                company_id=company.id
            )
            db.add(parent_dept)
            await db.flush()
            print(f"         [OK] Parent Dept ID: {parent_dept.id} (Company: {parent_dept.company_id})")

            print("\n[STEP 3] Creating a Sub-Department (No company assigned manually)...")
            child_dept = Department(
                slug=f"child-{get_uuid_str()[:8]}",
                name=f"Sub-Department {get_uuid_str()[:5]}",
                parent_id=parent_dept.id
                # Intentionally NOT passing company_id
            )
            db.add(child_dept)
            await db.flush()
            
            if child_dept.company_id == company.id:
                print(f"         [PASS] Sub-Department automatically inherited company_id! ({child_dept.company_id})")
            else:
                print(f"         [FAIL] Sub-Department failed to inherit company_id. Expected {company.id}, got {child_dept.company_id}")

            print("\n[STEP 4] Creating a User assigned to the Sub-Department...")
            user = User(
                email=f"test.user.{get_uuid_str()[:8]}@acme.global",
                password_hash="fakehash",
                full_name="Acme Tester",
                department_id=child_dept.id
                # Intentionally NOT passing company_id
            )
            db.add(user)
            await db.flush()

            if user.company_id == company.id:
                print(f"         [PASS] User automatically inherited company_id via Department! ({user.company_id})")
            else:
                print(f"         [FAIL] User failed to inherit company_id. Expected {company.id}, got {user.company_id}")

            # Verify relationships load correctly
            print("\n[STEP 5] Refreshing from DB and testing relationship models...")
            # We must load them
            await db.refresh(child_dept, ['parent', 'company'])
            if child_dept.parent.id == parent_dept.id and child_dept.company.id == company.id:
                print("         [PASS] SQLAlchemy parent and company relations load successfully.")
            else:
                print("         [FAIL] SQLAlchemy relations failed.")

        finally:
            print("\n[STEP 6] Cleaning up test data...")
            # Cleanup using cascade deletes (User and departments delete if we delete them manually, 
            # wait 'ondelete=SET NULL' exists. So we manually delete them backwards)
            try:
                await db.execute(delete(User).where(User.email == user.email))
                await db.execute(delete(Department).where(Department.id == child_dept.id))
                await db.execute(delete(Department).where(Department.id == parent_dept.id))
                await db.execute(delete(Company).where(Company.id == company.id))
                await db.commit()
                print("         [OK] Test data purged.")
            except Exception as e:
                print(f"         [WARN] Error during cleanup: {e}")
                await db.rollback()

    print("\n==================================================")
    print("  Hierarchy Test Complete.")
    print("==================================================")

if __name__ == "__main__":
    sys.stdout.reconfigure(encoding='utf-8')
    asyncio.run(verify_hierarchy())
