
import asyncio
from sqlalchemy.future import select
from app.database.database import AsyncSessionLocal
from app.models.models import Asset, AssetRequest, User, PurchaseOrder
from uuid import uuid4
from datetime import datetime

async def verify_new_user_flow():
    async with AsyncSessionLocal() as db:
        # 1. Create a "Brand New User"
        user_id = uuid4()
        new_user = User(
            id=user_id,
            email=f"tester_{user_id.hex[:4]}@example.com",
            full_name="New Workflow Tester",
            password_hash="fake_hash",
            role="END_USER",
            status="ACTIVE",
            department="Engineering",
            position="TEAM_MEMBER"
        )
        db.add(new_user)
        print(f"Created new user: {new_user.full_name}")

        # 2. Create an Asset Request (Procurement Path)
        request_id = uuid4()
        request = AssetRequest(
            id=request_id,
            requester_id=user_id,
            asset_name="Test Automation Mac",
            asset_type="Laptop",
            asset_ownership_type="COMPANY_OWNED",
            status="PROCUREMENT_REQUESTED",
            procurement_finance_status="APPROVED"
        )
        db.add(request)
        print(f"Created procurement request: {request_id}")
        
        # 3. Create a PO for this request
        po_id = uuid4()
        po = PurchaseOrder(
            id=po_id,
            asset_request_id=request_id,
            uploaded_by=user_id, # Simulated uploader
            po_pdf_path=f"uploads/procurement/dummy_{po_id.hex}.pdf",
            vendor_name="Apple Enterprise",
            total_cost=2500.0,
            status="VALIDATED"
        )
        db.add(po)
        await db.commit()

        # 4. Simulate Delivery Confirmation (This triggers our new fix)
        from app.routers.asset_requests import procurement_confirm_delivery
        from app.schemas.asset_request_schema import DeliveryConfirmationRequest
        
        class MockUser:
            def __init__(self, id, role):
                self.id = id
                self.role = role
        
        admin_user = MockUser(uuid4(), "ADMIN")
        delivery_info = DeliveryConfirmationRequest(
            asset_name="MacBook Pro 16",
            asset_model="M3 Max",
            serial_number=f"SN-{uuid4().hex[:8]}"
        )
        
        print("Confirming delivery (executing the root fix logic)...")
        await procurement_confirm_delivery(
            id=request_id,
            delivery_info=delivery_info,
            db=db,
            current_user=admin_user
        )
        
        # 5. VERIFICATION: Check the newly created Asset
        res = await db.execute(select(Asset).filter(Asset.request_id == request_id))
        created_asset = res.scalars().first()
        
        print("\n--- AUDIT RESULTS ---")
        if created_asset:
            print(f"Asset Created: {created_asset.name}")
            print(f"Status: {created_asset.status} (Expected: Reserved)")
            print(f"Assigned To: {created_asset.assigned_to} (Expected: New Workflow Tester)")
            print(f"Assigned ID: {created_asset.assigned_to_id} (Expected: {user_id})")
            
            if created_asset.status == "Reserved" and created_asset.assigned_to_id == user_id:
                print("\nSUCCESS: Asset is immediately linked and visible to the user!")
            else:
                print("\nFAILURE: Asset linking not correctly applied.")
        else:
            print("\nFAILURE: Asset was not created.")

if __name__ == "__main__":
    asyncio.run(verify_new_user_flow())
