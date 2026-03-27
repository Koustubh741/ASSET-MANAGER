import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text
import uuid

DATABASE_URL = "postgresql+asyncpg://postgres:Koustubh%40123@127.0.0.1:5432/ITSM"

async def check_user():
    engine = create_async_engine(DATABASE_URL)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    target_user_id = "8fe42571-d0df-4028-ac04-80db5b4adc5d"
    
    async with async_session() as db:
        print(f"Checking for user_id: {target_user_id}")
        result = await db.execute(text("SELECT id, email, role FROM auth.users WHERE id = :uid"), {"uid": target_user_id})
        user = result.fetchone()
        if user:
            print(f"User Found: {user}")
        else:
            print("User NOT Found.")
            
        print("\nListing all users in auth.users:")
        result = await db.execute(text("SELECT id, email, role FROM auth.users"))
        for row in result:
            print(row)

if __name__ == "__main__":
    asyncio.run(check_user())
