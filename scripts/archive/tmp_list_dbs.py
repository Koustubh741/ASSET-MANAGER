
import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

DATABASE_URL = "postgresql+asyncpg://postgres:Koustubh%40123@127.0.0.1:5432/postgres"

async def check():
    engine = create_async_engine(DATABASE_URL)
    async with engine.connect() as conn:
        print("Listing databases...")
        res = await conn.execute(text("SELECT datname FROM pg_database WHERE datistemplate = false"))
        dbs = [r[0] for r in res.all()]
        print(f"Databases: {dbs}")

    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(check())
