
import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

DATABASE_URL = "postgresql+asyncpg://postgres:Koustubh%40123@127.0.0.1:5432/ITSM"

async def check():
    engine = create_async_engine(DATABASE_URL)
    async with engine.connect() as conn:
        print("Running the exact failing query...")
        try:
            sql = """
            SELECT system.notifications.id, system.notifications.user_id, system.notifications.type, system.notifications.title, system.notifications.message, system.notifications.is_read, system.notifications.link, system.notifications.source, system.notifications.created_at, system.notifications.updated_at, system.notifications.read_at 
            FROM system.notifications 
            LIMIT 1
            """
            res = await conn.execute(text(sql))
            row = res.fetchone()
            print(f"Success! Row: {row}")
        except Exception as e:
            print(f"Failed! Error: {e}")

    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(check())
