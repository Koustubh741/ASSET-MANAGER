import asyncio
import sys
import os
from sqlalchemy import text

# Add backend to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

try:
    from app.database.database import async_engine
except ImportError:
    sys.path.append(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
    from app.database.database import async_engine

async def migrate_software():
    print("[*] Migrating software_licenses table...")
    async with async_engine.begin() as conn:
        try:
            await conn.execute(text('ALTER TABLE asset.software_licenses ADD COLUMN IF NOT EXISTS is_discovered BOOLEAN DEFAULT FALSE'))
            print("[+] Added is_discovered column to software_licenses")
        except Exception as e:
            print(f"[!] Migration error: {e}")

if __name__ == "__main__":
    asyncio.run(migrate_software())
