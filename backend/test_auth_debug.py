import requests
import json

url = "http://127.0.0.1:8000/debug-auth"
token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJpdF9zdGFmZkBpdHNtLmNvbSIsInVzZXJfaWQiOiI3YzM3YjI4Yy0zYjBjLTQxYzUtODIxMS02MzQzZTk3M2E3ZWYiLCJyb2xlIjoiSVRfU1VQUE9SVCIsImV4cCI6MTc3NDEwMzA1OCwidHlwZSI6ImFjY2VzcyJ9.YrWpBG_YXxCY0ygNaC0iCj6RP_0pMo-pvPO1XIh6QoA"

headers = {
    "Authorization": f"Bearer {token}"
}

response = requests.get(url, headers=headers)
print(f"Status Code: {response.status_code}")
if response.status_code == 200:
    print(json.dumps(response.json(), indent=2))
else:
    print(f"Error: {response.text}")
