"""
Test BYOD compliance flow - policy engine and compliance check endpoint.
"""
import asyncio
import httpx

API_URL = "http://localhost:8000/api/v1"


async def test_byod_compliance():
    print("\n=== BYOD Compliance Flow Test ===\n")

    async with httpx.AsyncClient(timeout=30.0) as client:
        # 1. Login as IT Manager
        print("1. Logging in as IT Manager (richardroper@gmail.com)...")
        login = await client.post(
            f"{API_URL}/auth/login",
            data={"username": "richardroper@gmail.com", "password": "password@123"}
        )
        if login.status_code != 200:
            # Fallback to it_manager
            login = await client.post(
                f"{API_URL}/auth/login",
                data={"username": "it_manager@itsm.com", "password": "password123"}
            )
        if login.status_code != 200:
            print(f"   FAIL: Login failed - {login.status_code} {login.text[:200]}")
            return False
        token = login.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        print("   OK: Logged in\n")

        # 2. Find a BYOD request (BYOD_COMPLIANCE_CHECK or IT_APPROVED)
        print("2. Fetching asset requests...")
        reqs = await client.get(f"{API_URL}/asset-requests?limit=50", headers=headers)
        if reqs.status_code != 200:
            print(f"   FAIL: Could not fetch requests - {reqs.status_code}")
            return False
        all_reqs = reqs.json()
        byod_reqs = [r for r in all_reqs if (r.get("asset_ownership_type") or r.get("asset_type") or "").upper() == "BYOD"]
        target = None
        for r in byod_reqs:
            status = (r.get("status") or "").upper()
            if status in ("BYOD_COMPLIANCE_CHECK", "IT_APPROVED", "MANAGER_CONFIRMED_IT"):
                target = r
                break
        if not target:
            print(f"   No BYOD request in BYOD_COMPLIANCE_CHECK/IT_APPROVED. Found {len(byod_reqs)} BYOD total.")
            if byod_reqs:
                print(f"   Sample: {byod_reqs[0].get('id')} status={byod_reqs[0].get('status')}")
            # Use known ID from earlier in conversation
            target_id = "9f85e6b3-1bf6-465c-90cd-0f2133cd1b23"
            print(f"   Trying known request ID: {target_id}\n")
        else:
            target_id = target["id"]
            print(f"   Found BYOD request: {target_id} (status={target.get('status')})\n")

        # 3. Dry run - test connectivity only
        print("3. Dry run (no backend logic)...")
        dry = await client.post(
            f"{API_URL}/asset-requests/{target_id}/byod-compliance-check",
            json={"dry_run": True},
            headers=headers
        )
        if dry.status_code != 200:
            print(f"   FAIL: Dry run failed - {dry.status_code} {dry.text[:300]}")
            return False
        dr = dry.json()
        assert dr.get("dry_run") and dr.get("success")
        print(f"   OK: {dr.get('message')}\n")

        # 4. Real compliance check
        print("4. Running BYOD compliance check (policy engine)...")
        check = await client.post(
            f"{API_URL}/asset-requests/{target_id}/byod-compliance-check",
            json={},
            headers=headers
        )
        if check.status_code != 200:
            print(f"   FAIL: Compliance check failed - {check.status_code}")
            print(f"   {check.text[:400]}")
            return False
        result = check.json()
        print(f"   Success: {result.get('success')}")
        print(f"   Final status: {result.get('final_status')}")
        mdm = result.get("mdm_enrollment", {})
        print(f"   Compliance status: {mdm.get('compliance_status')}")
        checks = mdm.get("compliance_checks", {})
        if checks:
            print(f"   Checks: {checks}")
        if mdm.get("remediation_steps"):
            print(f"   Remediation: {mdm['remediation_steps']}")
        print("   OK: Compliance check completed\n")

        # 5. Policy engine unit test - config-driven compliance
        print("5. Testing policy engine vs byod_policies.yaml...")
        from app.services.policy_engine import evaluate_compliance, _load_policies
        cfg = _load_policies()
        os_mins = cfg.get("os_minimums", {})
        print(f"   Config os_minimums: {os_mins}")

        # Devices meeting minimums should pass
        r1 = evaluate_compliance("MacBook Pro", "macOS 14", force_compliant=False)
        r2 = evaluate_compliance("Dell XPS", "Windows 10.0.19045", force_compliant=False)
        assert r1["all_compliant"], f"macOS 14 should pass (min {os_mins.get('macos')})"
        assert r2["all_compliant"], f"Win 10.0.19045 should pass (min {os_mins.get('windows')})"
        print(f"   macOS 14: PASS (compliant), platform={r1['platform']}")
        print(f"   Windows 10.0.19045: PASS (compliant), platform={r2['platform']}")

        # Old OS versions should fail
        r3 = evaluate_compliance("MacBook", "macOS 12", force_compliant=False)
        r4 = evaluate_compliance("HP Laptop", "Windows 8", force_compliant=False)
        assert not r3["all_compliant"], "macOS 12 should fail (min macOS 13)"
        assert not r4["all_compliant"], "Windows 8 should fail"
        print(f"   macOS 12: FAIL as expected (remediation: {r3.get('remediation_steps', [])[:1]})")
        print(f"   Windows 8: FAIL as expected")
        print("   OK: Policy engine respects config\n")

    print("=== All BYOD Compliance Tests PASSED ===\n")
    return True


if __name__ == "__main__":
    try:
        ok = asyncio.run(test_byod_compliance())
        exit(0 if ok else 1)
    except Exception as e:
        print(f"\nERROR: {e}")
        import traceback
        traceback.print_exc()
        exit(1)
