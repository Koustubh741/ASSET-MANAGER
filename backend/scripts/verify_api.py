import requests
import sys

BASE_URL = "http://127.0.0.1:8000"

print(f"Checking {BASE_URL}...")

try:
    # Check Health
    resp = requests.get(f"{BASE_URL}/health", timeout=5)
    print(f"GET /health: {resp.status_code}")
    if resp.status_code != 200:
        print(f"Error: {resp.text}")
        sys.exit(1)

    # Check OpenAPI
    resp = requests.get(f"{BASE_URL}/openapi.json", timeout=5)
    print(f"GET /openapi.json: {resp.status_code}")
    if resp.status_code != 200:
        print(f"Error: {resp.text}")
        sys.exit(1)
        
    print("API verification successful!")
    sys.exit(0)
    
except Exception as e:
    print(f"Verification failed: {e}")
    sys.exit(1)
