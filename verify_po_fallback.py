import asyncio
import uuid
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import sys
import os

# Mock paths
sys.path.append('backend')
from backend.app.database.database import AsyncSessionLocal, async_engine
from backend.app.models.models import AssetRequest, PurchaseOrder
from backend.app.services.procurement_service import handle_po_upload

async def verify_fallback():
    async with AsyncSessionLocal() as db:
        # 1. Create a dummy asset request
        request_id = uuid.uuid4()
        requester_id = uuid.uuid4()
        new_request = AssetRequest(
            id=request_id,
            requester_id=requester_id,
            asset_name="Test Laptop",
            asset_type="LAPTOP",
            asset_vendor="Apple Inc.",
            cost_estimate=150000.0,
            status="PROCUREMENT_REQUESTED",
            justification="Verification"
        )
        db.add(new_request)
        await db.commit()
        
        print(f"Created AssetRequest: {request_id}")
        
        # 2. Upload "minimal" PO (will cause extraction "failure")
        po_path = "d:/ASSET-MANAGER/backend/uploads/procurement/PO_minimal_test.pdf"
        if not os.path.exists(os.path.dirname(po_path)):
            os.makedirs(os.path.dirname(po_path))
        with open(po_path, "w") as f:
            f.write("%PDF-1.4\n%%EOF")
            
        print(f"Created minimal PO PDF: {po_path}")
        
        # 3. Handle upload
        uploader_id = uuid.uuid4()
        po = await handle_po_upload(db, request_id, uploader_id, po_path)
        
        print(f"PO Created: {po.id}")
        print(f"Extracted Vendor: {po.vendor_name}")
        print(f"Extracted Cost: {po.total_cost}")
        
        # 4. Assertions
        assert po.vendor_name == "Apple Inc.", f"Expected Apple Inc., got {po.vendor_name}"
        assert po.total_cost == 150000.0, f"Expected 150000.0, got {po.total_cost}"
        print("\nVerification Successful: Fallback logic worked correctly!")

if __name__ == "__main__":
    asyncio.run(verify_fallback())
