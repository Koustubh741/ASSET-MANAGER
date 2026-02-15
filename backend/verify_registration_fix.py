import asyncio
import os
import sys
import uuid

# Add the backend directory to sys.path
sys.path.append(os.getcwd())

from app.database.database import AsyncSessionLocal
from app.models.models import User, AssetRequest
from app.schemas.user_schema import UserCreate
from app.services import user_service, asset_request_service

async def verify_flow():
    async with AsyncSessionLocal() as session:
        # 1. Test registration with department
        unique_id = str(uuid.uuid4())[:8]
        user_data = UserCreate(
            email=f"test_dept_{unique_id}@example.com",
            full_name=f"Dept Test User {unique_id}",
            password="testpassword",
            department="Cloud",
            position="TEAM_MEMBER",
            role="END_USER"
        )
        new_user = await user_service.create_user(session, user_data)
        print(f"Created User: {new_user.full_name} | Dept: {new_user.department}")
        
        # 2. Test manager scoping (matching 'Cloud' in domain or department)
        # Find 'endcloud@gmail.com' who we know has domain='cloud'
        from sqlalchemy.future import select
        res = await session.execute(select(User).filter(User.email == 'endcloud@gmail.com'))
        manager = res.scalars().first()
        if manager:
            print(f"\nVerifying scoping for Manager: {manager.full_name} (Dept: {manager.department}, Domain: {manager.domain})")
            # This manager should see requests from 'cloud' users
            requests = await asset_request_service.get_all_asset_requests(session, department="cloud")
            print(f"Manager sees {len(requests)} requests for 'cloud'")
            for r in requests:
                print(f" - Request ID: {r.id}")
        else:
            print("\nManager 'endcloud@gmail.com' not found for scoping verification.")

if __name__ == "__main__":
    asyncio.run(verify_flow())
