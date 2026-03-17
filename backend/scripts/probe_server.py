import requests
import sys

BASE_URL = "http://127.0.0.1:8000"

def probe():
    print(f"Probing {BASE_URL}...")
    
    # Check Health
    try:
        r = requests.get(f"{BASE_URL}/health", timeout=2)
        print(f"/health: {r.status_code}")
    except Exception as e:
        print(f"/health failed: {e}")
        return

    # Check /api/v1/auth/register (POST only)
    # Using GET should return 405 Method Not Allowed if route exists
    # Using GET should return 404 Not Found if route DOES NOT exist
    try:
        r = requests.get(f"{BASE_URL}/api/v1/auth/register", timeout=2)
        print(f"/api/v1/auth/register (GET): {r.status_code}")
    except Exception as e:
        print(f"/api/v1/auth/register failed: {e}")

    # Check /auth/register (Old path?)
    try:
        r = requests.get(f"{BASE_URL}/auth/register", timeout=2)
        print(f"/auth/register (GET): {r.status_code}")
    except Exception as e:
        print(f"/auth/register failed: {e}")

    # Check /api/v1/openapi.json
    try:
        r = requests.get(f"{BASE_URL}/api/v1/openapi.json", timeout=2)
        print(f"/api/v1/openapi.json: {r.status_code}")
    except Exception as e:
        print(f"/api/v1/openapi.json failed: {e}")

    # Check /openapi.json
    try:
        r = requests.get(f"{BASE_URL}/openapi.json", timeout=2)
        print(f"/openapi.json: {r.status_code}")
    except Exception as e:
        print(f"/openapi.json failed: {e}")

if __name__ == "__main__":
    probe()
