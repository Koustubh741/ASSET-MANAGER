import asyncio
import sys
import os

# Add the project root to sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from sqlalchemy.ext.asyncio import AsyncSession
from app.database.database import AsyncSessionLocal
from app.models.models import User
from sqlalchemy.future import select

async def run_fix():
    async with AsyncSessionLocal() as db:
        print("Starting CEO Role & Department Fix...")
        
        # Find users with role CEO or persona CEO
        query = select(User).filter((User.role == "CEO") | (User.persona == "CEO") | (User.email == "ceo@itsm.com"))
        result = await db.execute(query)
        users = result.scalars().all()
        
        count = 0
        for user in users:
            print(f"Found CEO User: {user.email}")
            user.role = "ADMIN"
            user.department = "Executive"
            user.domain = "ADMINISTRATION"
            count += 1
            print(f" -> Updated to ADMIN | Executive | ADMINISTRATION")
            
        if count > 0:
            await db.commit()
            print(f"Successfully fixed {count} CEO records in the database.")
        else:
            print("No matching CEO users found.")

if __name__ == "__main__":
    asyncio.run(run_fix())
