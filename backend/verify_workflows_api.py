import asyncio
import json
import sys
import os

# Add backend to path
sys.path.append(os.getcwd())

from sqlalchemy import select
from app.database.database import AsyncSessionLocal
from app.models.models import User
from app.utils import auth_utils
import httpx

async def verify_endpoints():
    async with AsyncSessionLocal() as db:
        # Get itsm manager
        result = await db.execute(select(User).where(User.email == "it_manager@itsm.com"))
        user = result.scalars().first()
        if not user:
            print("User it_manager@itsm.com not found")
            return

        token_data = {"sub": user.email, "user_id": str(user.id), "role": user.role}
        token = auth_utils.create_access_token(data=token_data)
        headers = {"Authorization": f"Bearer {token}"}
        base_url = "http://localhost:8000/api/v1"

        print("\n--- Verifying /workflows/renewals ---")
        async with httpx.AsyncClient() as client:
            r = await client.get(f"{base_url}/workflows/renewals", headers=headers)
            print(f"Status: {r.status_code}")
            if r.status_code == 200:
                data = r.json()
                print(f"Results: {len(data)}")
                if data:
                    print(f"Sample: {json.dumps(data[0], indent=2)}")

            print("\n--- Verifying /workflows/procurement ---")
            r = await client.get(f"{base_url}/workflows/procurement", headers=headers)
            print(f"Status: {r.status_code}")
            if r.status_code == 200:
                data = r.json()
                print(f"Results: {len(data)}")
                if data:
                    print(f"Sample: {json.dumps(data[0], indent=2)}")

            print("\n--- Verifying /workflows/disposal ---")
            r = await client.get(f"{base_url}/workflows/disposal", headers=headers)
            print(f"Status: {r.status_code}")
            if r.status_code == 200:
                data = r.json()
                print(f"Results: {len(data)}")
                if data:
                    print(f"Sample: {json.dumps(data[0], indent=2)}")

if __name__ == "__main__":
    import os
    import sys
    sys.path.append(os.getcwd())
    asyncio.run(verify_endpoints())
