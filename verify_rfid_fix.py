import requests
import json

def verify_conflict():
    url = "http://127.0.0.1:8000/api/v1/assets/e27e0658-4218-46b9-9cdb-30fbf35b38d7"
    token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhZG1pbkBpdHNtLmNvbSIsInVzZXJfaWQiOiI4ZmU0MjU3MS1kMGRmLTQwMjgtYWMwNC04MGRiNWI0YWRjNWQiLCJyb2xlIjoiQURNSU4iLCJleHAiOjE3NzIwMDk5ODMsInR5cGUiOiJhY2Nlc3MifQ.JvpViF5ZJuWApeFNvrXoD4apRl7LRSbqBxTuBATT5CY"
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    payload = {"serial_number": "LAP-NDLSS-01-2026"}
    
    print(f"Testing duplicate serial assignment to: {url}")
    response = requests.patch(url, headers=headers, json=payload)
    
    print(f"Status Code: {response.status_code}")
    print(f"Response Body: {response.text}")
    
    if response.status_code == 409:
        print("PASS: Received 409 Conflict as expected.")
    else:
        print(f"FAIL: Expected 409, got {response.status_code}")

if __name__ == "__main__":
    verify_conflict()
