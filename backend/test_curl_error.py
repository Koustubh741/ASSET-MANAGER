import asyncio
import httpx

async def test_api():
    async with httpx.AsyncClient() as client:
        # Test port 8000 as configured in the frontend
        url = "http://127.0.0.1:8000/health"
        try:
            response = await client.get(url, timeout=5)
            print(f"Status Code: {response.status_code}")
            print(f"Response Body: {response.text}")
        except Exception as e:
            print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(test_api())
