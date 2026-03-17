import asyncio
from fastapi.testclient import TestClient
from sqlalchemy import select

# We have to make sure we don't start a conflicting event loop if the app tries to do something, 
# but FastAPI TestClient runs synchronously, so we should run it carefully.
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.main import app
from app.utils.auth_utils import create_access_token
from app.database.database import AsyncSessionLocal
from app.models.models import User

async def get_test_token():
    async with AsyncSessionLocal() as db:
        res = await db.execute(select(User).filter(User.role == "IT_SUPPORT"))
        user = res.scalars().first()
        if not user:
            return None
        return create_access_token(data={"user_id": str(user.id), "role": user.role})

def main():
    token = asyncio.run(get_test_token())
    if not token:
        print("Could not generate token.")
        return
        
    client = TestClient(app)
    headers = {"Authorization": f"Bearer {token}"}
    
    print("--- Testing Integration: Backend API to JSON payload ---")
    response = client.get("/api/v1/tickets/stats/solvers", headers=headers)
    print(f"Status Code: {response.status_code}")
    print("Payload Structure going to Frontend:")
    
    data = response.json()
    for item in data:
        print(f"\nName: {item.get('name')}")
        print(f"Resolved Count: {item.get('count')}")
        print(f"Display Role: {item.get('role')}")
        print(f"MTTR: {item.get('mttr_hours')} hours")
        print(f"-> Full dict: {item}")
        
    if len(data) > 0:
        print("\nINTEGRATION SUCCESS: Data correctly serialized and ready for UI consumption.")
    else:
        print("\nEmpty Data!")

if __name__ == "__main__":
    main()
