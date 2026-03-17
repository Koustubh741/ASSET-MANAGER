import asyncio
import uuid
import sys
import os

# Add current directory to path
sys.path.append(os.getcwd())

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy.future import select
from app.database.database import Base, AsyncSessionLocal, async_engine as engine
from app.models.models import User, Asset, AssetRequest
from app.services import asset_service, asset_request_service
from app.schemas.asset_schema import AssetUpdate

async def verify_architectural_root_fix():
    async with AsyncSessionLocal() as db:
        print("--- VERIFYING ARCHITECTURAL ROOT FIX ---")
        
        # 1. Setup Test Manager
        manager_id = uuid.uuid4()
        manager_email = f"arch_manager_{manager_id.hex[:6]}@example.com"
        manager = User(
            id=manager_id,
            email=manager_email,
            full_name="Architectural Manager",
            role="MANAGER",
            position="MANAGER",
            department="Architecture",
            domain="example.com",
            password_hash="hashed"
        )
        db.add(manager)
        
        # 2. Setup Test User in same department
        user_id = uuid.uuid4()
        user = User(
            id=user_id,
            email=f"arch_user_{user_id.hex[:6]}@example.com",
            full_name="Architectural User",
            role="END_USER",
            department="Architecture",
            domain="example.com",
            password_hash="hashed"
        )
        db.add(user)
        
        # 3. Create Department Request
        dept_req = AssetRequest(
            id=uuid.uuid4(),
            requester_id=user_id,
            asset_name="Dept Laptop",
            asset_type="LAPTOP",
            status="REQUESTED",
            justification="Dept laptop"
        )
        db.add(dept_req)
        
        # 4. Create Manager's Personal Request
        manager_req = AssetRequest(
            id=uuid.uuid4(),
            requester_id=manager_id,
            asset_name="Manager Laptop",
            asset_type="LAPTOP",
            status="REQUESTED",
            justification="Manager laptop"
        )
        db.add(manager_req)
        
        await db.commit()
        print(f"Created Test Data: Manager({manager_id}), User({user_id})")
        
        # 5. Verify Unified Scoping for Requests
        print("\nVerifying Unified Scoping (Requests)...")
        requests = await asset_request_service.get_all_asset_requests(
            db, 
            requester_id=manager_id, 
            department="Architecture"
        )
        
        # Should see both requests
        req_ids = [r.id for r in requests]
        if dept_req.id in req_ids and manager_req.id in req_ids:
            print("[OK] Unified Scoping (Requests) SUCCESS: Manager sees Dept + Personal requests.")
        else:
            print(f"[FAILED] Unified Scoping (Requests) FAILED: Got {len(requests)} requests, missing some.")
            
        # 6. Setup Asset for Atomic Assignment Verification
        asset_id = uuid.uuid4()
        asset = Asset(
            id=asset_id,
            name="Test Asset",
            type="LAPTOP",
            model="Pro",
            vendor="Commercial",
            serial_number=f"SN-{asset_id.hex[:8]}",
            status="Available",
            location="IT Warehouse"
        )
        db.add(asset)
        await db.commit()
        
        print("\nVerifying Atomic Assignment...")
        # Use refactored assign_asset
        await asset_service.assign_asset(
            db, 
            asset_id=asset_id, 
            user=user_id, # Pass UUID
            location="Remote",
            assign_date=None
        )
        
        # Verify both fields are set
        updated_asset_res = await db.execute(select(Asset).filter(Asset.id == asset_id))
        updated_asset = updated_asset_res.scalars().first()
        
        if updated_asset.assigned_to == "Architectural User" and updated_asset.assigned_to_id == user_id:
            print("[OK] Atomic Assignment SUCCESS: Both Name and UUID set correctly.")
        else:
            print(f"[FAILED] Atomic Assignment FAILED: name='{updated_asset.assigned_to}', id='{updated_asset.assigned_to_id}'")

        # 7. Cleanup
        print("\nCleaning up test data...")
        await db.delete(dept_req)
        await db.delete(manager_req)
        await db.delete(updated_asset)
        await db.delete(user)
        await db.delete(manager)
        await db.commit()
        print("Cleanup complete.")

if __name__ == "__main__":
    asyncio.run(verify_architectural_root_fix())
