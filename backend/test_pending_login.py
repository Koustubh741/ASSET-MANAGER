import requests

url = "http://127.0.0.1:8000/api/v1/auth/login"
data = {
    "username": "user_test_201428@company.com",
    "password": "password123"
}

headers = {
    "Content-Type": "application/x-www-form-urlencoded"
}

print("=== TESTING PENDING USER LOGIN ===\n")
try:
    response = requests.post(url, data=data, headers=headers)
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.text}")
except Exception as e:
    print(f"Error: {e}")
