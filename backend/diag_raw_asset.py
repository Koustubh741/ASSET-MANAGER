import asyncio
from sqlalchemy import text
from app.database.database import get_db

async def check_raw_asset():
    async for db in get_db():
        result = await db.execute(text("SELECT * FROM asset.assets LIMIT 1"))
        row = result.fetchone()
        if row:
            print("Raw Asset Data:")
            for key in row._mapping.keys():
                print(f"  {key}: {row._mapping[key]}")
        else:
            print("No assets found in asset.assets")
        break

if __name__ == "__main__":
    asyncio.run(check_raw_asset())
