import asyncio
import sys
import os
from sqlalchemy import select, update
from datetime import datetime, timezone

# Add backend root to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database.database import AsyncSessionLocal
from app.models.models import Company, Department, User, Asset, Ticket, AssetRequest
from app.utils.uuid_gen import get_uuid

async def execute_backfill():
    print("==================================================")
    print("  MULTI-TENANT LEGACY DATA BACKFILL SCRIPT")
    print("==================================================")
    
    async with AsyncSessionLocal() as db:
        # 1. Ensure Master Company Exists
        result = await db.execute(select(Company).limit(1))
        master_company = result.scalars().first()
        
        if not master_company:
            print("[INFO] No Company found. Generating Master Company...")
            master_company = Company(
                id=get_uuid(),
                name="Headquarters",
                timezone="UTC",
                currency="USD",
                locale="en",
                setup_completed_at=datetime.now(timezone.utc)
            )
            db.add(master_company)
            await db.commit()
            await db.refresh(master_company)
            print(f"[OK] Master Company created: {master_company.id}")
        else:
            print(f"[OK] Master Company identified: {master_company.name} ({master_company.id})")

        master_id = master_company.id
        
        # 2. Backfill Departments
        print("\n[INFO] Backfilling Departments...")
        result = await db.execute(select(Department).where(Department.company_id == None))
        depts = result.scalars().all()
        for dept in depts:
            dept.company_id = master_id
        await db.commit()
        print(f"       -> Processed {len(depts)} Departments")

        # 3. Backfill Users
        print("\n[INFO] Backfilling Users...")
        result = await db.execute(select(User).where(User.company_id == None))
        users = result.scalars().all()
        for user in users:
            user.company_id = master_id
        await db.commit()
        print(f"       -> Processed {len(users)} Users")

        # 4. Backfill Assets
        print("\n[INFO] Backfilling Assets...")
        result = await db.execute(select(Asset).where(Asset.company_id == None))
        assets = result.scalars().all()
        for asset in assets:
            asset.company_id = master_id
        await db.commit()
        print(f"       -> Processed {len(assets)} Assets")

        # 5. Backfill Tickets
        print("\n[INFO] Backfilling Tickets...")
        result = await db.execute(select(Ticket).where(Ticket.company_id == None))
        tickets = result.scalars().all()
        for t in tickets:
            t.company_id = master_id
        await db.commit()
        print(f"       -> Processed {len(tickets)} Tickets")

        # 6. Backfill AssetRequests
        print("\n[INFO] Backfilling Asset Requests...")
        result = await db.execute(select(AssetRequest).where(AssetRequest.company_id == None))
        requests = result.scalars().all()
        for req in requests:
            req.company_id = master_id
        await db.commit()
        print(f"       -> Processed {len(requests)} Asset Requests")

        print("==================================================")
        print("  BACKFILL COMPLETE.")
        print("==================================================")

if __name__ == "__main__":
    sys.stdout.reconfigure(encoding='utf-8')
    asyncio.run(execute_backfill())
