import asyncio
import json
from app.database.database import get_db
from app.services import asset_request_service
from app.models.models import User
from sqlalchemy.future import select

async def test_manager_response():
    manager_email = 'manager@gmail.com'
    print(f"Testing response for {manager_email}")
    
    async for db in get_db():
        # Get manager details
        res = await db.execute(select(User).filter(User.email == manager_email))
        manager = res.scalars().first()
        
        if not manager:
            print(f"Error: {manager_email} not found")
            return

        print(f"Manager ID: {manager.id} | Domain: {manager.domain} | Position: {manager.position}")

        # Call the service method as it would be called from the router
        requests = await asset_request_service.get_all_asset_requests(
            db,
            domain=manager.domain,
            user_role=manager.role
        )
        
        print(f"\nResponse Count (for domain {manager.domain}): {len(requests)}")
        for r in requests:
            # The service returns response models, let's look at key fields
            print(f" - {r.id}: {r.asset_name} | {r.status} | Requester Domain Check...")
            
            # Check the requester's domain manually too
            requester_res = await db.execute(select(User).filter(User.id == r.requester_id))
            req_user = requester_res.scalars().first()
            print(f"   Requester: {req_user.email if req_user else 'Unknown'} | Domain: {req_user.domain if req_user else 'N/A'}")

        break

if __name__ == "__main__":
    asyncio.run(test_manager_response())
