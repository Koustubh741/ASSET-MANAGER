import asyncio
import sys
import httpx
from uuid import UUID

from app.database.database import AsyncSessionLocal
from app.models.models import Asset, User
from app.utils.auth_utils import create_access_token
from sqlalchemy.future import select

import asyncio
import sys
import httpx
from uuid import UUID

from app.database.database import AsyncSessionLocal
from app.models.models import Asset, User
from app.utils.auth_utils import create_access_token
from sqlalchemy.future import select

async def verify_flow():
    # 1. Get user and create a token to simulate a logged-in session
    async with AsyncSessionLocal() as db:
        user_result = await db.execute(select(User).filter(User.email == 'koustubh@gmail.com'))
        target_user = user_result.scalars().first()
        
        if not target_user:
            print("User koustubh@gmail.com not found. Exiting.")
            return

        # Explicitly construct the payload identical to auth.py
        token = create_access_token(
            data={
                "sub": target_user.email,
                "role": target_user.role, 
                "position": target_user.position or "",
                "user_id": target_user.id
            }
        )

    headers = {"Authorization": f"Bearer {token}"}
    
    async with httpx.AsyncClient(base_url="http://localhost:8000/api/v1") as client:
        # 2. Fetch my-assets
        print("\n--- Fetching /assets/my-assets ---")
        response = await client.get("/assets/my-assets", headers=headers)
        if response.status_code != 200:
            print(f"Failed to fetch assets: {response.status_code} {response.text}")
            return
            
        assets = response.json()
        print(f"Found {len(assets)} assigned assets.")
        
        pending_assets = [a for a in assets if a.get('acceptance_status') == 'PENDING']
        print(f"Found {len(pending_assets)} pending verification assets.")
        
        if not pending_assets:
            print("No pending assets found. Run test script first.")
            return
            
        test_asset = pending_assets[0]
        print(f"Target test asset: {test_asset['name']} (ID: {test_asset['id']})")
        
        # 3. Accept test asset
        print("\n--- Verifying Asset (Accept) ---")
        patch_response = await client.patch(
            f"/assets/{test_asset['id']}/verification",
            headers=headers,
            json={"acceptance_status": "ACCEPTED"}
        )
        if patch_response.status_code != 200:
            print(f"Failed to accept asset: {patch_response.status_code} {patch_response.text}")
            return
            
        updated_asset = patch_response.json()
        print(f"Asset successfully accepted! New status: {updated_asset.get('acceptance_status')}")

if __name__ == "__main__":
    asyncio.run(verify_flow())
