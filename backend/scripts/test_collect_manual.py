import requests
import json
import os

url = "http://127.0.0.1:8000/api/v1/collect"
headers = {
    "Content-Type": "application/json",
    "X-Agent-Key": "agent_secret_key_2026"
}
payload = {
    "agent_id": "b83c9a00-0000-0000-0000-000000000000",
    "hostname": "debug-host",
    "hardware": {
        "cpu": "DebugCPU",
        "ram_mb": 2048,
        "serial": "DEBUG-SN-002",
        "model": "DebugModel"
    },
    "os": {
        "name": "DebugOS",
        "version": "1.0",
        "uptime_sec": 3600
    }
}

try:
    print(f"Sending POST to {url}...")
    print(f"Headers: {headers}")
    response = requests.post(url, json=payload, headers=headers)
    print(f"Status Code: {response.status_code}")
    print(f"Response Body: {response.text}")
    print(f"Response Headers: {response.headers}")
except Exception as e:
    print(f"Error: {e}")
