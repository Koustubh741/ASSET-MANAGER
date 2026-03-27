import httpx
import asyncio
import json

async def test_stats():
    token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJpdF9zdGFmZkBpdHNtLmNvbSIsInVzZXJfaWQiOiI3YzM3YjI4Yy0zYjBjLTQxYzUtODIxMS02MzQzZTk3M2E3ZWYiLCJyb2xlIjoiSVRfU1VQUE9SVCIsImV4cCI6MTc3NDEwMzA1OCwidHlwZSI6ImFjY2VzcyJ9.YrWpBG_YXxCY0ygNaC0iCj6RP_0pMo-pvPO1XIh6QoA"
    async with httpx.AsyncClient() as client:
        response = await client.get(
            "http://127.0.0.1:8000/api/v1/assets/stats",
            headers={"Authorization": f"Bearer {token}"}
        )
        print(f"Status: {response.status_code}")
        if response.status_code == 200:
            stats = response.json()
            print(json.dumps(stats, indent=2))
            print(f"\n--- VERIFICATION ---")
            print(f"Total: {stats.get('total')}")
            print(f"Active (In Use): {stats.get('active')}")
            print(f"In Stock: {stats.get('in_stock')}")
        else:
            print(f"Error: {response.text}")

if __name__ == "__main__":
    asyncio.run(test_stats())
