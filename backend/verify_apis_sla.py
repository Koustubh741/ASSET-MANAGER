import requests
import json
from uuid import UUID

def verify_api_hooks():
    ticket_id = "98cfca5a-90a8-4ff9-a38d-09fddc3c00d8"
    base_url = "http://localhost:8000/api/v1"
    
    # We need a token. Let's assume there's a test user or just bypass auth for local tests if possible.
    # Actually, the quickest way to verify the hooks is via another internal script that tests the router function directly.
    # But let's try to get a token first.
    
    login_data = {"username": "kuldeep.kumar@cachedigitech.com", "password": "password123"}
    login_res = requests.post(f"{base_url}/auth/login", data=login_data)
    if login_res.status_code != 200:
        print("Login failed:", login_res.text)
        return
    
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    
    # 1. Acknowledge
    print(f"Calling Acknowledge for {ticket_id}...")
    ack_res = requests.post(f"{base_url}/tickets/{ticket_id}/acknowledge", headers=headers, json={"notes": "API Hook Test"})
    if ack_res.status_code == 200:
        data = ack_res.json()
        print(f"Response Status: {data.get('sla_response_status')}")
    else:
        print("Acknowledge API failed:", ack_res.text)
    
    # 2. Resolve
    print(f"Calling Resolve for {ticket_id}...")
    res_res = requests.post(f"{base_url}/tickets/{ticket_id}/resolve", headers=headers, json={"notes": "API Hook Test Resolve", "checklist": [], "percentage": 100})
    if res_res.status_code == 200:
        data = res_res.json()
        print(f"Resolution Status: {data.get('sla_resolution_status')}")
    else:
        print("Resolve API failed:", res_res.text)

if __name__ == "__main__":
    verify_api_hooks()
