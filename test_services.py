import requests
import time

def check_service(url, name):
    print(f"Checking {name} at {url}...")
    try:
        response = requests.get(url, timeout=5)
        print(f"✅ {name} is up! Status: {response.status_code}")
        return True
    except Exception as e:
        print(f"❌ {name} is down: {e}")
        return False

if __name__ == "__main__":
    check_service("http://127.0.0.1:8000/docs", "Backend")
    check_service("http://127.0.0.1:3000", "Frontend")
