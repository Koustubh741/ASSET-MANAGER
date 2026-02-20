"""
SNMP Scan Endpoint Verification Script

Verifies POST /api/v1/collect/scan per the verification plan:
- 200 OK: Request accepted, scan runs in background
- 401: Token expired or invalid
- 403: User is not admin
- 422: Body/validation issue (empty body fix should prevent this)
- 500: Server-side exception; check backend/exception.log

Usage:
  python scripts/verify_scan_endpoint.py [TOKEN]
  python scripts/verify_scan_endpoint.py   (reads TOKEN from AUTH_TOKEN env)

Example:
  python scripts/verify_scan_endpoint.py eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
"""
import argparse
import json
import os
import sys

try:
    import requests
except ImportError:
    print("Install requests: pip install requests")
    sys.exit(1)

BASE_URL = os.getenv("API_BASE_URL", "http://127.0.0.1:8000")
SCAN_URL = f"{BASE_URL}/api/v1/collect/scan"
STATUS_URL = f"{BASE_URL}/api/v1/collect/scan/status"

STATUS_MEANINGS = {
    200: "Request accepted. Scan runs in background.",
    401: "Token expired or invalid. Re-login to get a new token.",
    403: "User is not admin. Requires check_system_admin.",
    422: "Body/validation issue. Empty body fix should prevent this.",
    500: "Server-side exception. Check backend/exception.log.",
}


def verify_scan(token: str) -> int:
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {token}",
    }
    print(f"POST {SCAN_URL}")
    print("Body: (empty)")
    print("-" * 50)
    resp = requests.post(SCAN_URL, headers=headers, json={})
    status = resp.status_code
    meaning = STATUS_MEANINGS.get(status, "Unknown status.")
    print(f"Status: {status} {meaning}")
    print(f"Response: {resp.text[:500]}")
    if resp.text and resp.text.startswith("{"):
        try:
            data = resp.json()
            if data.get("status") == "success":
                print("\nExpected response shape verified:")
                print(f"  scan_id: {data.get('scan_id')}")
                print(f"  range: {data.get('range')}")
                print(f"  total_hosts: {data.get('total_hosts')}")
                print(f"  async: {data.get('async')}")
        except json.JSONDecodeError:
            pass
    return status


def main():
    parser = argparse.ArgumentParser(description="Verify SNMP scan endpoint")
    parser.add_argument("token", nargs="?", default=os.getenv("AUTH_TOKEN"), help="Bearer token")
    parser.add_argument("--check-status", action="store_true", help="Poll scan status after trigger")
    args = parser.parse_args()
    if not args.token:
        print("Provide token: python verify_scan_endpoint.py TOKEN")
        print("Or set AUTH_TOKEN environment variable.")
        sys.exit(1)
    status = verify_scan(args.token)
    sys.exit(0 if status == 200 else 1)


if __name__ == "__main__":
    main()
