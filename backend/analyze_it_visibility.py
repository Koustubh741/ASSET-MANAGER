import asyncio
import os
import sys

sys.path.append(os.getcwd())

from app.database.database import AsyncSessionLocal
from app.models.models import User, AssetRequest
from sqlalchemy.future import select

async def analyze_it_visibility():
    async with AsyncSessionLocal() as session:
        print("\n=== ROOT CAUSE ANALYSIS: IT Management Visibility ===\n")
        
        # 1. Check IT Management users and their status
        result = await session.execute(
            select(User).filter(User.role == "IT_MANAGEMENT", User.status == "ACTIVE")
        )
        active_it_users = result.scalars().all()
        print(f"Active IT Management Users: {len(active_it_users)}")
        if active_it_users:
            print(f"Example: {active_it_users[0].full_name} ({active_it_users[0].email})")
        
        # 2. Check MANAGER_APPROVED requests
        result = await session.execute(
            select(AssetRequest).filter(AssetRequest.status == "MANAGER_APPROVED")
        )
        manager_approved = result.scalars().all()
        print(f"\nMANAGER_APPROVED Requests: {len(manager_approved)}")
        
        if manager_approved:
            for req in manager_approved:
                requester = await session.execute(select(User).filter(User.id == req.requester_id))
                req_user = requester.scalars().first()
                print(f"\n  Request: {req.asset_name}")
                print(f"  ID: {req.id}")
                print(f"  Status: {req.status}")
                print(f"  Asset Type: {req.asset_type}")
                print(f"  Requester: {req_user.full_name if req_user else 'Unknown'}")
                print(f"  Created: {req.created_at}")
        
        # 3. Check what the frontend SHOULD see
        print("\n=== EXPECTED FRONTEND BEHAVIOR ===")
        print("1. AssetContext fetches requests from API")
        print("2. Status 'MANAGER_APPROVED' should NOT be mapped (stays as-is)")
        print("3. deriveOwnerRole('MANAGER_APPROVED', assetType, stage) should return 'IT_MANAGEMENT'")
        print("4. ITSupportDashboard filters: r.currentOwnerRole === 'IT_MANAGEMENT'")
        print("5. Request should appear in 'Incoming Requests' section")
        
        # 4. Check if IT users can access the endpoint
        print("\n=== API ACCESS CHECK ===")
        print("IT Management users should be able to call:")
        print("  GET /api/v1/asset-requests")
        print("  - No department/domain filter needed (they see all)")
        print("  - Role: IT_MANAGEMENT")
        
        # 5. Identify potential issues
        print("\n=== POTENTIAL ROOT CAUSES ===")
        if not active_it_users:
            print("[X] ISSUE: No active IT Management users found")
        else:
            print("[OK] Active IT Management users exist")
        
        if not manager_approved:
            print("[X] ISSUE: No MANAGER_APPROVED requests in database")
        else:
            print("[OK] MANAGER_APPROVED requests exist")
        
        print("\n=== MOST LIKELY ROOT CAUSE ===")
        print("The IT Management user's role might not be properly recognized by AssetContext.")
        print("Checking if the role slug matches the filtering logic...")
        
        # Check role slug
        if active_it_users:
            it_user = active_it_users[0]
            print(f"\nIT User Role: {it_user.role}")
            print(f"Expected in AssetContext: currentRole?.slug === 'IT_MANAGEMENT'")
            if it_user.role == "IT_MANAGEMENT":
                print("[OK] Role matches!")
            else:
                print(f"[X] MISMATCH: Database has '{it_user.role}' but code expects 'IT_MANAGEMENT'")

if __name__ == "__main__":
    asyncio.run(analyze_it_visibility())
