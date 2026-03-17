import asyncio
from app.database.database import AsyncSessionLocal
from app.models.models import AssetRequest
from sqlalchemy import select

async def check_request_details():
    async with AsyncSessionLocal() as db:
        print("=" * 60)
        print("CHECKING MANAGER_APPROVED REQUEST DETAILS")
        print("=" * 60)
        
        # Get the MANAGER_APPROVED request
        res = await db.execute(
            select(AssetRequest)
            .filter(AssetRequest.status == 'MANAGER_APPROVED')
        )
        req = res.scalars().first()
        
        if req:
            print(f"\nRequest ID: {req.id}")
            print(f"Asset Type: {req.asset_type}")
            print(f"Status: {req.status}")
            print(f"Asset Name: {req.asset_name}")
            print(f"Requester ID: {req.requester_id}")
            print(f"Business Justification: {req.business_justification}")
            print(f"Created At: {req.created_at}")
            print(f"\nManager Approvals: {req.manager_approvals}")
            print(f"IT Reviewed By: {req.it_reviewed_by}")
            print(f"IT Reviewed At: {req.it_reviewed_at}")
        else:
            print("No MANAGER_APPROVED request found")

if __name__ == "__main__":
    asyncio.run(check_request_details())
