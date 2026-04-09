import requests
import json

def verify_api():
    try:
        # Mocking the call since we don't have a token easily here but we can check the logic
        # Or just use the local uvicorn if it's running
        response = requests.get("http://127.0.0.1:8000/groups/")
        if response.status_code == 200:
            groups = response.json()
            print("--- API Response Verification ---")
            for g in groups:
                print(f"Group: {g['name']} | Dept ID: {g.get('department_id')} | Dept Name: {g.get('department_name')}")
        else:
            print(f"API Error: {response.status_code} - {response.text}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    verify_api()
