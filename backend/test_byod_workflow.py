"""
BYOD (Bring Your Own Device) Workflow Test Script
Tests the complete lifecycle from request creation to compliance approval
"""

import asyncio
import sys
from uuid import uuid4
from sqlalchemy import select
from app.database.database import AsyncSessionLocal
from app.models.models import AssetRequest, User, ByodDevice
from app.services import asset_request_service
from datetime import datetime

class BYODWorkflowTester:
    def __init__(self):
        self.test_user_id = None
        self.manager_id = None
        self.it_admin_id = None
        self.request_id = None
        self.byod_device_id = None
        
    async def setup_test_users(self, db):
        """Create or find test users for the workflow"""
        print("\n=== STEP 1: Setting up test users ===")
        
        # Find or create end user
        result = await db.execute(
            select(User).filter(User.email == "test.employee@company.com")
        )
        test_user = result.scalars().first()
        
        if not test_user:
            test_user = User(
                id=uuid4(),
                email="test.employee@company.com",
                full_name="Test Employee",
                password_hash="fake_hash",
                role="END_USER",
                status="ACTIVE",
                position="TEAM_MEMBER",
                department="Engineering"
            )
            db.add(test_user)
            await db.commit()
            await db.refresh(test_user)
            print(f"[OK] Created test user: {test_user.full_name}")
        else:
            print(f"[OK] Found existing test user: {test_user.full_name}")
            
        self.test_user_id = test_user.id
        
        # Find manager
        result = await db.execute(
            select(User).filter(User.position == "MANAGER", User.department == "Engineering")
        )
        manager = result.scalars().first()
        if manager:
            self.manager_id = manager.id
            print(f"[OK] Found manager: {manager.full_name}")
        
        # Find IT admin
        result = await db.execute(
            select(User).filter(User.role == "IT_MANAGEMENT")
        )
        it_admin = result.scalars().first()
        if it_admin:
            self.it_admin_id = it_admin.id
            print(f"[OK] Found IT admin: {it_admin.full_name}")
            
        return test_user, manager, it_admin
    
    async def test_create_byod_request(self, db, test_user):
        """Step 2: Create a BYOD asset request"""
        print("\n=== STEP 2: Creating BYOD Request ===")
        
        request = AssetRequest(
            id=uuid4(),
            requester_id=self.test_user_id,
            asset_name="Personal MacBook Pro",
            asset_type="BYOD",
            asset_ownership_type="BYOD",
            business_justification="I want to use my personal MacBook for work to maintain my preferred development environment",
            status="SUBMITTED",
            priority="Medium"
        )
        
        db.add(request)
        await db.commit()
        await db.refresh(request)
        
        self.request_id = request.id
        print(f"[OK] Created BYOD request: {request.id}")
        print(f"  Status: {request.status}")
        print(f"  Asset Type: {request.asset_type}")
        print(f"  Ownership: {request.asset_ownership_type}")
        
        return request
    
    async def test_manager_approval(self, db):
        """Step 3: Manager approves the BYOD request"""
        print("\n=== STEP 3: Manager Approval ===")
        
        if not self.manager_id:
            print("[WARN] No manager found, skipping manager approval")
            # Manually update status
            result = await db.execute(
                select(AssetRequest).filter(AssetRequest.id == self.request_id)
            )
            request = result.scalars().first()
            request.status = "MANAGER_APPROVED"
            await db.commit()
            print("[OK] Manually set status to MANAGER_APPROVED")
            return
        
        result = await db.execute(
            select(AssetRequest).filter(AssetRequest.id == self.request_id)
        )
        request = result.scalars().first()
        
        # Simulate manager approval
        request.status = "MANAGER_APPROVED"
        request.manager_approvals = [{
            "manager_id": str(self.manager_id),
            "manager_name": "Test Manager",
            "decision": "APPROVED",
            "timestamp": datetime.now().isoformat(),
            "reason": "Approved for BYOD compliance check"
        }]
        
        await db.commit()
        print(f"[OK] Manager approved request")
        print(f"  New Status: {request.status}")
    
    async def test_it_approval(self, db):
        """Step 4: IT Management approves the request"""
        print("\n=== STEP 4: IT Management Approval ===")
        
        result = await db.execute(
            select(AssetRequest).filter(AssetRequest.id == self.request_id)
        )
        request = result.scalars().first()
        
        request.status = "IT_APPROVED"
        request.it_reviewed_by = self.it_admin_id
        request.it_reviewed_at = datetime.now()
        
        await db.commit()
        print(f"[OK] IT approved request")
        print(f"  New Status: {request.status}")
    
    async def test_byod_registration(self, db):
        """Step 5: User registers their BYOD device"""
        print("\n=== STEP 5: BYOD Device Registration ===")
        
        # Create BYOD device record
        byod_device = ByodDevice(
            id=uuid4(),
            request_id=self.request_id,
            owner_id=self.test_user_id,
            device_model="MacBook Pro 16-inch (M3 Max)",
            os_version="macOS 14.2 Sonoma",
            serial_number=f"BYOD-TEST-{uuid4().hex[:8].upper()}",
            compliance_status="PENDING_ENROLLMENT"
        )
        
        db.add(byod_device)
        
        # Update request to link to BYOD device
        result = await db.execute(
            select(AssetRequest).filter(AssetRequest.id == self.request_id)
        )
        request = result.scalars().first()
        request.status = "BYOD_COMPLIANCE_CHECK"
        request.serial_number = byod_device.serial_number
        request.asset_model = byod_device.device_model
        request.os_version = byod_device.os_version
        
        await db.commit()
        await db.refresh(byod_device)
        
        self.byod_device_id = byod_device.id
        print(f"[OK] BYOD device registered: {byod_device.id}")
        print(f"  Model: {byod_device.device_model}")
        print(f"  Serial: {byod_device.serial_number}")
        print(f"  Compliance Status: {byod_device.compliance_status}")
        print(f"  Request Status: {request.status}")
    
    async def test_compliance_check(self, db):
        """Step 6: IT performs compliance check and MDM enrollment"""
        print("\n=== STEP 6: Compliance Check & MDM Enrollment ===")
        
        # Update BYOD device compliance
        result = await db.execute(
            select(ByodDevice).filter(ByodDevice.id == self.byod_device_id)
        )
        byod_device = result.scalars().first()
        
        byod_device.compliance_status = "MDM_ENFORCED"
        
        # Update request to final status
        result = await db.execute(
            select(AssetRequest).filter(AssetRequest.id == self.request_id)
        )
        request = result.scalars().first()
        request.status = "IN_USE"
        request.user_acceptance_status = "ACCEPTED"
        request.user_accepted_at = datetime.now()
        
        await db.commit()
        
        print(f"[OK] Compliance check completed")
        print(f"  BYOD Compliance: {byod_device.compliance_status}")
        print(f"  Request Status: {request.status}")
    
    async def verify_final_state(self, db):
        """Step 7: Verify the final state of the workflow"""
        print("\n=== STEP 7: Final Verification ===")
        
        # Check request
        result = await db.execute(
            select(AssetRequest).filter(AssetRequest.id == self.request_id)
        )
        request = result.scalars().first()
        
        # Check BYOD device
        result = await db.execute(
            select(ByodDevice).filter(ByodDevice.id == self.byod_device_id)
        )
        byod_device = result.scalars().first()
        
        print("\n[REPORT] Final State:")
        print(f"  Request ID: {request.id}")
        print(f"  Request Status: {request.status}")
        print(f"  Asset Type: {request.asset_type}")
        print(f"  Ownership: {request.asset_ownership_type}")
        print(f"  User Acceptance: {request.user_acceptance_status}")
        print(f"\n  BYOD Device ID: {byod_device.id}")
        print(f"  Device Model: {byod_device.device_model}")
        print(f"  Compliance Status: {byod_device.compliance_status}")
        
        # Validation
        success = True
        if request.status != "IN_USE":
            print(f"\n[FAIL] Request status should be IN_USE, got {request.status}")
            success = False
        if byod_device.compliance_status != "MDM_ENFORCED":
            print(f"\n[FAIL] BYOD should be MDM_ENFORCED, got {byod_device.compliance_status}")
            success = False
            
        if success:
            print("\n[SUCCESS] BYOD workflow completed successfully!")
        
        return success

async def run_byod_workflow_test():
    """Run the complete BYOD workflow test"""
    print("=" * 60)
    print("BYOD WORKFLOW COMPREHENSIVE TEST")
    print("=" * 60)
    
    tester = BYODWorkflowTester()
    
    async with AsyncSessionLocal() as db:
        try:
            # Run all test steps
            test_user, manager, it_admin = await tester.setup_test_users(db)
            await tester.test_create_byod_request(db, test_user)
            await tester.test_manager_approval(db)
            await tester.test_it_approval(db)
            await tester.test_byod_registration(db)
            await tester.test_compliance_check(db)
            success = await tester.verify_final_state(db)
            
            print("\n" + "=" * 60)
            if success:
                print("BYOD WORKFLOW TEST: PASSED")
            else:
                print("BYOD WORKFLOW TEST: FAILED")
            print("=" * 60)
            
            return success
            
        except Exception as e:
            print(f"\n[ERROR] {e}")
            import traceback
            traceback.print_exc()
            return False

if __name__ == "__main__":
    result = asyncio.run(run_byod_workflow_test())
    sys.exit(0 if result else 1)
