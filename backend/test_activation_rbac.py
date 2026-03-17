import requests
import json
import uuid

BASE_URL = "http://127.0.0.1:8000/api/v1"
ADMIN_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhZG1pbkBpdHNtLmNvbSIsInVzZXJfaWQiOiI4ZmU0MjU3MS1kMGRmLTQwMjgtYWMwNC04MGRiNWI0YWRjNWQiLCJyb2xlIjoiQURNSU4iLCJleHAiOjE3NzEyMDM5NzYsInR5cGUiOiJhY2Nlc3MifQ.rNxMCoQXUxDbkJSSiDYJfrQDcCLK6KhAT3R_Em9tgvM"

def test_activation():
    # Attempt to activate a user (even a random UUID to see if we get past Auth)
    test_uuid = "df22b4d5-9c4f-4afc-a777-9810b88c5dbf"
    url = f"{BASE_URL}/auth/users/{test_uuid}/activate"
    
    headers = {
        "Authorization": f"Bearer {ADMIN_TOKEN}",
        "Content-Type": "application/json"
    }
    
    print(f"Testing activation for {test_uuid} with ADMIN role token...")
    try:
        response = requests.post(url, headers=headers)
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.text}")
        
        if response.status_code == 200:
            print("SUCCESS: ADMIN token successfully authorized for activation.")
        elif response.status_code == 404:
            print("SUCCESS: Authorized by RBAC (returned 404 because user might not exist in current DB, but 404 is better than 403).")
        elif response.status_code == 403:
            print("FAILURE: Still receiving 403 Forbidden.")
        else:
            print(f"Unexpected status code: {response.status_code}")
            
    except Exception as e:
        print(f"Error during request: {e}")

if __name__ == "__main__":
    test_activation()
