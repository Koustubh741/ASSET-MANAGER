import requests
import time
import json

BASE_URL = "http://127.0.0.1:8000"
URL = f"{BASE_URL}/api/v1/auth/register"

def test_post():
    data = {
        "email": f"test_post_{int(time.time())}@test.com",
        "password": "testpass123",
        "full_name": "Test Post User",
        "role": "END_USER"
    }
    
    print(f"POSTing to {URL}...")
    print(f"Data: {json.dumps(data)}")
    
    try:
        r = requests.post(URL, json=data, timeout=5)
        print(f"Status Code: {r.status_code}")
        print(f"Response: {r.text}")
        print(f"Headers: {r.headers}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_post()
