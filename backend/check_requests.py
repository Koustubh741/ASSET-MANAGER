
import asyncio
import os
import sys

# Add the backend directory to sys.path so we can import 'app'
sys.path.append(os.getcwd())

from sqlalchemy import select
from app.database.database import get_db_context
from app.models.models import AssetRequest

async def check_requests():
    async with get_db_context() as session:
        result = await session.execute(select(AssetRequest))
        requests = result.scalars().all()
        print(f"Total Asset Requests: {len(requests)}")
        
        for req in requests:
            print(f"ID: {req.id}, Status: {req.status}, Role: {getattr(req, 'current_owner_role', 'N/A')}, Stage: {getattr(req, 'procurement_stage', 'N/A')}")
            # Note: I need to check the actual attribute names in the model
            # AssetRequest has 'status' and 'procurement_finance_status'
            # The frontend uses 'currentOwnerRole' and 'procurementStage'
            # Let's check models.py again for how these are mapped to DB or if they are local props

if __name__ == "__main__":
    asyncio.run(check_requests())
