import asyncio
from sqlalchemy import text
from app.database.database import AsyncSessionLocal

async def main():
    async with AsyncSessionLocal() as session:
        result = await session.execute(text("""
            SELECT id, name, type, vendor, model, serial_number, created_at
            FROM asset.assets
            ORDER BY created_at DESC
            LIMIT 10
        """))
        for row in result.fetchall():
            print(dict(row._mapping))

if __name__ == "__main__":
    asyncio.run(main())
