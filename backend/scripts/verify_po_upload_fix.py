import sys
import os
import asyncio
import uuid
import httpx
from sqlalchemy.future import select

# Add backend to path
sys.path.append(os.getcwd())

from app.database.database import AsyncSessionLocal
from app.models.models import User, AssetRequest, PurchaseOrder, ProcurementLog
from app.utils.auth_utils import create_access_token

async def verify_fix():
    print("--- PO UPLOAD FIX VERIFICATION (Corrected) ---")
    
    async with AsyncSessionLocal() as db:
        try:
            # 1. Ensure we have a procurement user
            user_res = await db.execute(select(User).filter(User.email == "pro@test.com"))
            user = user_res.scalars().first()
            if not user:
                print("[ERROR] pro@test.com not found. Run standardize_workflow_users.py first.")
                return

            # 2. Create a dummy asset request in PROCUREMENT_REQUESTED status
            request_id = uuid.uuid4()
            new_request = AssetRequest(
                id=request_id,
                requester_id=user.id,
                asset_name="Verification Laptop",
                asset_type="Laptop",
                status="PROCUREMENT_REQUESTED",
                justification="PO Upload Fix Verification"
            )
            db.add(new_request)
            await db.commit()
            print(f"[OK] Created dummy request: {request_id}")

            # 3. Generate token
            token = create_access_token(data={"sub": user.email, "user_id": str(user.id), "role": user.role})
            
            # 4. Prepare dummy "PDF" file
            dummy_pdf_path = "dummy_po.pdf"
            with open(dummy_pdf_path, "wb") as f:
                f.write(b"%PDF-1.4\n1 0 obj\n<<\n>>\nendobj\ntrailer\n<<\n/Root 1 0 R\n>>\n%%EOF")

            # 5. Call the API directly (simulating the curl)
            print("[INFO] Attempting PO Upload via API...")
            async with httpx.AsyncClient(base_url="http://127.0.0.1:8000") as client:
                with open(dummy_pdf_path, "rb") as f:
                    files = {"file": ("PO_TEST.pdf", f, "application/pdf")}
                    response = await client.post(
                        f"/api/v1/upload/po/{request_id}",
                        headers={"Authorization": f"Bearer {token}"},
                        files=files
                    )
            
            print(f"[API] Status: {response.status_code}")
            if response.status_code != 200:
                print(f"[ERROR] Upload failed: {response.text}")
                # Don't return, try to cleanup even on failure
            else:
                print("[OK] Upload API call succeeded.")

                # 6. Verify Database State
                # Re-fetch request
                await db.refresh(new_request)
                print(f"[DB] Request Status: {new_request.status}")
                
                if new_request.status != "PO_UPLOADED":
                    print(f"[FAIL] Expected status PO_UPLOADED, got {new_request.status}")

                # Check ProcurementLog
                log_res = await db.execute(select(ProcurementLog).filter(ProcurementLog.action == "PO_UPLOADED").order_by(ProcurementLog.created_at.desc()))
                log = log_res.scalars().first()
                if log:
                    print(f"[OK] Found procurement log for action: {log.action}")
                    print(f"[OK] Metadata: {log.metadata_}")
                else:
                    print("[FAIL] Procurement log not found.")

            # Cleanup
            # Re-fetch in case session was closed/errored
            to_delete = await db.execute(select(AssetRequest).filter(AssetRequest.id == request_id))
            req_to_del = to_delete.scalars().first()
            if req_to_del:
                await db.delete(req_to_del)
            
            po_res = await db.execute(select(PurchaseOrder).filter(PurchaseOrder.asset_request_id == request_id))
            po = po_res.scalars().first()
            if po:
                await db.delete(po)
            
            await db.commit()
            print("[OK] Data cleaned up.")

        except Exception as e:
            import traceback
            traceback.print_exc()
            print(f"[CRITICAL] Verification script failed: {e}")
        finally:
            if os.path.exists("dummy_po.pdf"):
                os.remove("dummy_po.pdf")

if __name__ == "__main__":
    asyncio.run(verify_fix())
