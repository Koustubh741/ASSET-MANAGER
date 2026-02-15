import asyncio
import os
import sys

sys.path.append(os.getcwd())

from app.database.database import AsyncSessionLocal
from app.services import asset_request_service
from app.models.models import User
from sqlalchemy.future import select

# Mock user object to simulate current_user dependency
class MockUser:
    def __init__(self, id, role, position, department, domain):
        self.id = id
        self.role = role
        self.position = position
        self.department = department
        self.domain = domain

async def verify_fix():
    async with AsyncSessionLocal() as session:
        print("\n=== VERIFYING IT MANAGEMENT VISIBILITY ===\n")
        
        # 1. Get an active IT Management user
        result = await session.execute(
            select(User).filter(User.role == "IT_MANAGEMENT", User.status == "ACTIVE")
        )
        it_user = result.scalars().first()
        
        if not it_user:
            print("[X] No active IT Management user found.")
            return
            
        print(f"Testing with user: {it_user.full_name}")
        print(f"Role: {it_user.role}")
        print(f"Position: {it_user.position}")
        print(f"Department: {it_user.department}")
        
        # 2. Simulate the Router Logic (which was broken)
        # OLD LOGIC: department = "IT" (enforced)
        # NEW LOGIC: department = None (because role is excluded)
        
        # We manually test the router logic here to prove it works
        exclude_roles = ["ADMIN", "SYSTEM_ADMIN", "IT_MANAGEMENT", "ASSET_MANAGER", "FINANCE", "PROCUREMENT"]
        
        department_filter = None
        if it_user.position == "MANAGER" and it_user.role not in exclude_roles:
            if not department_filter:
                department_filter = it_user.department or it_user.domain
                print(f"[OLD BEHAVIOR] Department restricted to: {department_filter}")
        else:
            print(f"[NEW BEHAVIOR] Department filter: None (Global Access)")
            
        # 3. Call the service with the calculated filter
        requests = await asset_request_service.get_all_asset_requests(
            session,
            department=department_filter,
            user_role=it_user.role
        )
        
        print(f"\nRequests found: {len(requests)}")
        
        found_engineering_req = False
        for req in requests:
            print(f"- Request: {req.asset_name} (Status: {req.status})")
            print(f"  Requester Dept: {req.requester_department}")
            
            if req.requester_department == "Engineering":
                found_engineering_req = True
                print("  [OK] FOUND ENGINEERING REQUEST!")
            elif req.requester_department is None:
                print("  [WARNING] Requester Department is None!")
        
        if found_engineering_req:
            print("\n[SUCCESS] IT Management user can see Engineering requests.")
        else:
            print("\n[FAILED] IT Management user CANNOT see Engineering requests.")

if __name__ == "__main__":
    asyncio.run(verify_fix())
