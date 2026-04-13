import asyncio
import uuid
from sqlalchemy import select
from app.database.database import AsyncSessionLocal
from app.models.models import User, AssetRequest

async def debug_visibility():
    async with AsyncSessionLocal() as db:
        print("\n=== DEBUGGING MANAGER VISIBILITY ===\n")
        
        # 1. Check Manager
        mgr_email = "it_mgr@enterprise.com"
        res = await db.execute(select(User).filter(User.email == mgr_email))
        mgr = res.scalars().first()
        if mgr:
            print(f"Manager: {mgr.full_name} ({mgr.email})")
            print(f"  Role: {mgr.role}")
            print(f"  Position: {mgr.position}")
            print(f"  Department: {mgr.department}")
            print(f"  Domain: {mgr.domain}")
            print(f"  Dept Obj: {mgr.department_id}")
        else:
            print(f"Manager {mgr_email} not found!")

        # 2. Check Requester
        req_email = "it_staff@itsm.com"
        res = await db.execute(select(User).filter(User.email == req_email))
        requester = res.scalars().first()
        if requester:
            print(f"\nRequester: {requester.full_name} ({requester.email})")
            print(f"  Department: {requester.department}")
            print(f"  Domain: {requester.domain}")
        else:
            print(f"Requester {req_email} not found!")

        # 3. Check Asset Requests
        res = await db.execute(select(AssetRequest).filter(AssetRequest.requester_id == requester.id if requester else None))
        reqs = res.scalars().all()
        print(f"\nTotal requests from {req_email}: {len(reqs)}")
        for r in reqs:
            print(f"  ID: {r.id} | Status: {r.status} | Asset: {r.asset_name}")

if __name__ == "__main__":
    asyncio.run(debug_visibility())
