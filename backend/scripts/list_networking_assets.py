import asyncio
import os
import sys
from sqlalchemy import select

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database.database import AsyncSessionLocal
from app.models.models import Asset

async def list_networking_assets():
    print("[*] Retrieving Networking Assets from Database...")
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(Asset).where(Asset.type.in_(['Networking', 'Switch', 'Router', 'Firewall']))
        )
        assets = result.scalars().all()
        
        if not assets:
            print("[!] No networking assets found in the database.")
            return

        print(f"[+] Found {len(assets)} assets:")
        for asset in assets:
            print(f"    - Name: {asset.name}")
            print(f"      IP: {asset.ip_address}")
            print(f"      Type: {asset.type}")
            print(f"      Status: {asset.status}")
            print("-" * 20)

if __name__ == "__main__":
    asyncio.run(list_networking_assets())
