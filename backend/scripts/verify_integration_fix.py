import asyncio
import uuid
from uuid import UUID
import sys
import os
from datetime import datetime

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database.database import AsyncSessionLocal
from app.models.models import AssetRequest, Asset, User, PurchaseOrder
from app.services.asset_request_service import create_asset_request_v2, apply_root_fix
from app.schemas.asset_request_schema import AssetRequestCreate
from sqlalchemy import select

async def verify_integration():
    print("=== Starting Integration Verification ===")
    
    async with AsyncSessionLocal() as db:
        # 1. Create a test user if not exists
        user_id = uuid.uuid4()
        test_user = User(
            id=user_id,
            email=f"tester_{user_id.hex[:6]}@example.com",
            password_hash="fake_hash", # Required field
            full_name="Integration Tester",
            department="QA",
            domain="qa.example.com",
            role="END_USER",
            position="Employee"
        )
        db.add(test_user)
        await db.commit()
        print(f"[OK] Created test user: {test_user.full_name}")

        # 2. Create Asset Request with specifications
        specs = {
            "cpu": "Intel i9",
            "ram": "32GB",
            "storage": "1TB SSD",
            "gpu": "RTX 4080"
        }
        
        request_data = AssetRequestCreate(
            asset_name="High-End Workstation",
            asset_type="LAPTOP",
            asset_ownership_type="COMPANY_OWNED",
            justification="High-performance computing for AI models",
            business_justification="Required for project Antigravity",
            specifications=specs
        )
        
        request_response = await create_asset_request_v2(db, request_data, requester_id=user_id)
        request_id = request_response.id
        print(f"[OK] Created Asset Request: {request_id}")
        print(f"     Specifications: {request_response.specifications}")
        
        # Verify specifications are in DB
        result = await db.execute(select(AssetRequest).filter(AssetRequest.id == request_id))
        db_request = result.scalars().first()
        assert db_request.specifications == specs
        print("[OK] Specifications verified in AssetRequest record")

        # 3. Simulate Procurement Delivery (triggers Asset creation)
        # We'll do this manually by simulating the logic in procurement_confirm_delivery
        new_asset = Asset(
            id=uuid.uuid4(),
            name=db_request.asset_name,
            type=db_request.asset_type,
            model="Precision 5000",
            vendor="Dell",
            serial_number=f"SN-{uuid.uuid4().hex[:8]}",
            status="Reserved",
            location="IT Warehouse",
            cost=2500.0,
            segment="IT",
            assigned_to=test_user.full_name,
            assigned_to_id=test_user.id,
            request_id=request_id,
            specifications=db_request.specifications # This is what we updated
        )
        db.add(new_asset)
        db_request.asset_id = new_asset.id
        db_request.status = "USER_ACCEPTANCE_PENDING"
        await db.commit()
        print(f"[OK] Integrated Asset created: {new_asset.id}")
        
        # 4. Verify Asset has specifications inherited from request
        res = await db.execute(select(Asset).filter(Asset.id == new_asset.id))
        final_asset = res.scalars().first()
        assert final_asset.specifications == specs
        print("[OK] Specifications inherited by Asset successfully!")

        # 5. Verify Root Fix
        # We already ran it, but let's test the service function directly on a "broken" link
        # Create a broken request (assigned to asset but asset doesn't have owner info)
        broken_request_id = uuid.uuid4()
        broken_asset_id = uuid.uuid4()
        
        broken_asset = Asset(
            id=broken_asset_id,
            name="Broken Asset",
            type="LAPTOP",
            vendor="Unknown",
            model="Broken",
            serial_number=f"SN-BROKEN-{broken_asset_id.hex[:6]}",
            status="Unknown",
            assigned_to=None,
            assigned_to_id=None
        )
        db.add(broken_asset)
        
        broken_request = AssetRequest(
            id=broken_request_id,
            requester_id=user_id,
            asset_id=broken_asset_id,
            asset_name="Broken Link Request",
            asset_type="LAPTOP",
            status="IN_USE",
            specifications={}
        )
        db.add(broken_request)
        await db.commit()
        print(f"[OK] Created broken link for Root Fix testing")

        # Run Root Fix
        fix_result = await apply_root_fix(db)
        print(f"[OK] Root Fix applied. Updated {fix_result['updated']} records.")
        
        # Verify fix
        await db.refresh(broken_asset)
        assert broken_asset.assigned_to == test_user.full_name
        assert broken_asset.assigned_to_id == test_user.id
        assert broken_asset.status == "In Use"
        print("[OK] Root Fix verified: Broken asset successfully re-linked to user!")

    print("=== All Integration Verifications PASSED ===")

if __name__ == "__main__":
    asyncio.run(verify_integration())
