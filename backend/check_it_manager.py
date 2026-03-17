import asyncio
from app.database.database import AsyncSessionLocal
from app.models.models import User, AssetRequest
from sqlalchemy import select

async def check_it_manager():
    async with AsyncSessionLocal() as db:
        # Check IT manager user
        print("=" * 60)
        print("IT MANAGER USER CHECK")
        print("=" * 60)
        
        res = await db.execute(select(User).filter(User.email == 'it_manager@itsm.com'))
        user = res.scalars().first()
        
        if user:
            print(f"User Found: {user.full_name}")
            print(f"  Email: {user.email}")
            print(f"  Role: {user.role}")
            print(f"  Position: {user.position}")
            print(f"  Department: {user.department}")
            print(f"  Domain: {user.domain}")
            print(f"  Status: {user.status}")
        else:
            print("IT Manager user NOT FOUND!")
            return
        
        # Check requests that should be visible
        print("\n" + "=" * 60)
        print("REQUESTS THAT SHOULD BE VISIBLE TO IT MANAGER")
        print("=" * 60)
        
        # Get all MANAGER_APPROVED requests
        res = await db.execute(
            select(AssetRequest)
            .filter(AssetRequest.status == 'MANAGER_APPROVED')
            .order_by(AssetRequest.created_at.desc())
        )
        manager_approved = res.scalars().all()
        
        print(f"\nMANAGER_APPROVED requests: {len(manager_approved)}")
        for req in manager_approved[:5]:  # Show first 5
            print(f"  - ID: {req.id}")
            print(f"    Type: {req.asset_type}")
            print(f"    Status: {req.status}")
            print(f"    Requester: {req.requester_id}")
            print(f"    Created: {req.created_at}")
            print()
        
        # Get all IT_APPROVED requests
        res = await db.execute(
            select(AssetRequest)
            .filter(AssetRequest.status == 'IT_APPROVED')
            .order_by(AssetRequest.created_at.desc())
        )
        it_approved = res.scalars().all()
        
        print(f"\nIT_APPROVED requests: {len(it_approved)}")
        for req in it_approved[:5]:  # Show first 5
            print(f"  - ID: {req.id}")
            print(f"    Type: {req.asset_type}")
            print(f"    Status: {req.status}")
            print(f"    Requester: {req.requester_id}")
            print(f"    Created: {req.created_at}")
            print()
        
        # Check all requests by status
        print("\n" + "=" * 60)
        print("REQUEST STATUS SUMMARY")
        print("=" * 60)
        
        res = await db.execute(select(AssetRequest))
        all_requests = res.scalars().all()
        
        status_counts = {}
        for req in all_requests:
            status_counts[req.status] = status_counts.get(req.status, 0) + 1
        
        for status, count in sorted(status_counts.items()):
            print(f"  {status}: {count}")

if __name__ == "__main__":
    asyncio.run(check_it_manager())
