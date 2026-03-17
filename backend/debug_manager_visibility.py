import asyncio
import os
import sys

# Add the backend directory to sys.path
sys.path.append(os.getcwd())

from app.database.database import AsyncSessionLocal
from app.models.models import User, AssetRequest
from sqlalchemy.future import select

async def debug_manager_visibility():
    async with AsyncSessionLocal() as session:
        # 1. Find the manager
        print("\n=== MANAGER INFO ===")
        result = await session.execute(
            select(User).filter(
                User.department == "Engineering",
                User.position == "MANAGER"
            )
        )
        managers = result.scalars().all()
        
        if not managers:
            print("[X] No managers found in Engineering department!")
            return
            
        for m in managers:
            print(f"[OK] Manager: {m.full_name}")
            print(f"   Email: {m.email}")
            print(f"   Position: {m.position}")
            print(f"   Department: {m.department}")
            print(f"   Domain: {m.domain}")
            print(f"   Status: {m.status}")
            print(f"   ID: {m.id}")
        
        # 2. Find all Engineering users
        print("\n=== ENGINEERING TEAM MEMBERS ===")
        result = await session.execute(
            select(User).filter(User.department == "Engineering")
        )
        eng_users = result.scalars().all()
        eng_user_ids = [u.id for u in eng_users]
        
        for u in eng_users:
            print(f"User: {u.full_name} | Position: {u.position} | Domain: {u.domain} | Status: {u.status}")
        
        # 3. Find requests from Engineering users
        print("\n=== ASSET REQUESTS FROM ENGINEERING ===")
        if eng_user_ids:
            result = await session.execute(
                select(AssetRequest).filter(AssetRequest.requester_id.in_(eng_user_ids))
            )
            requests = result.scalars().all()
            
            if not requests:
                print("[X] No asset requests found from Engineering users!")
            else:
                for r in requests:
                    requester = await session.execute(select(User).filter(User.id == r.requester_id))
                    req_user = requester.scalars().first()
                    
                    print(f"\n[REQUEST] ID: {r.id}")
                    print(f"   Asset: {r.asset_name}")
                    print(f"   Status: {r.status}")
                    print(f"   Requester: {req_user.full_name if req_user else 'Unknown'}")
                    print(f"   Requester Dept: {req_user.department if req_user else 'N/A'}")
                    print(f"   Requester Domain: {req_user.domain if req_user else 'N/A'}")
                    print(f"   Created: {r.created_at}")
                    
                    # Check if this should be visible to manager
                    if req_user:
                        for m in managers:
                            dept_match = m.department and req_user.department and m.department.lower() in req_user.department.lower()
                            domain_match = m.domain and req_user.domain and m.domain.lower() in req_user.domain.lower()
                            
                            if dept_match or domain_match:
                                print(f"   [OK] SHOULD BE VISIBLE to {m.full_name}")
                                print(f"      Dept Match: {dept_match} | Domain Match: {domain_match}")
                            else:
                                print(f"   [X] NOT VISIBLE to {m.full_name}")
                                print(f"      Manager Dept: {m.department} vs User Dept: {req_user.department}")
                                print(f"      Manager Domain: {m.domain} vs User Domain: {req_user.domain}")

if __name__ == "__main__":
    asyncio.run(debug_manager_visibility())
