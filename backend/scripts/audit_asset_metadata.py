import asyncio
import os
import sys

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), "backend"))

from app.database.database import AsyncSessionLocal
from app.models.models import Asset
from sqlalchemy import select

async def search_all():
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Asset))
        rows = result.scalars().all()
        print(f"[*] Auditing {len(rows)} assets for networking metadata...")
        for row in rows:
            if not row.specifications:
                continue
            
            s = row.specifications
            # Look for indicators of SNMP discovery or real IPs
            indicators = ['snmp', 'v3', 'discovery', 'ip', 'gateway', 'mask']
            found = False
            for k, v in s.items():
                if any(ind in str(k).lower() or ind in str(v).lower() for ind in indicators):
                    found = True
                    break
            
            if found or row.type == "Networking":
                print(f"  Asset: {row.name} ({row.type})")
                import json
                print(f"    Specs: {json.dumps(s, ensure_ascii=True)}")

if __name__ == "__main__":
    asyncio.run(search_all())
