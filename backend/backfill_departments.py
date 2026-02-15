import asyncio
import os
import sys

sys.path.append(os.getcwd())

from app.database.database import AsyncSessionLocal
from app.models.models import User
from sqlalchemy.future import select
from sqlalchemy import update

async def backfill_departments():
    async with AsyncSessionLocal() as session:
        print("\n=== BACKFILLING MISSING DEPARTMENTS ===\n")
        
        # 1. Get all users
        result = await session.execute(select(User))
        users = result.scalars().all()
        
        updated_count = 0
        
        for user in users:
            original_dept = user.department
            new_dept = None
            
            # Logic to infer department
            if user.department:
                print(f"[SKIP] User {user.email} already has department: {user.department}")
                continue
                
            if "manager" in user.email or "admin" in user.email or user.role == "IT_MANAGEMENT":
                new_dept = "IT"
            elif "engineering" in user.email or "dev" in user.email:
                new_dept = "Engineering"
            elif "finance" in user.email:
                new_dept = "Finance"
            elif "hr" in user.email:
                new_dept = "Human Resources"
            else:
                # Default for generic/unknown users
                new_dept = "Engineering" # Assumption for test environment based on user context
            
            if new_dept:
                user.department = new_dept
                # Also fix domain if missing, as it's often used interchangeably
                if not user.domain:
                    user.domain = new_dept
                
                updated_count += 1
                print(f"[UPDATE] User {user.email}: {original_dept} -> {new_dept}")
                
        if updated_count > 0:
            await session.commit()
            print(f"\n[SUCCESS] Updated {updated_count} users with missing departments.")
        else:
            print("\n[INFO] No users needed updates.")

if __name__ == "__main__":
    asyncio.run(backfill_departments())
