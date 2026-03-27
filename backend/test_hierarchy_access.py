import httpx
import asyncio

async def test_hierarchy():
    token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJpdF9zdGFmZkBpdHNtLmNvbSIsInVzZXJfaWQiOiI3YzM3YjI4Yy0zYjBjLTQxYzUtODIxMS02MzQzZTk3M2E3ZWYiLCJyb2xlIjoiSVRfU1VQUE9SVCIsImV4cCI6MTc3NDEwMzA1OCwidHlwZSI6ImFjY2VzcyJ9.YrWpBG_YXxCY0ygNaC0iCj6RP_0pMo-pvPO1XIh6QoA"
    async with httpx.AsyncClient() as client:
        response = await client.get(
            "http://127.0.0.1:8000/api/v1/users/hierarchy",
            headers={"Authorization": f"Bearer {token}"}
        )
        print(f"Status: {response.status_code}")
        if response.status_code == 200:
            print("Successfully fetched hierarchy!")
        else:
            print(f"Error: {response.text}")

if __name__ == "__main__":
    asyncio.run(test_hierarchy())
