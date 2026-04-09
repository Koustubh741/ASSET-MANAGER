import requests
import json

url = "http://127.0.0.1:8000/api/v1/tickets/"
headers = {
    "Content-Type": "application/json",
    "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJmaW5hbmNlQHRlc3QuY29tIiwidXNlcl9pZCI6IjY1MDIwNzMxLTc4NTYtNGI0ZS05YmU0LTllYjI1MmFjNDEyMyIsInJvbGUiOiJGSU5BTkNFIiwiZXhwIjoxNzczNjgzOTc0LCJ0eXBlIjoiYWNjZXNzIn0.Bt3nm7TNEsW96CKYkluqix949_x0eqaVgXiMSiCpsRg"
}

# 1. Get Legal Department Group ID
groups_res = requests.get("http://127.0.0.1:8000/api/v1/groups/", headers=headers)
legal_group = next((g for g in groups_res.json() if g['name'] == "Legal Department"), None)

if not legal_group:
    print("ERROR: Legal Department group not found!")
    exit(1)

# 2. Create ticket for Legal
payload = {
    "subject": "Contract Review Request",
    "priority": "High",
    "description": "Please review the new vendor contract for the Finance team.",
    "assignment_group_id": legal_group['id'],
    "requestor_id": "65020731-7856-4b4e-9be4-9eb252ac4123"
}

print(f"Sending ticket to LEGAL: {json.dumps(payload, indent=2)}")
response = requests.post(url, json=payload, headers=headers)

if response.status_code == 200:
    res_data = response.json()
    print(f"SUCCESS: Ticket Created with ID {res_data['id']}")
    print(f"Assigned Group: {res_data['assignment_group_name']} ({res_data['assignment_group_department']})")
    
    if res_data['assignment_group_name'] == "Legal Department":
        print("--- FINAL VERIFICATION PASSED: Universal Integration works! ---")
    else:
        print("--- FINAL VERIFICATION FAILED: Wrong group assigned! ---")
else:
    print(f"ERROR: {response.status_code}")
    print(response.text)
