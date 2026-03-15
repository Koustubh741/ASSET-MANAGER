import asyncio
import uuid
import sys
import os

# Add backend to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database.database import AsyncSessionLocal
from app.models.models import PurchaseOrder, AssetRequest, User
from sqlalchemy import select

async def seed_procurement():
    async with AsyncSessionLocal() as db:
        # Get itsm manager for uploaded_by
        res = await db.execute(select(User).where(User.email == "it_manager@itsm.com"))
        user = res.scalars().first()
        if not user:
            print("it_manager@itsm.com not found")
            return

        # Get an asset request or create a dummy one
        res_req = await db.execute(select(AssetRequest).limit(1))
        req = res_req.scalars().first()
        if not req:
            # Create a dummy request
            req = AssetRequest(
                requester_id=user.id,
                asset_name="MacBook Pro 16",
                asset_type="Laptop",
                status="IT_APPROVED"
            )
            db.add(req)
            await db.commit()
            await db.refresh(req)

        # Create POs
        pos = [
            PurchaseOrder(
                asset_request_id=req.id,
                uploaded_by=user.id,
                po_pdf_path="/mock/po1.pdf",
                vendor_name="Apple Inc",
                total_cost=2499.0,
                status="UPLOADED"
            ),
            PurchaseOrder(
                asset_request_id=req.id,
                uploaded_by=user.id,
                po_pdf_path="/mock/po2.pdf",
                vendor_name="Dell Technologies",
                total_cost=1299.0,
                status="PENDING"
            )
        ]
        db.add_all(pos)
        await db.commit()
        print(f"Seeded {len(pos)} Purchase Orders.")

if __name__ == "__main__":
    import os
    import sys
    sys.path.append(os.getcwd())
    asyncio.run(seed_procurement())
