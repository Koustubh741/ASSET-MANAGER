import asyncio
import httpx
import uuid
from datetime import datetime

API_URL = "http://localhost:8000/api/v1"

async def test_compliance():
    print("=== SOFTWARE COMPLIANCE TEST ===")
    
    async with httpx.AsyncClient(timeout=10.0) as client:
        # 1. Login as Admin
        resp = await client.post(f"{API_URL}/auth/login", data={"username": "admin@itsm.com", "password": "password123"})
        if resp.status_code != 200:
            print(f"Login failed: {resp.text}")
            return
        token = resp.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        
        # 2. Create a Managed License
        software_name = f"Test Software {uuid.uuid4().hex[:4]}"
        license_data = {
            "name": software_name,
            "vendor": "Test Vendor",
            "seat_count": 3,
            "cost": 300.0,
            "status": "Active"
        }
        resp = await client.post(f"{API_URL}/software", json=license_data, headers=headers)
        if resp.status_code != 201:
            print(f"Failed to create license: {resp.text}")
            return
        lic = resp.json()
        print(f"Created Managed License: {software_name} (3 Seats)")
        
        # 3. Check reconciliation (should be 0 installs)
        resp = await client.get(f"{API_URL}/software/reconciliation", headers=headers)
        report = resp.json()
        lic_report = next((r for r in report if r["license_id"] == lic["id"]), None)
        print(f"Initial Reconciliation: {lic_report['install_count']} installs, Status: {lic_report['compliance_status']}")
        
        # 4. Mock some discovery data
        print("Submitting mock discovery data (5 installs)...")
        agent_headers = {"X-Agent-Key": "agent_secret_key_2026"}
        
        for i in range(5):
            collect_data = {
                "agent_id": str(uuid.uuid4()),
                "hostname": f"test-host-{i}",
                "ip_address": f"10.0.0.{i}",
                "hardware": {
                    "cpu": "Test CPU",
                    "ram_mb": 8192,
                    "serial": f"TEST-SN-{software_name}-{i}",
                    "model": "Test Model",
                    "vendor": "Test Vendor"
                },
                "os": {
                    "name": "Test OS",
                    "version": "1.0",
                    "uptime_sec": 3600
                },
                "software": [
                    {
                        "name": software_name,
                        "version": "1.0",
                        "vendor": "Test Vendor"
                    }
                ]
            }
            resp = await client.post(f"{API_URL}/collect", json=collect_data, headers=agent_headers)
            if resp.status_code != 200:
                print(f"Collection failed: {resp.text}")
                return
            await asyncio.sleep(0.5) # Small delay to avoid saturating the local server
            
        # 5. Check reconciliation again (should be RISK / 5 installs)
        resp = await client.get(f"{API_URL}/software/reconciliation", headers=headers)
        report = resp.json()
        lic_report = next((r for r in report if r["license_id"] == lic["id"]), None)
        
        print("\n=== RESULTS ===")
        print(f"Installs Found: {lic_report['install_count']}")
        print(f"Utilization: {lic_report['utilization_rate']}%")
        print(f"Status: {lic_report['compliance_status']}")
        print(f"Financial Impact: ${lic_report['financial_impact']}")
        
        if lic_report['compliance_status'] == "RISK":
            print("\n[SUCCESS] Reconciliation logic correctly identified compliance RISK.")
        else:
            print("\n[FAILED] Expected RISK status.")

if __name__ == "__main__":
    asyncio.run(test_compliance())
