import requests
import json

BASE_URL = "http://localhost:8000/api/v1"
OPENAPI_URL = "http://localhost:8000/openapi.json"

print(f"[*] Fetching OpenAPI schema from {OPENAPI_URL}...")

try:
    response = requests.get(OPENAPI_URL, timeout=5)

    if response.status_code == 200:
        schema = response.json()
        paths = schema.get('paths', {})
        
        print(f"\n[OK] Total endpoints: {len(paths)}")
        
        workflow_endpoints = {
            "Renewals": "/api/v1/workflows/renewals",
            "Procurement": "/api/v1/workflows/procurement",
            "Disposal": "/api/v1/workflows/disposal",
            "Action": "/api/v1/workflows/action",
        }

        
        print("\nWorkflow Endpoints Check:")
        print("-" * 70)
        
        found_all = True
        for name, endpoint_pattern in workflow_endpoints.items():
            if endpoint_pattern in paths:
                print(f"[OK] {name}: Found as {endpoint_pattern}")
            else:
                print(f"[ERR] {name}: Not found")
                found_all = False
        
        if found_all:
            print("\n[SUCCESS] All specialized workflow endpoints are verified.")
        else:
            print("\n[WARNING] Some specialized workflow endpoints are missing.")
            
    else:
        print(f"[ERR] Failed to fetch OpenAPI schema: {response.status_code}")
except Exception as e:
    print(f"[ERR] Error connecting to backend: {e}")

print("\n[*] Endpoint validation complete")
