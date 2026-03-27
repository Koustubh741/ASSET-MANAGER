import requests

token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJpdF9zdGFmZkBpdHNtLmNvbSIsInVzZXJfaWQiOiI3YzM3YjI4Yy0zYjBjLTQxYzUtODIxMS02MzQzZTk3M2E3ZWYiLCJyb2xlIjoiSVRfU1VQUE9SVCIsImV4cCI6MTc3NDEwMzA1OCwidHlwZSI6ImFjY2VzcyJ9.YrWpBG_YXxCY0ygNaC0iCj6RP_0pMo-pvPO1XIh6QoA"
url = "http://127.0.0.1:8000/api/v1/assets"
headers = {
    "Accept": "*/*",
    "Authorization": f"Bearer {token}"
}

try:
    response = requests.get(url, headers=headers)
    print(f"Status Code: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(f"Number of assets returned: {len(data)}")
        if len(data) > 0:
            print("First 2 assets:")
            for i in range(min(2, len(data))):
                print(f" - {data[i]['name']} (Status: {data[i]['status']}, Department: {data[i].get('department')})")
    else:
        print(f"Error: {response.text}")
except Exception as e:
    print(f"Request failed: {e}")
