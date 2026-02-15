import asyncio
from app.database.database import AsyncSessionLocal
from app.models.models import SoftwareLicense, DiscoveredSoftware
from sqlalchemy.future import select

async def check():
    async with AsyncSessionLocal() as db:
        lic_result = await db.execute(select(SoftwareLicense))
        disc_result = await db.execute(select(DiscoveredSoftware))
        
        licenses = lic_result.scalars().all()
        discovered = disc_result.scalars().all()
        
        print(f"TOTAL_LICENSES: {len(licenses)}")
        print(f"TOTAL_DISCOVERED: {len(discovered)}")
        
        for l in licenses[:3]:
            print(f"LIC: {l.name} ({l.vendor})")
        for d in discovered[:3]:
            print(f"DISC: {d.name} ({d.vendor})")

if __name__ == '__main__':
    asyncio.run(check())
