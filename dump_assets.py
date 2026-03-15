import sys
import asyncio
sys.path.append('d:/ASSET-MANAGER/backend')
from app.database.database import get_db_context
from sqlalchemy import text

async def main():
    async with get_db_context() as s:
        res = await s.execute(text("SELECT id, name, type, vendor, serial_number FROM asset.assets ORDER BY created_at DESC LIMIT 5"))
        for r in res.fetchall():
            print(dict(r._mapping))

if __name__ == "__main__":
    asyncio.run(main())
