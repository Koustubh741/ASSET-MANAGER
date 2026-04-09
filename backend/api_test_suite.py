
import requests
import json
import uuid

# Configuration
API_BASE_URL = "http://127.0.0.1:8000/api/v1"
TEST_USER = "admin@itsm.com" # Admin
TEST_PASS = "password123" # Verified password from scripts

def test_integration_audit():
    print("--- STARTING API INTEGRATION AUDIT (FIXES VERIFICATION) ---")
    
    # 1. Login to get token
    print("Step 1: Authenticating...")
    login_url = f"{API_BASE_URL}/auth/login"
    login_data = {
        "username": TEST_USER,
        "password": TEST_PASS
    }
    
    try:
        response = requests.post(login_url, data=login_data)
        if response.status_code != 200:
            print(f"❌ Login failed: {response.text}")
            return
        
        token = response.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        print("✅ Login successful.")

        # 2. Test User Filtering by Department
        # This verifies the logic in fetchTechnicians
        target_dept = "Executive Management"
        print(f"\nStep 2: Testing user filtering for department: '{target_dept}'")
        users_url = f"{API_BASE_URL}/auth/users?status=ACTIVE&department={target_dept}"
        
        u_resp = requests.get(users_url, headers=headers)
        if u_resp.status_code != 200:
            print(f"❌ User fetch failed: {u_resp.text}")
            return
            
        users = u_resp.json()
        print(f"✅ Received {len(users)} users.")
        for u in users:
            print(f" - {u['full_name']} | Dept: {u['department']} | Role: {u['role']}")

        # 3. Test Ticket Assignment (Body-based)
        # We'll use the Product Management ticket: fbd4376b-daaa-494e-9288-f9fe884d6ac8
        # And assign it to 'Executive Management Support' (id from previous query)
        ticket_id = "fbd4376b-daaa-494e-9288-f9fe884d6ac8"
        # Find a suitable tech from the list
        if not users:
            print("❌ No available technicians found to test assignment.")
            return
            
        tech_id = users[0]["id"]
        tech_name = users[0]["full_name"]
        
        print(f"\nStep 3: Testing Ticket Assignment (Body-based) for Ticket: {ticket_id}")
        print(f"Assigning to: {tech_name} ({tech_id})")
        
        assign_url = f"{API_BASE_URL}/tickets/{ticket_id}/assign"
        assign_payload = {"agent_id": tech_id}
        
        a_resp = requests.post(assign_url, headers=headers, json=assign_payload)
        
        if a_resp.status_code == 200:
            print(f"✅ Assignment successful! Status: {a_resp.json().get('status')}")
            print(f"✅ Assigned To: {a_resp.json().get('assigned_to_name')}")
        else:
            print(f"❌ Assignment failed: {a_resp.status_code} - {a_resp.text}")

        print("\n--- API INTEGRATION AUDIT COMPLETE ---")

    except Exception as e:
        print(f"❌ Connection error: {str(e)}")
        print("Ensure the backend server is running on http://127.0.0.1:8000")

if __name__ == "__main__":
    test_integration_audit()
