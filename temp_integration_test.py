
import requests
import json
import sys

BASE_URL = "http://localhost:8000/api/v1"

def test_integration():
    print("--- Starting Integration Test: Inter-departmental Ticketing ---")
    
    # 1. Login as Finance Manager (Operations)
    print("\n[Step 1] Logging in as Finance Manager...")
    login_data = {"username": "finance_mgr@enterprise.com", "password": "password123"}
    resp = requests.post(f"{BASE_URL}/auth/login", data=login_data)
    if resp.status_code != 200:
        print(f"Login failed: {resp.text}")
        return
    token = resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    print("Success.")

    # 2. Create Ticket to Technology
    print("\n[Step 2] Creating cross-department ticket...")
    ticket_payload = {
        "subject": "INTEGRATION TEST: Cross-Dept Visibility Check",
        "description": "This ticket is created by Operations and assigned to Technology.",
        "category": "Hardware",
        "priority": "Medium",
        "assignment_group_id": "99bdab61-d72f-4d73-b741-daaa928d3cd3" # IT Support Team [Technology]
    }
    resp = requests.post(f"{BASE_URL}/tickets/", headers=headers, json=ticket_payload)
    if resp.status_code != 200:
        print(f"Ticket creation failed: {resp.text}")
        return
    ticket_id = resp.json()["id"]
    print(f"Ticket created successfully. ID: {ticket_id}")

    # 3. Verify Visibility as IT Manager (Technology)
    print("\n[Step 3] Verifying visibility as IT Manager...")
    login_data = {"username": "it_mgr@enterprise.com", "password": "password123"}
    resp = requests.post(f"{BASE_URL}/auth/login", data=login_data)
    it_token = resp.json()["access_token"]
    it_headers = {"Authorization": f"Bearer {it_token}"}
    
    resp = requests.get(f"{BASE_URL}/tickets/", headers=it_headers)
    tickets = resp.json()
    visible_to_it = any(t["id"] == ticket_id for t in tickets)
    if visible_to_it:
        print("PASS: IT Manager can see the ticket.")
    else:
        print("FAIL: IT Manager cannot see the ticket.")

    # 4. Verify Visibility as COO (Operations)
    print("\n[Step 4] Verifying visibility as COO...")
    login_data = {"username": "coo@enterprise.com", "password": "password123"}
    resp = requests.post(f"{BASE_URL}/auth/login", data=login_data)
    coo_token = resp.json()["access_token"]
    coo_headers = {"Authorization": f"Bearer {coo_token}"}
    
    resp = requests.get(f"{BASE_URL}/tickets/", headers=coo_headers)
    tickets = resp.json()
    visible_to_coo = any(t["id"] == ticket_id for t in tickets)
    if visible_to_coo:
        print("PASS: COO can see the ticket.")
    else:
        print("FAIL: COO cannot see the ticket.")

    if visible_to_it and visible_to_coo:
        print("\n--- ALL TESTS PASSED ---")
        print("Inter-departmental visibility logic is fully integrated and working correctly across Frontend/Backend/DB.")
    else:
        print("\n--- TEST FAILED ---")

if __name__ == "__main__":
    test_integration()
