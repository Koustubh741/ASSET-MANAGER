
import httpx
import asyncio

async def verify():
    async with httpx.AsyncClient() as client:
        print("Testing Backend Connectivity...")
        try:
            # Note: This will likely return 401/403 without a token,
            # but we can check if it returns 200/401/403 instead of "Connection Reset" or 500.
            # If it's a 500 or connection reset, the root fix failed.
            
            # 1. Check Tickets Stats
            resp = await client.get("http://127.0.0.1:8000/api/v1/tickets/stats/category?range_days=30")
            print(f"Tickets Stats Response: {resp.status_code}")
            
            # 2. Check Executive Summary
            resp = await client.get("http://127.0.0.1:8000/api/v1/analytics/executive/summary")
            print(f"Executive Summary Response: {resp.status_code}")
            
            # 3. Check Notifications
            resp = await client.get("http://127.0.0.1:8000/api/v1/notifications")
            print(f"Notifications Response: {resp.status_code}")

        except Exception as e:
            print(f"Verification Failed with Exception: {e}")

if __name__ == "__main__":
    asyncio.run(verify())
