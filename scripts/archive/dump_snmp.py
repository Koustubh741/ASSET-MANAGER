import sys
import asyncio
sys.path.append('d:/ASSET-MANAGER/backend')
from app.database.database import get_db_context
from sqlalchemy import text

async def main():
    async with get_db_context() as s:
        res = await s.execute(text("SELECT name, type, vendor, serial_number FROM asset.assets WHERE status='Discovered' OR type='Networking' OR type='Network' OR vendor='Unknown' LIMIT 10"))
        for r in res.fetchall():
            print(dict(r._mapping))

if __name__ == "__main__":
    asyncio.run(main())
