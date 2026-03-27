import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text

DATABASE_URL = "postgresql+asyncpg://postgres:Koustubh%40123@127.0.0.1:5432/ITSM"

async def check_prefs():
    engine = create_async_engine(DATABASE_URL)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    target_user_id = "8fe42571-d0df-4028-ac04-80db5b4adc5d"
    
    async with async_session() as db:
        print(f"Checking for user_preferences for user_id: {target_user_id}")
        result = await db.execute(text("SELECT * FROM auth.user_preferences WHERE user_id = :uid"), {"uid": target_user_id})
        prefs = result.fetchone()
        if prefs:
            print(f"Preferences Found: {dict(prefs._mapping)}")
        else:
            print("Preferences NOT Found.")

if __name__ == "__main__":
    asyncio.run(check_prefs())
