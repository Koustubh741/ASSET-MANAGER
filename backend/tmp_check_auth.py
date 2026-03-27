import asyncio
from sqlalchemy import select
from app.database import AsyncSessionLocal
from app.models import User
import uuid

async def test_get_current_user():
    print("Connecting to DB...")
    async with AsyncSessionLocal() as db:
        try:
            # Try to fetch ANY user to see if it hangs
            result = await db.execute(select(User).limit(1))
            user = result.scalars().first()
            if user:
                print(f"FOUND USER: {user.full_name}")
            else:
                print("NO USERS FOUND")
        except Exception as e:
            print(f"DB ERROR: {e}")

if __name__ == "__main__":
    asyncio.run(test_get_current_user())
