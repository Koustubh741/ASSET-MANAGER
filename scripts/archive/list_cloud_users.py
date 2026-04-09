import asyncio
import os
import sys
from sqlalchemy.future import select
from sqlalchemy.orm import joinedload

# Add backend to sys.path
base_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.append(os.path.join(base_dir, 'backend'))

from app.database.database import AsyncSessionLocal
from app.models.models import User, Department

async def list_users():
    async with AsyncSessionLocal() as db:
        # Scan all users with department info
        res = await db.execute(
            select(User)
            .options(joinedload(User.dept_obj))
        )
        users = res.scalars().all()
        
        print(f"--- Users in Cloud Operations Department ---")
        count = 0
        for u in users:
            dept_name = u.dept_obj.name if u.dept_obj else u.department
            if dept_name and "Cloud Operations" in dept_name:
                print(f"Name: {u.full_name}")
                print(f"Email: {u.email}")
                print(f"Dept: {dept_name}")
                print("-" * 20)
                count += 1
        
        if count == 0:
            print("No users found in Cloud Operations.")
            # List 5 random users to see the structure
            print("\nSample Users:")
            for u in users[:5]:
                print(f" - {u.email} ({u.department})")

if __name__ == "__main__":
    asyncio.run(list_users())
