"""
Test login endpoint for endcloud@gmail.com
"""
import requests

url = "http://127.0.0.1:8000/api/v1/auth/login"
data = {
    "username": "endcloud@gmail.com",
    "password": "password123"
}

headers = {
    "Content-Type": "application/x-www-form-urlencoded"
}

print("=== TESTING LOGIN ENDPOINT ===\n")
print(f"URL: {url}")
print(f"Username: {data['username']}")
print(f"Password: {data['password']}")
print()

try:
    response = requests.post(url, data=data, headers=headers)
    
    print(f"Status Code: {response.status_code}")
    print(f"Response:")
    print(response.text)
    
    if response.status_code == 200:
        print("\n[SUCCESS] Login successful!")
        json_response = response.json()
        if 'access_token' in json_response:
            print(f"Access Token: {json_response['access_token'][:50]}...")
    else:
        print(f"\n[ERROR] Login failed with status {response.status_code}")
        
except Exception as e:
    print(f"[ERROR] Request failed: {e}")
