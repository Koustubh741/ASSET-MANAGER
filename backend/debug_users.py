import asyncio
from app.database.database import AsyncSessionLocal
from app.models.models import User
from sqlalchemy.future import select

async def check_user():
    async with AsyncSessionLocal() as session:
        # Check Gretchen
        res = await session.execute(select(User).where(User.email == 'it_staff@itsm.com'))
        user = res.scalars().first()
        print(f"--- GRETCHEN BODINSKI ---")
        if user:
            print(f"ID: {user.id}")
            print(f"Email: {user.email}")
            print(f"Status: {user.status}")
            print(f"Role: {user.role}")
            print(f"Password Hash: {user.password_hash}")
        else:
            print("User not found: it_staff@itsm.com")

        # Check Katrina
        res2 = await session.execute(select(User).where(User.email == 'katrina.b@itsm.com'))
        user2 = res2.scalars().first()
        print(f"\n--- KATRINA BENNETT ---")
        if user2:
            print(f"ID: {user2.id}")
            print(f"Email: {user2.email}")
            print(f"Status: {user2.status}")
            print(f"Role: {user2.role}")
            print(f"Password Hash: {user2.password_hash}")
        else:
            print("User not found: katrina.b@itsm.com")

if __name__ == "__main__":
    asyncio.run(check_user())
