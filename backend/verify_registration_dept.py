import asyncio
import os
import sys
import uuid

# Add the backend directory to sys.path
sys.path.append(os.getcwd())

from app.database.database import AsyncSessionLocal
from app.services.user_service import create_user
from app.schemas.user_schema import UserCreate
from sqlalchemy.future import select
from app.models.models import User

async def test_reg():
    async with AsyncSessionLocal() as session:
        # 1. Create a test user with Engineering dept
        email = f"test_{uuid.uuid4().hex[:8]}@example.com"
        user_in = UserCreate(
            email=email,
            password="password123",
            full_name="Test Dept User",
            department="Engineering",
            domain="Data/AI",
            role="END_USER",
            status="ACTIVE"
        )
        
        print(f"Creating user with dept: {user_in.department}")
        db_user = await create_user(session, user_in)
        print(f"User created. DB ID: {db_user.id}")
        
        # 2. Verify in DB
        result = await session.execute(select(User).filter(User.email == email))
        verified_user = result.scalars().first()
        print(f"Verified Department in DB: {verified_user.department}")
        
        if verified_user.department == "Engineering":
            print("SUCCESS: Department saved correctly!")
        else:
            print(f"FAILURE: Department in DB is {verified_user.department}")

if __name__ == "__main__":
    asyncio.run(test_reg())
