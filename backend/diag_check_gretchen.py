"""
Diagnostic: Check Gretchen's user details.
"""
import asyncio
import os, sys
sys.path.insert(0, os.path.dirname(__file__))

from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select
from app.models.models import User

DATABASE_URL = os.getenv("DATABASE_URL")
if DATABASE_URL and DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://", 1)

engine = create_async_engine(DATABASE_URL)
async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

async def check_user():
    async with async_session() as db:
        # Gretchen's email from the prompt earlier: it_staff@itsm.com (or similar)
        # ID is 7c37b28c-3b0c-41c5-8211-6343e973a7ef
        res = await db.execute(select(User).where(User.id == "7c37b28c-3b0c-41c5-8211-6343e973a7ef"))
        user = res.scalar_one_or_none()
        if user:
            print(f"User: {user.full_name}")
            print(f"Role: {user.role}")
            print(f"Position: {user.position}")
            print(f"Department: {user.department}")
            print(f"Domain: {user.domain}")
        else:
            print("User not found.")

if __name__ == "__main__":
    asyncio.run(check_user())
