import requests
import sys
import uuid

BASE_URL = "http://localhost:8000/api/v1"

def test_sla_evolution():
    # 1. Login as Admin
    print("--- Phase 1: Authentication ---")
    login_res = requests.post(
        f"{BASE_URL}/auth/login",
        data={"username": "admin@itsm.com", "password": "password123"}
    )
    if login_res.status_code != 200:
        print(f"FAILED: Login failed ({login_res.status_code})")
        return
    
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    print("SUCCESS: Logged in as Admin")

    # 2. Create Policy
    print("\n--- Phase 2: Create Policy ---")
    policy_name = f"TEST_SLA_{uuid.uuid4().hex[:6]}"
    # API uses query params for creation based on current implementation
    create_res = requests.post(
        f"{BASE_URL}/tickets/sla-policies",
        params={
            "name": policy_name,
            "priority": "Low",
            "res_min": 60,
            "rem_min": 300
        },
        headers=headers
    )
    if create_res.status_code != 200:
        print(f"FAILED: Create policy failed ({create_res.status_code})")
        print(create_res.text)
        return
    
    policy = create_res.json()
    policy_id = policy["id"]
    print(f"SUCCESS: Created policy {policy_name} (ID: {policy_id})")

    # 3. Update Policy
    print("\n--- Phase 3: Update Policy ---")
    update_data = {
        "name": f"{policy_name}_UPDATED",
        "resolution_time_limit": 600,
        "is_active": False
    }
    update_res = requests.patch(
        f"{BASE_URL}/tickets/sla-policies/{policy_id}",
        json=update_data,
        headers=headers
    )
    if update_res.status_code != 200:
        print(f"FAILED: Update policy failed ({update_res.status_code})")
        print(update_res.text)
        return
    
    updated_policy = update_res.json()
    if updated_policy["name"] == update_data["name"] and updated_policy["resolution_time_limit"] == 600 and updated_policy["is_active"] == False:
        print("SUCCESS: Policy updated correctly")
    else:
        print("FAILED: Data mismatch in updated policy")
        print(updated_policy)

    # 4. Cleanup
    print("\n--- Phase 4: Cleanup ---")
    delete_res = requests.delete(
        f"{BASE_URL}/tickets/sla-policies/{policy_id}",
        headers=headers
    )
    if delete_res.status_code == 200:
        print("SUCCESS: Deleted test policy")
    else:
        print(f"FAILED: Delete failed ({delete_res.status_code})")

if __name__ == "__main__":
    test_sla_evolution()
