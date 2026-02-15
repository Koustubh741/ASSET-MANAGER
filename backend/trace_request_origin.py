"""
Trace the origin of specific asset requests shown in the UI
"""
import asyncio
from app.database.database import get_db
from app.models.models import User, AssetRequest
from sqlalchemy.future import select

async def trace_requests():
    print("=== TRACING REQUEST ORIGINS ===\n")
    
    async for db in get_db():
        # Search for the requests visible in the screenshot
        result = await db.execute(
            select(AssetRequest)
            .filter(AssetRequest.asset_name.ilike('%MONITOR%') | 
                   AssetRequest.asset_name.ilike('%LAPTOP%HIGHPERF%'))
            .order_by(AssetRequest.created_at.desc())
            .limit(10)
        )
        requests = result.scalars().all()
        
        print(f"Found {len(requests)} matching requests:\n")
        
        for req in requests:
            # Get requester details
            user_result = await db.execute(
                select(User).filter(User.id == req.requester_id)
            )
            requester = user_result.scalars().first()
            
            print(f"Request: {req.asset_name}")
            print(f"  ID: {req.id}")
            print(f"  Status: {req.status}")
            print(f"  Created: {req.created_at}")
            print(f"  Requester: {requester.email if requester else 'Unknown'}")
            if requester:
                print(f"    - Role: {requester.role}")
                print(f"    - Position: {requester.position}")
                print(f"    - Domain: {requester.domain}")
            print(f"  Business Justification: {req.business_justification}")
            print()
        
        break

if __name__ == "__main__":
    asyncio.run(trace_requests())
