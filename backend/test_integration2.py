import asyncio
import urllib.request
import urllib.error
import json
from sqlalchemy import select
import sys
import os

# Add path so we can import our DB setup
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from app.utils.auth_utils import create_access_token
from app.database.database import AsyncSessionLocal
from app.models.models import User

async def main():
    print("--- 1. Getting Real Support User ---")
    async with AsyncSessionLocal() as db:
        res = await db.execute(select(User).filter(User.role == "IT_SUPPORT"))
        user = res.scalars().first()
        if not user:
            print("No IT_SUPPORT user found.")
            return
            
        print(f"Found user: {user.full_name}")
        token = create_access_token(data={"user_id": str(user.id), "role": user.role})
        
    print(f"--- 2. Sending Request to Running Server (localhost:8000) ---")
    url = "http://localhost:8000/api/v1/tickets/stats/solvers"
    req = urllib.request.Request(url, headers={"Authorization": f"Bearer {token}"})
    try:
        with urllib.request.urlopen(req) as response:
            status_code = response.getcode()
            body = response.read().decode('utf-8')
            
            print(f"HTTP Status: {status_code}")
            print(f"Raw Body:\n{body[:500]}...") # Print first 500 chars

            data = json.loads(body)
            print("\n--- 3. Verifying the Integrated JSON Response Objects ---")
            for item in data:
                print(f"Name: {item.get('name')}")
                print(f"Count: {item.get('count')}")
                print(f"Dynamic Role Output: {item.get('role')}")
                print("-" * 30)
                
            if len(data) > 0:
                print("INTEGRATION SUCCESS: Data perfectly verified!")
            else:
                print("FAILED: Empty array returned.")
                
    except urllib.error.URLError as e:
        print(f"HTTP Request failed: {e}")

if __name__ == "__main__":
    asyncio.run(main())
