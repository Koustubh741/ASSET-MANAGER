import requests
import os
from dotenv import load_dotenv

load_dotenv()

def trigger_sync():
    backend_url = os.getenv("BACKEND_URL", "http://127.0.0.1:8000")
    print(f"--- Triggering AD Sync via Backend: {backend_url} ---")
    try:
        # Note: This endpoint usually requires ADMIN auth, but let's see if we can trigger it
        # Actually, check_ADMIN might be needed.
        # I'll just check if the endpoint exists and responds.
        response = requests.post(f"{backend_url}/api/v1/collect/users/trigger")
        print(f"Status: {response.status_code}")
        print(f"Response: {response.json()}")
    except Exception as e:
        print(f"FAILED: {e}")

if __name__ == "__main__":
    trigger_sync()
