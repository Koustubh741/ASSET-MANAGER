
import asyncio
import os
import sys

# Add the backend directory to sys.path
sys.path.append(os.getcwd())

from sqlalchemy import select
from app.database.database import get_db_context
from app.models.models import AssetRequest
from app.services.asset_request_service import _populate_requester_info

async def verify_enrichment():
    async with get_db_context() as session:
        # Get one PO_VALIDATED request
        result = await session.execute(select(AssetRequest).filter(AssetRequest.status == 'PO_VALIDATED'))
        req = result.scalars().first()
        
        if not req:
            # Fallback to any request
            result = await session.execute(select(AssetRequest).limit(1))
            req = result.scalars().first()
            
        if req:
            res = await _populate_requester_info(session, req, user_role="FINANCE")
            print(f"Request ID: {res.id}")
            print(f"Status: {res.status}")
            print(f"Current Owner Role: {res.current_owner_role}")
            print(f"Procurement Stage: {res.procurement_stage}")
            
            if res.current_owner_role is None:
                print("FAIL: Virtual fields are still None!")
            else:
                print("SUCCESS: Virtual fields populated correctly.")
        else:
            print("No requests found to verify.")

if __name__ == "__main__":
    asyncio.run(verify_enrichment())
