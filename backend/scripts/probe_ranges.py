import requests
import json

BASE_URL = "http://localhost:8000/api/v1"

def probe_ranges():
    for d in [7, 30, 90]:
        resp = requests.get(f"{BASE_URL}/tickets/stats/category?range_days={d}")
        if resp.status_code == 200:
            data = resp.json()
            total = sum(c.get('total', 0) for c in data.get('stats', []))
            print(f"[{d} days]: Total Tickets = {total}")
        else:
            print(f"[{d} days]: Failed ({resp.status_code})")

if __name__ == "__main__":
    probe_ranges()
