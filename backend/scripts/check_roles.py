
import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

DB_URL = "postgresql+asyncpg://postgres:Koustubh%40123@127.0.0.1:5432/ITSM"

async def check_roles():
    engine = create_async_engine(DB_URL)
    async with engine.connect() as conn:
        result = await conn.execute(text("SELECT role, COUNT(*) FROM auth.users GROUP BY role ORDER BY count DESC;"))
        rows = result.fetchall()
        print("\n--- Current Roles in Database ---")
        for role, count in rows:
            print(f"{role}: {count}")
        print("---------------------------------\n")
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(check_roles())
