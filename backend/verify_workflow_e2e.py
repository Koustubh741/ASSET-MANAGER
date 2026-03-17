import asyncio
import httpx
from datetime import datetime
import json

# Configuration
API_URL = "http://localhost:8000/api/v1"
# Assuming default seed users exist
ADMIN_EMAIL = "admin@company.com" 
MANAGER_EMAIL = "manager@company.com" 
USER_EMAIL = "user@company.com"
PASSWORD = "password123"

class Colors:
    HEADER = '\033[95m'
    OKGREEN = '\033[92m'
    WARNING = '\033[93m'
    FAIL = '\033[91m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'

async def run_workflow():
    print(f"{Colors.HEADER}=== STARTING E2E WORKFLOW VERIFICATION ==={Colors.ENDC}")
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        # Helper to register or login
        async def get_user_token(email, password, role, position="EMPLOYEE"):
            # Try login first
            try:
                resp = await client.post(f"{API_URL}/auth/login", data={"username": email, "password": password})
                if resp.status_code == 200:
                    return resp.json()
            except:
                pass
            
            # Register if login fails (or just try to register first)
            print(f"Registering {email}...")
            reg_data = {
                "email": email,
                "password": password,
                "full_name": role.capitalize(),
                "role": role,
                "position": position,
                "domain": "company.com", # Ensure domain match
                "department": "IT" # Ensure department match for simplicity
            }
            # Note: Registration might require specific endpoint or admin rights depending on config
            # But for test env, let's assume we can use a seed script approach or just print error if login fails
            # Actually, let's use the seed_users.py logic equivalent or just fail gracefully if we can't register.
            # A better approach given the environment: assume the standardized seed users.
            # Let's try to specific seed credentials if the defaults failed.
            return None

        # 0. Setup Users (Attempting standardized credentials)
        # Using a distinct test set to avoid conflicts
        TEST_SUFFIX = datetime.now().strftime("%H%M%S")
        ADMIN_EMAIL = f"admin_test_{TEST_SUFFIX}@company.com"
        MANAGER_EMAIL = f"manager_test_{TEST_SUFFIX}@company.com"
        USER_EMAIL = f"user_test_{TEST_SUFFIX}@company.com"
        
        # We need a robust way to create users. 
        # Since we are in a dev environment, let's use the /auth/signup endpoint if available, 
        # or rely on the known admin to create others.
        
        # Strategy: Login as existing Super Admin (admin@itsm.com / admin123 from seed) to create test users
        SUB_ADMIN_EMAIL = "admin@itsm.com"
        SUB_ADMIN_PASS = "password123"
        
        print(f"\n{Colors.BOLD}0. Setting up Test Users...{Colors.ENDC}")
        try:
            resp = await client.post(f"{API_URL}/auth/login", data={"username": SUB_ADMIN_EMAIL, "password": SUB_ADMIN_PASS})
            if resp.status_code != 200:
                print(f"{Colors.FAIL}Critical: Cannot login as Super Admin ({SUB_ADMIN_EMAIL}). Checking seed data...{Colors.ENDC}")
                return
            
            super_token = resp.json()["access_token"]
            super_headers = {"Authorization": f"Bearer {super_token}"}
            
            # Helper to create user via Admin API
            async def create_test_user(email, role, position="EMPLOYEE"):
                user_data = {
                    "email": email,
                    "password": PASSWORD,
                    "full_name": f"Test {role}",
                    "role": role,
                    "position": position,
                    "domain": "company.com",
                    "department": "IT",
                    "status": "ACTIVE"
                }
                try:
                    r = await client.post(f"{API_URL}/users", json=user_data, headers=super_headers)
                    if r.status_code == 201:
                        print(f"Created {role}: {email}")
                        return r.json()
                    elif r.status_code == 400 and "already exists" in r.text:
                        pass
                    else:
                        print(f"Failed to create {role} ({r.status_code}): {r.text}")
                except Exception as e:
                    print(f"Exception creating {role}: {e}")
                    raise e

            await create_test_user(ADMIN_EMAIL, "IT_MANAGEMENT", "MANAGER") # Admin acts as IT reviewer
            await create_test_user(MANAGER_EMAIL, "END_USER", "MANAGER")
            await create_test_user(USER_EMAIL, "END_USER", "EMPLOYEE")
            
        except Exception as e:
            print(f"{Colors.FAIL}User setup failed: {e}{Colors.ENDC}")
            import traceback
            traceback.print_exc()
            return

        # 1. Login
        print(f"\n{Colors.BOLD}1. Logging in Test Users...{Colors.ENDC}")
        try:
            # Login Admin (IT Reviewer)
            resp = await client.post(f"{API_URL}/auth/login", data={"username": ADMIN_EMAIL, "password": PASSWORD})
            admin_token = resp.json()["access_token"]
            admin_user = resp.json()["user"]
            
            # Login Manager
            resp = await client.post(f"{API_URL}/auth/login", data={"username": MANAGER_EMAIL, "password": PASSWORD})
            manager_token = resp.json()["access_token"]
            manager_user = resp.json()["user"]
            
            # Login User
            resp = await client.post(f"{API_URL}/auth/login", data={"username": USER_EMAIL, "password": PASSWORD})
            user_token = resp.json()["access_token"]
            user_user = resp.json()["user"]
            
            print(f"{Colors.OKGREEN}[OK] Login successful for Test Admin, Manager, User{Colors.ENDC}")
        except Exception as e:
            print(f"{Colors.FAIL}Login failed: {e}{Colors.ENDC}")
            return

        # Headers
        user_headers = {"Authorization": f"Bearer {user_token}"}
        manager_headers = {"Authorization": f"Bearer {manager_token}"}
        admin_headers = {"Authorization": f"Bearer {admin_token}"}

        # 2. Submit Request
        print(f"\n{Colors.BOLD}2. Submitting Asset Request...{Colors.ENDC}")
        request_data = {
            "requester_id": user_user["id"],
            "asset_name": "E2E Test Laptop",
            "asset_type": "Laptop",
            "asset_ownership_type": "COMPANY_OWNED",
            "business_justification": "Verification Test Run"
        }
        resp = await client.post(f"{API_URL}/asset-requests", json=request_data, headers=user_headers)
        if resp.status_code != 201:
            print(f"{Colors.FAIL}Failed to create request: {resp.text}{Colors.ENDC}")
            return
        request_id = resp.json()["id"]
        print(f"{Colors.OKGREEN}[OK] Request Created: {request_id} [SUBMITTED]{Colors.ENDC}")

        # 3. Manager Approve (Stage 1)
        print(f"\n{Colors.BOLD}3. Manager Initial Approval...{Colors.ENDC}")
        resp = await client.post(
            f"{API_URL}/asset-requests/{request_id}/manager/approve",
            json={"manager_id": manager_user["id"]},
            headers=manager_headers
        )
        if resp.status_code == 200:
            print(f"{Colors.OKGREEN}[OK] Manager Approved [MANAGER_APPROVED]{Colors.ENDC}")
        else:
            print(f"{Colors.FAIL}Manager approval failed: {resp.text}{Colors.ENDC}")

        # 4. IT Approve (Stage 2)
        print(f"\n{Colors.BOLD}4. IT Approval...{Colors.ENDC}")
        resp = await client.post(
            f"{API_URL}/asset-requests/{request_id}/it/approve",
            json={"reviewer_id": admin_user["id"], "approval_comment": "Specs OK"},
            headers=admin_headers
        )
        if resp.status_code == 200:
            print(f"{Colors.OKGREEN}[OK] IT Approved [IT_APPROVED]{Colors.ENDC}")
        else:
            print(f"{Colors.FAIL}IT approval failed: {resp.text}{Colors.ENDC}")

        # 5. Manager Confirm IT (Stage 3 - NEW)
        print(f"\n{Colors.BOLD}5. Manager Confirm IT Decision...{Colors.ENDC}")
        resp = await client.post(
            f"{API_URL}/asset-requests/{request_id}/manager/confirm-it",
            json={
                "manager_id": manager_user["id"],
                "manager_name": manager_user["full_name"],
                "decision": "CONFIRM"
            },
            headers=manager_headers
        )
        if resp.status_code == 200:
            new_status = resp.json()["status"]
            print(f"{Colors.OKGREEN}[OK] Manager Confirmed IT via new endpoint{Colors.ENDC}")
            print(f"{Colors.OKGREEN}  -> Auto-routed to: {new_status}{Colors.ENDC}")
        else:
            print(f"{Colors.FAIL}Manager confirmation failed: {resp.text}{Colors.ENDC}")

        print(f"\n{Colors.HEADER}=== VERIFICATION COMPLETE ==={Colors.ENDC}")

if __name__ == "__main__":
    asyncio.run(run_workflow())
