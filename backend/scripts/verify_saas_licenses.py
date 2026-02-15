import asyncio
import sys
import os
from sqlalchemy.future import select
from sqlalchemy.ext.asyncio import AsyncSession

# Add backend to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

try:
    from app.database.database import AsyncSessionLocal
    from app.models.models import SoftwareLicense
except ImportError:
    sys.path.append(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
    from app.database.database import AsyncSessionLocal
    from app.models.models import SoftwareLicense

async def verify_saas_licenses():
    print("[*] Verifying SaaS Licenses in Database...")
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(SoftwareLicense).order_by(SoftwareLicense.vendor))
        licenses = result.scalars().all()
        
        if not licenses:
            print("[!] No SaaS licenses found in database.")
            return

        print(f"[+] Found {len(licenses)} licenses:")
        print(f"{'Vendor':<15} | {'License Name':<35} | {'Seats':<10} | {'Cost':<10} | {'Status':<10}")
        print("-" * 90)
        for lic in licenses:
            print(f"{lic.vendor:<15} | {lic.name:<35} | {lic.seat_count:<10} | {lic.cost:<10} | {lic.status:<10}")

if __name__ == "__main__":
    asyncio.run(verify_saas_licenses())
