import asyncio
import os
import sys

# Add current directory to path so we can import app
sys.path.append(os.getcwd())

from app.database.database import AsyncSessionLocal
from app.models.models import User, Department
from sqlalchemy.future import select
from sqlalchemy import update

async def migrate():
    async with AsyncSessionLocal() as session:
        print("--- STARTING DEPARTMENT SYNC MIGRATION ---")
        
        # 1. Get all departments for lookup
        result = await session.execute(select(Department))
        depts = {d.id: d.name for d in result.scalars().all()}
        print(f"Loaded {len(depts)} departments for sync mapping.")

        # 2. Find users with department_id but mismatched or missing department string
        result = await session.execute(select(User).where(User.department_id.isnot(None)))
        users = result.scalars().all()
        
        updated_count = 0
        for user in users:
            expected_name = depts.get(user.department_id)
            if expected_name and user.department != expected_name:
                print(f"Updating User {user.email}: '{user.department}' -> '{expected_name}'")
                user.department = expected_name
                updated_count += 1
        
        # 3. Find users with "undefined" string and try to fix them
        result = await session.execute(select(User).where(User.department == 'undefined'))
        undefined_users = result.scalars().all()
        for user in undefined_users:
            if not user.department_id:
                print(f"Warning: User {user.email} has 'undefined' department and NO department_id. Setting to None.")
                user.department = None
                updated_count += 1

        if updated_count > 0:
            await session.commit()
            print(f"\nMigration Complete. {updated_count} users synchronized.")
        else:
            print("\nNo users required synchronization.")
        print("--- MIGRATION FINISHED ---")

if __name__ == "__main__":
    asyncio.run(migrate())
