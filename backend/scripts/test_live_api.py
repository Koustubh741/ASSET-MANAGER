import requests
import json

BASE_URL = "http://localhost:8000/api/v1"

def test_live_stats():
    try:
        # First, we might need to login or use a token if it's protected
        # But let's try to hit a public/generic endpoint if any exists
        # Or just try the ticket stats directly
        resp = requests.get(f"{BASE_URL}/tickets/stats/category?range_days=7")
        if resp.status_code == 200:
            data = resp.json()
            print("--- Live API Ticket Stats ---")
            for stat in data.get("stats", []):
                print(f"{stat['category']}: {stat['total']} (Open: {stat['open']})")
        else:
            print(f"Error: {resp.status_code} - {resp.text}")
    except Exception as e:
        print(f"Connection failed: {e}")

if __name__ == "__main__":
    test_live_stats()
