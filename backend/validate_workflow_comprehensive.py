import asyncio
import httpx
import json
import os
import uuid
from datetime import datetime
from typing import Dict, Any

# Configuration
API_URL = "http://localhost:8000/api/v1"
TEST_ID = datetime.now().strftime("%H%M%S")
PASSWORD = "password123"

# Colors for output
class Colors:
    HEADER = '\033[95m'
    OKGREEN = '\033[92m'
    WARNING = '\033[93m'
    FAIL = '\033[91m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'

class WorkflowValidator:
    def __init__(self):
        self.client = httpx.AsyncClient(timeout=60.0)
        self.users = {}
        self.headers = {}
        self.resume_data = {} # To store IDs across steps if needed

    async def log(self, message, type="INFO"):
        if type == "INFO":
            print(f"[INFO] {message}")
        elif type == "SUCCESS":
            print(f"{Colors.OKGREEN}[PASS] {message}{Colors.ENDC}")
        elif type == "ERROR":
            print(f"{Colors.FAIL}[FAIL] {message}{Colors.ENDC}")
        elif type == "HEADER":
            print(f"\n{Colors.HEADER}{Colors.BOLD}=== {message} ==={Colors.ENDC}")

    async def setup_users(self):
        await self.log("Setting up Test Users...", "HEADER")
        
        # 1. Admin Login (to create others)
        try:
            resp = await self.client.post(f"{API_URL}/auth/login", data={"username": "admin@itsm.com", "password": "password123"})
            if resp.status_code != 200:
                await self.log("Could not login as Super Admin (admin@itsm.com). Checking seed data.", "ERROR")
                return False
            
            admin_token = resp.json()["access_token"]
            admin_headers = {"Authorization": f"Bearer {admin_token}"}
            self.users["SUPER_ADMIN"] = resp.json()["user"]
            self.headers["SUPER_ADMIN"] = admin_headers
        except Exception as e:
            await self.log(f"Setup user exception: {e}", "ERROR")
            return False

        # 2. Create Role-Based Users
        roles_to_create = [
            {"email": f"requester_{TEST_ID}@auto.com", "role": "END_USER", "pos": "TEAM_MEMBER", "dept": "IT"},
            {"email": f"manager_{TEST_ID}@auto.com", "role": "END_USER", "pos": "MANAGER", "dept": "IT"},
            {"email": f"it_admin_{TEST_ID}@auto.com", "role": "IT_MANAGEMENT", "pos": "MANAGER", "dept": "IT"},
            {"email": f"finance_{TEST_ID}@auto.com", "role": "FINANCE", "pos": "MANAGER", "dept": "FINANCE"},
            {"email": f"inventory_{TEST_ID}@auto.com", "role": "ASSET_INVENTORY_MANAGER", "pos": "MANAGER", "dept": "IT"},
        ]

        for u in roles_to_create:
            # Create
            user_payload = {
                "email": u["email"],
                "password": PASSWORD,
                "full_name": f"Test {u['role']} {TEST_ID}",
                "role": u["role"],
                "position": u["pos"],
                "domain": "DATA_AI", # Consistent domain
                "department": u["dept"],
                "status": "ACTIVE"
            }
            try:
                # Try create
                resp = await self.client.post(f"{API_URL}/users", json=user_payload, headers=admin_headers)
                if resp.status_code in [201, 400]: # 400 is ok if exists
                     pass
                else:
                    await self.log(f"Failed to create user {u['email']}: {resp.text}", "ERROR")
                
                # Login to get token
                l_resp = await self.client.post(f"{API_URL}/auth/login", data={"username": u["email"], "password": PASSWORD})
                if l_resp.status_code == 200:
                    data = l_resp.json()
                    key = u["email"].split("_")[0].upper() # REQUESTER, MANAGER, IT...
                    self.users[key] = data["user"]
                    self.headers[key] = {"Authorization": f"Bearer {data['access_token']}"}
                    await self.log(f"User {key} ({u['email']}) Ready", "SUCCESS")
                else:
                    await self.log(f"Failed to login user {u['email']}: {l_resp.text}", "ERROR")
                    return False

            except Exception as e:
                await self.log(f"User creation error: {e}", "ERROR")
                return False
        
        return True

    # ================= SCENARIO A: COMPANY OWNED HAPPY PATH =================
    async def scenario_company_owned(self):
        await self.log("SCENARIO A: Company-Owned Asset (Happy Path)", "HEADER")
        
        # 1. Submit Request
        try:
            req_payload = {
                "requester_id": self.users["REQUESTER"]["id"],
                "asset_name": f"Test Laptop {TEST_ID}",
                "asset_type": "Laptop",
                "asset_ownership_type": "COMPANY_OWNED",
                "business_justification": "Automated Testing",
                "asset_model": f"Unique Model {TEST_ID}", # Unique model to force Procurement (Skip Inventory)
                "cost_estimate": 1500.0
            }
            r = await self.client.post(f"{API_URL}/asset-requests", json=req_payload, headers=self.headers["REQUESTER"])
            if r.status_code != 201:
                await self.log(f"Request Submission Failed: {r.text}", "ERROR")
                return
            request_data = r.json()
            rid = request_data["id"]
            await self.log(f"Request Submitted: {rid} [Status: {request_data['status']}]", "SUCCESS")
        except Exception as e:
            await self.log(f"Submission Exception: {e}", "ERROR")
            return

        # 2. Manager Approve
        try:
            r = await self.client.post(
                f"{API_URL}/asset-requests/{rid}/manager/approve",
                json={"manager_id": self.users["MANAGER"]["id"]},
                headers=self.headers["MANAGER"]
            )
            if r.status_code != 200:
                await self.log(f"Manager Approval Failed: {r.text}", "ERROR")
                return
            await self.log("Manager Approved", "SUCCESS")
        except Exception as e:
             await self.log(f"Manager Approval Exception: {e}", "ERROR")

        # 3. IT Approve
        try:
            r = await self.client.post(
                f"{API_URL}/asset-requests/{rid}/it/approve",
                json={"reviewer_id": self.users["IT"]["id"], "approval_comment": "Valid specs"},
                headers=self.headers["IT"]
            )
            if r.status_code != 200:
                await self.log(f"IT Approval Failed: {r.text}", "ERROR")
                return
            await self.log("IT Approved", "SUCCESS")
        except Exception as e:
             await self.log(f"IT Approval Exception: {e}", "ERROR")

        # 4. Manager Confirm IT Decision (Routes to Procurement or In Stock)
        try:
            r = await self.client.post(
                f"{API_URL}/asset-requests/{rid}/manager/confirm-it",
                json={"manager_id": self.users["MANAGER"]["id"], "manager_name": "Test Manager", "decision": "CONFIRM"},
                headers=self.headers["MANAGER"]
            )
            if r.status_code != 200:
                await self.log(f"Manager Confirm IT Failed: {r.text}", "ERROR")
                return
            
            # Use `verify_workflow_e2e.py` logic: this routes to USER_ACCEPTANCE if in stock, else PROCUREMENT
            # We need to simulate 'Not In Stock' effectively, or handle both.
            # Assuming default is PROCUREMENT_REQUESTED if no stock found.
            new_status = r.json()["status"]
            await self.log(f"Manager Confirmed IT. New Status: {new_status}", "SUCCESS")
            
            # If it went straight to USER_ACCEPTANCE, we skipped procurement (Stock available).
            # For this test, to force procurement, we might need to ensure stock check fails.
            # But let's adapt.
            if new_status == "PROCUREMENT_REQUESTED":
                await self.process_procurement(rid)
            elif new_status == "USER_ACCEPTANCE_PENDING":
                await self.log("Item was in stock, skipped procurement.", "INFO")
                # Proceed to acceptance
                await self.process_acceptance(rid)

        except Exception as e:
             await self.log(f"Manager Confirm Exception: {e}", "ERROR")

    async def process_procurement(self, rid):
        await self.log("... Processing Procurement Flow ...", "INFO")
        
        # 1. Finance Approve Procurement
        try:
            # Need ID for finance? No, router uses current_user
            r = await self.client.post(
                f"{API_URL}/asset-requests/{rid}/procurement/approve",
                json={"approver_id": self.users["FINANCE"]["id"]},
                headers=self.headers["FINANCE"]
            )
            if r.status_code != 200:
                await self.log(f"Finance Approval Failed: {r.text}", "ERROR")
                return
            await self.log("Finance Approved Procurement", "SUCCESS")
        except Exception as e:
            await self.log(f"Finance Exception: {e}", "ERROR")
            return

        # 2. Upload PO (Mock PDF)
        # Create dummy PDF
        with open("dummy_po.pdf", "wb") as f:
            f.write(b"%PDF-1.4 dummy content")
        
        try:
            with open("dummy_po.pdf", "rb") as pdf_file:
                files = {"file": ("dummy_po.pdf", pdf_file, "application/pdf")}
                r = await self.client.post(f"{API_URL}/upload/po/{rid}", files=files, headers=self.headers["FINANCE"])
            
            if r.status_code != 200:
                await self.log(f"PO Upload Failed: {r.text}", "ERROR")
            else:
                await self.log("PO Uploaded", "SUCCESS")
        except Exception as e:
            await self.log(f"PO Upload Exception: {e}", "ERROR")
        finally:
            if os.path.exists("dummy_po.pdf"):
                os.remove("dummy_po.pdf")

        # 3. Confirm Delivery
        try:
            r = await self.client.post(f"{API_URL}/asset-requests/{rid}/procurement/confirm-delivery", headers=self.headers["FINANCE"])
            if r.status_code != 200:
                await self.log(f"Delivery Confirmation Failed: {r.text}", "ERROR")
                return
            await self.log("Delivery Confirmed (Asset Created, QC Pending)", "SUCCESS")
        except Exception as e:
             await self.log(f"Delivery Exception: {e}", "ERROR")

        # 4. Inventory QC
        try:
            r = await self.client.post(
                f"{API_URL}/asset-requests/{rid}/qc/perform",
                json={"qc_status": "PASSED", "qc_notes": "All good"},
                headers=self.headers["INVENTORY"]
            )
            if r.status_code != 200:
                await self.log(f"QC Failed: {r.text}", "ERROR")
                return
            await self.log("QC Passed", "SUCCESS")
        except Exception as e:
             await self.log(f"QC Exception: {e}", "ERROR")
        
        # 5. Inventory Allocate (Assign to user)
        # We need the asset_id from the request
        try:
            r = await self.client.get(f"{API_URL}/asset-requests/{rid}", headers=self.headers["REQUESTER"])
            asset_id = r.json()["asset_id"]
            
            r = await self.client.post(
                f"{API_URL}/asset-requests/{rid}/inventory/allocate?asset_id={asset_id}",
                headers=self.headers["INVENTORY"]
            )
            if r.status_code != 200:
                 # Note: The allocate endpoint might be slightly different in params?
                 # Checked router: @router.post("/{request_id}/inventory/allocate") takes query param asset_id
                 await self.log(f"Allocation Failed: {r.text}", "ERROR")
            else:
                await self.log("Asset Allocated", "SUCCESS")
                self.resume_data["asset_id_for_exit"] = asset_id # Save for Exit test
                
                # 6. User Acceptance
                await self.process_acceptance(rid)

        except Exception as e:
            await self.log(f"Allocation Exception: {e}", "ERROR")

    async def process_acceptance(self, rid):
        try:
            r = await self.client.post(
                f"{API_URL}/asset-requests/{rid}/user/accept",
                json={"acceptance_status": "ACCEPTED"},
                headers=self.headers["REQUESTER"]
            )
            if r.status_code != 200:
                await self.log(f"User Acceptance Failed: {r.text}", "ERROR")
            else:
                 await self.log("User Accepted Asset [FLOW COMPLETE]", "SUCCESS")
        except Exception as e:
            await self.log(f"Acceptance Exception: {e}", "ERROR")


    # ================= SCENARIO B: REJECTION FLOWS =================
    async def scenario_rejection(self):
        await self.log("SCENARIO B: Rejection Flows", "HEADER")

        # 1. Manager Rejection
        rid = None
        try:
            # Submit
            req_payload = {
                "requester_id": self.users["REQUESTER"]["id"],
                "asset_name": "Reject Me Laptop",
                "asset_type": "Laptop",
                "asset_ownership_type": "COMPANY_OWNED",
                "business_justification": "Bad Reason"
            }
            r = await self.client.post(f"{API_URL}/asset-requests", json=req_payload, headers=self.headers["REQUESTER"])
            rid = r.json()["id"]

            request_id = r.json()["id"]
            
            # Reject
            r = await self.client.post(
                f"{API_URL}/asset-requests/{request_id}/manager/reject",
                json={"manager_id": self.users["MANAGER"]["id"], "reason": "No Budget"},
                headers=self.headers["MANAGER"]
            )
            if r.status_code == 200 and r.json()["status"] == "MANAGER_REJECTED":
                await self.log("Manager Rejection Verified", "SUCCESS")
            else:
                await self.log(f"Manager Rejection Failed: {r.text}", "ERROR")
        except Exception as e:
            await self.log(f"Rejection Validaton Error: {e}", "ERROR")

        # 2. IT Rejection
        try:
             # Submit
            req_payload = {
                "requester_id": self.users["REQUESTER"]["id"],
                "asset_name": "IT Reject Laptop",
                "asset_type": "Laptop",
                "asset_ownership_type": "COMPANY_OWNED",
                "business_justification": "Good Reason"
            }
            r = await self.client.post(f"{API_URL}/asset-requests", json=req_payload, headers=self.headers["REQUESTER"])
            rid = r.json()["id"]
            
            # Manager Approve
            await self.client.post(f"{API_URL}/asset-requests/{rid}/manager/approve", json={"manager_id": self.users["MANAGER"]["id"]}, headers=self.headers["MANAGER"])
            
            # IT Reject
            r = await self.client.post(
                f"{API_URL}/asset-requests/{rid}/it/reject",
                json={"reviewer_id": self.users["IT"]["id"], "reason": "Non-Standard Spec"},
                headers=self.headers["IT"]
            )
            
            if r.status_code == 200 and r.json()["status"] == "IT_REJECTED":
                await self.log("IT Rejection Verified", "SUCCESS")
            else:
                await self.log(f"IT Rejection Failed: {r.text}", "ERROR")

        except Exception as e:
             await self.log(f"IT Rejection Error: {e}", "ERROR")


    # ================= SCENARIO C: BYOD FLOW =================
    async def scenario_byod(self):
        await self.log("SCENARIO C: BYOD Workflow", "HEADER")
        
        try:
            # 1. Submit BYOD
            req_payload = {
                "requester_id": self.users["REQUESTER"]["id"],
                "asset_name": "My MacBook",
                "asset_type": "Laptop",
                "asset_ownership_type": "BYOD",
                "business_justification": "Personal Device",
                "serial_number": f"SN-{TEST_ID}",
                "os_version": "macOS 14"
            }
            r = await self.client.post(f"{API_URL}/asset-requests", json=req_payload, headers=self.headers["REQUESTER"])
            rid = r.json()["id"]
            await self.log(f"BYOD Request Submitted: {rid}", "SUCCESS")

            # 2. Approvals
            await self.client.post(f"{API_URL}/asset-requests/{rid}/manager/approve", json={"manager_id": self.users["MANAGER"]["id"]}, headers=self.headers["MANAGER"])
            await self.client.post(f"{API_URL}/asset-requests/{rid}/it/approve", json={"reviewer_id": self.users["IT"]["id"], "approval_comment": "OK"}, headers=self.headers["IT"])
            
            # 3. Manager Confirm IT
            await self.client.post(
                f"{API_URL}/asset-requests/{rid}/manager/confirm-it",
                json={"manager_id": self.users["MANAGER"]["id"], "manager_name": "Test Manager", "decision": "CONFIRM"},
                headers=self.headers["MANAGER"]
            )

            # 3.5 Register BYOD Device (Crucial Step)
            r = await self.client.post(
                f"{API_URL}/asset-requests/{rid}/byod/register",
                json={
                    "device_model": "MacBook Pro M3",
                    "os_version": "macOS 14",
                    "serial_number": f"SN-{TEST_ID}"
                },
                headers=self.headers["IT"]
            )
            if r.status_code == 200:
                await self.log("BYOD Device Registered", "SUCCESS")
            else:
                await self.log(f"BYOD Device Registration Failed: {r.text}", "ERROR")
                return

            # 4. Compliance Check
            r = await self.client.post(
                f"{API_URL}/asset-requests/{rid}/byod-compliance-check",
                json={"compliance_status": "COMPLIANT", "notes": "MDM Installed"},
                headers=self.headers["IT"]
            )
            
            if r.status_code == 200:
                 # Check status
                 status = r.json().get("final_status") or r.json().get("status")
                 if status in ["IN_USE", "COMPLIANT"]:
                     await self.log(f"BYOD Compliance Passed. Final Status: {status}", "SUCCESS")
                 else:
                     await self.log(f"BYOD Compliance finished with unexpected status: {status}", "WARNING")
            else:
                await self.log(f"BYOD Compliance Check Failed: {r.text}", "ERROR")

        except Exception as e:
            await self.log(f"BYOD Exception: {e}", "ERROR")

    # ================= SCENARIO D: EXIT WORKFLOW =================
    async def scenario_exit(self):
        await self.log("SCENARIO D: Exit Workflow", "HEADER")
        
        user_id = self.users["REQUESTER"]["id"]
        
        try:
            # 1. Initiate Exit
            r = await self.client.post(f"{API_URL}/auth/users/{user_id}/exit", headers=self.headers["SUPER_ADMIN"])
            if r.status_code != 200:
                await self.log(f"Exit Initiation Failed ({r.status_code}): {r.text}", "ERROR")
                return
            
            user_data = r.json()
            if user_data["status"] == "EXITING":
                await self.log("User Status changed to EXITING", "SUCCESS")
            else:
                 await self.log(f"User Status mismatch: {user_data['status']}", "ERROR")

            # Check for generic exit requests
            r_ex = await self.client.get(f"{API_URL}/auth/exit-requests", headers=self.headers["SUPER_ADMIN"])
            exit_reqs = r_ex.json()
            await self.log(f"DEBUG: Exit Reqs Response: {exit_reqs}", "INFO")
            my_exit = next((x for x in exit_reqs if x["user_id"] == user_id), None)
            
            if not my_exit:
                await self.log("Exit Request record not found!", "ERROR")
                return

            exit_id = my_exit["id"]
            await self.log(f"Exit Request Record Created: {exit_id}", "SUCCESS")

            # 2. Process Assets (Return to Stock)
            r = await self.client.post(f"{API_URL}/auth/exit-requests/{exit_id}/process-assets", headers=self.headers["INVENTORY"])
            if r.status_code == 200:
                await self.log("Assets Processed (Returned to Stock)", "SUCCESS")
            else:
                await self.log(f"Asset Processing Failed: {r.text}", "ERROR")

            # 3. Process BYOD (Wipe/Unenroll)
            r = await self.client.post(f"{API_URL}/auth/exit-requests/{exit_id}/process-byod", headers=self.headers["IT"])
            if r.status_code == 200:
                await self.log("BYOD Processed (De-registered)", "SUCCESS")
            else:
                await self.log(f"BYOD Processing Failed: {r.text}", "ERROR")

            # 4. Complete Exit
            r = await self.client.post(f"{API_URL}/auth/exit-requests/{exit_id}/complete", headers=self.headers["SUPER_ADMIN"])
            if r.status_code == 200:
                await self.log("Exit Workflow Completed (User DISABLED)", "SUCCESS")
            else:
                await self.log(f"Exit Completion Failed: {r.text}", "ERROR")

        except Exception as e:
             await self.log(f"Exit Scenario Exception: {e}", "ERROR")

    async def run(self):
        await self.log("STARTING COMPREHENSIVE VALIDATION", "HEADER")
        if not await self.setup_users():
            await self.log("Aborting due to setup failure.", "ERROR")
            return
        
        await self.scenario_company_owned()
        await self.scenario_rejection()
        await self.scenario_byod()
        await self.scenario_exit()
        
        await self.client.aclose()
        await self.log("VALIDATION RUN COMPLETE", "HEADER")

if __name__ == "__main__":
    validator = WorkflowValidator()
    asyncio.run(validator.run())
