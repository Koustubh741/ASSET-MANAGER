import asyncio
import uuid
from sqlalchemy import select
from app.database.database import AsyncSessionLocal
from app.models.models import User, AssetRequest

async def ensure_request():
    async with AsyncSessionLocal() as db:
        print("\n=== ENSURING PENDING REQUEST ===\n")
        
        # 1. Get Requester
        res = await db.execute(select(User).filter(User.email == "it_staff@itsm.com"))
        requester = res.scalars().first()
        if not requester:
            print("Requester not found!")
            return

        # 2. Check for existing SUBMITTED request
        res = await db.execute(select(AssetRequest).filter(
            AssetRequest.requester_id == requester.id,
            AssetRequest.status == "SUBMITTED"
        ))
        req = res.scalars().first()
        
        if req:
            print(f"Found existing request: {req.id}")
        else:
            # Create a new one for testing
            reg_req = AssetRequest(
                id=uuid.uuid4(),
                requester_id=requester.id,
                asset_name="MacBook Pro 16",
                asset_type="Laptop",
                asset_ownership_type="COMPANY_OWNED",
                justification="Engineering work",
                business_justification="Required for high-fidelity coding tasks",
                specifications={"RAM": "64GB", "CPU": "M3 Max"},
                status="SUBMITTED",
                current_owner_role="MANAGER"
            )
            db.add(reg_req)
            await db.commit()
            print(f"Created new test request: {reg_req.id}")

if __name__ == "__main__":
    asyncio.run(ensure_request())
