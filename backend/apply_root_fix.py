
import asyncio
from sqlalchemy.future import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.database.database import AsyncSessionLocal
from app.models.models import Asset, AssetRequest, User

async def apply_root_fix():
    async with AsyncSessionLocal() as db:
        # 1. Find all requests that have an asset assigned but are pending finalization
        query = select(AssetRequest).filter(
            AssetRequest.asset_id.isnot(None),
            AssetRequest.status.in_(["USER_ACCEPTANCE_PENDING", "MANAGER_CONFIRMED_ASSIGNMENT", "FULFILLED"])
        )
        result = await db.execute(query)
        requests = result.scalars().all()
        
        print(f"Applying Root Fix to {len(requests)} requests...")
        
        for req in requests:
            # Get the user
            u_query = select(User).filter(User.id == req.requester_id)
            u_result = await db.execute(u_query)
            user = u_result.scalars().first()
            
            if not user:
                print(f"  Error: User {req.requester_id} not found for request {req.id}")
                continue
                
            # Get the asset
            a_query = select(Asset).filter(Asset.id == req.asset_id)
            a_result = await db.execute(a_query)
            asset = a_result.scalars().first()
            
            if not asset:
                print(f"  Error: Asset {req.asset_id} not found for request {req.id}")
                continue
            
            print(f"  Updating Asset {asset.id} for user '{user.full_name}'")
            print(f"    Current Status: {asset.status}, Current Assigned To: {asset.assigned_to}")
            
            # Update fields
            asset.assigned_to = user.full_name
            asset.assigned_to_id = user.id
            
            # If request is FULFILLED, status should be 'In Use'
            if req.status == "FULFILLED":
                asset.status = "In Use"
            else:
                # Otherwise it's 'Reserved' (Visible to user)
                asset.status = "Reserved"
            
            print(f"    New Status: {asset.status}, New Assigned To: {asset.assigned_to}")

        await db.commit()
        print("\nRoot Fix applied successfully!")

if __name__ == "__main__":
    asyncio.run(apply_root_fix())
