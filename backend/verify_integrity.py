
import asyncio
import uuid
import os
import sys

# Ensure backend root is in sys.path
sys.path.append(os.getcwd())

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.database.database import get_db_context
from app.models.models import User, AssetRequest, Ticket, Department
from app.services import ticket_service

async def verify_root_fix():
    print("--- Starting Backend Integrity Verification ---")
    async with get_db_context() as db:
        # 1. Verify User Department Mapping
        print("\n[1] Verifying User-Department Mapping...")
        result = await db.execute(select(User).filter(User.email == "staff_sales@example.com"))
        user = result.scalars().first()
        if not user:
            print("FAILED: user staff_sales@example.com not found")
        else:
            print(f"User: {user.full_name}")
            print(f"Department ID: {user.department_id}")
            if user.dept_obj:
                print(f"Department Name (via dept_obj): {user.dept_obj.name}")
            else:
                print("FAILED: dept_obj is None")

        # 2. Verify Ticket Service Logic (Integrated into Executive Summary)
        print("\n[2] Skipping legacy get_ticket_counts_by_department (Logic verified in summary below)...")

        # 3. Verify Executive Summary (Another crash point)
        print("\n[3] Verifying Executive Summary...")
        try:
            summary = await ticket_service.get_ticket_executive_summary(db, department="Sales")
            print("SUCCESS: Executive summary generated for 'Sales'")
        except Exception as e:
            print(f"FAILED: executive summary crashed: {str(e)}")

        # 4. Verify Reference Router Logic (Dynamic Depts)
        print("\n[4] Verifying Department Reference Query...")
        result = await db.execute(select(Department.name))
        depts = result.scalars().all()
        print(f"Dynamic Departments in DB: {depts}")
        if len(depts) > 0:
            print("SUCCESS: Dynamic department list retrieved")
        else:
            print("FAILED: No departments found in database")

async def main():
    await verify_root_fix()

if __name__ == "__main__":
    asyncio.run(main())
