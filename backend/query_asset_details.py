import asyncio
from sqlalchemy import text
from app.database.database import AsyncSessionLocal
import json

async def main():
    async with AsyncSessionLocal() as session:
        result = await session.execute(text("""
            SELECT *
            FROM asset.assets
            WHERE id = '420fffc0-4c6f-40ef-a170-a55b114e3791'
        """))
        row = result.fetchone()
        if row:
            d = dict(row._mapping)
            for k, v in d.items():
                print(f"{k}: {v}")

if __name__ == "__main__":
    asyncio.run(main())
