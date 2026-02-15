import asyncio
import os
import sys

# Add the backend directory to sys.path
sys.path.append(os.getcwd())

from app.database.database import AsyncSessionLocal
from app.models.models import User, AssetRequest
from sqlalchemy.future import select

async def debug_it_management():
    async with AsyncSessionLocal() as session:
        # 1. Find IT Management users
        print("\n=== IT MANAGEMENT USERS ===")
        result = await session.execute(
            select(User).filter(User.role == "IT_MANAGEMENT")
        )
        it_users = result.scalars().all()
        
        if not it_users:
            print("[X] No IT Management users found!")
        else:
            for u in it_users:
                print(f"[OK] User: {u.full_name}")
                print(f"   Email: {u.email}")
                print(f"   Role: {u.role}")
                print(f"   Status: {u.status}")
                print(f"   Position: {u.position}")
                print(f"   Department: {u.department}")
                print(f"   ID: {u.id}")
                print()
        
        # 2. Find all MANAGER_APPROVED requests
        print("\n=== MANAGER_APPROVED REQUESTS ===")
        result = await session.execute(
            select(AssetRequest).filter(AssetRequest.status == "MANAGER_APPROVED")
        )
        approved_requests = result.scalars().all()
        
        if not approved_requests:
            print("[X] No MANAGER_APPROVED requests found!")
            print("   This is why IT Management sees nothing.")
        else:
            for r in approved_requests:
                requester = await session.execute(select(User).filter(User.id == r.requester_id))
                req_user = requester.scalars().first()
                
                print(f"[REQUEST] ID: {r.id}")
                print(f"   Asset: {r.asset_name}")
                print(f"   Status: {r.status}")
                print(f"   Requester: {req_user.full_name if req_user else 'Unknown'}")
                print(f"   Created: {r.created_at}")
                print()
        
        # 3. Check all request statuses
        print("\n=== ALL REQUEST STATUSES ===")
        result = await session.execute(select(AssetRequest))
        all_requests = result.scalars().all()
        
        status_counts = {}
        for r in all_requests:
            status_counts[r.status] = status_counts.get(r.status, 0) + 1
        
        for status, count in sorted(status_counts.items()):
            print(f"{status}: {count} requests")

if __name__ == "__main__":
    asyncio.run(debug_it_management())
