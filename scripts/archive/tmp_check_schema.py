
import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

DATABASE_URL = "postgresql+asyncpg://postgres:Koustubh%40123@127.0.0.1:5432/ITSM"

async def check():
    engine = create_async_engine(DATABASE_URL)
    async with engine.connect() as conn:
        print("Checking notifications table...")
        res = await conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_schema = 'system' AND table_name = 'notifications'"))
        cols = [r[0] for r in res.all()]
        print(f"Notifications columns: {cols}")
        
        print("\nChecking tickets table...")
        res = await conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_schema = 'support' AND table_name = 'tickets'"))
        cols = [r[0] for r in res.all()]
        print(f"Tickets columns: {cols}")

        print("\nChecking users table...")
        res = await conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_schema = 'auth' AND table_name = 'users'"))
        cols = [r[0] for r in res.all()]
        print(f"Users columns: {cols}")

    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(check())
