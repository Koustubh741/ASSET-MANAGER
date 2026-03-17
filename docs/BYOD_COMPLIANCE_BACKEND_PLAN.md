# BYOD Compliance – Backend Logic Plan

## 1. Current State

| Component | Status | Notes |
|-----------|--------|-------|
| `POST /asset-requests/{id}/byod-compliance-check` | ✅ Exists | Dry-run supported |
| `validate_byod_compliance()` | Simulated | No real MDM integration |
| `simulate_mdm_enrollment()` | Mock only | Hardcoded compliance checks |
| `ByodDevice` model | Basic | No MDM enrollment fields |
| Device auto-register fallback | ✅ Added | When no ByodDevice exists |

**Current flow:**
1. Validate request exists & is BYOD
2. Get or auto-create ByodDevice from request details
3. Run simulated MDM enrollment
4. Update request status → IN_USE or BYOD_REJECTED
5. Append approval/rejection to manager_approvals

---

## 2. Target Architecture

```
┌─────────────────┐     ┌──────────────────────┐     ┌─────────────────┐
│  API Endpoint   │────▶│  Compliance Service  │────▶│  MDM Adapter    │
│  (Router)       │     │  (validate_byod_*)   │     │  (Intune/Jamf)  │
└─────────────────┘     └──────────────────────┘     └─────────────────┘
                                    │
                                    ▼
                        ┌──────────────────────┐
                        │  Policy Engine       │
                        │  (OS-specific rules) │
                        └──────────────────────┘
```

---

## 3. Database Model Enhancements

**ByodDevice – new fields:**

| Column | Type | Purpose |
|--------|------|---------|
| `mdm_enrolled` | Boolean | Whether device is enrolled in MDM |
| `mdm_enrollment_date` | DateTime | When enrollment completed |
| `mdm_provider` | String | "INTUNE" \| "JAMF" \| "MANUAL" \| null |
| `mdm_device_id` | String | External MDM system device ID |
| `last_compliance_check` | DateTime | Last compliance scan timestamp |
| `compliance_checks` | JSONB | Detailed check results (encryption, OS, etc.) |
| `security_policies` | JSONB | Policies applied at enrollment |
| `remediation_notes` | Text | IT notes for non-compliant devices |

---

## 4. Core Logic – `validate_byod_compliance()`

### Phase 1: Pre-checks
1. **Request validation**
   - Request exists
   - `asset_ownership_type == "BYOD"`
   - Status in `{IT_APPROVED, BYOD_COMPLIANCE_CHECK, MANAGER_CONFIRMED_IT}`
2. **Device resolution**
   - ByodDevice exists for `request_id`, or
   - Auto-register from request (asset_model, os_version, serial_number) if allowed
3. **Reviewer authorization**
   - Caller has `IT_MANAGEMENT` or `ADMIN` role

### Phase 2: Compliance check
1. **Device enrollment**
   - If `mdm_enrolled == False`: call MDM enrollment
   - If enrolled: run compliance re-check
2. **Policy evaluation**
   - Load OS-specific policies (Windows vs macOS vs Android)
   - Compare device metadata against policies
   - Return structured `compliance_checks` dict
3. **Result determination**
   - All checks pass → COMPLIANT
   - Any critical check fails → NON_COMPLIANT
   - Warnings only → COMPLIANT with notes

### Phase 3: State update
1. **On COMPLIANT**
   - `AssetRequest.status = "IN_USE"`
   - `ByodDevice.compliance_status = "COMPLIANT"`
   - `ByodDevice.mdm_enrolled = True`, set dates
   - Append to `manager_approvals` with type `BYOD_COMPLIANCE_CHECK`
   - Optionally create Asset record for "My Assets" view
2. **On NON_COMPLIANT**
   - `AssetRequest.status = "BYOD_REJECTED"`
   - `ByodDevice.compliance_status = "NON_COMPLIANT"`
   - Append rejection to `manager_approvals` with `compliance_checks` details
   - Return remediation steps in response

---

## 5. Policy Engine – Security Checks

### Default policy set (configurable)

| Check | Required | Description | Remediation |
|-------|----------|-------------|-------------|
| `encryption` | Yes | Full-disk encryption enabled | Enable BitLocker / FileVault |
| `password_policy` | Yes | Screen lock + complexity | Set 8+ char, mixed case, symbol |
| `os_version` | Yes | Min supported OS version | Upgrade OS |
| `security_patch_level` | Yes | Patches within 90 days | Run OS updates |
| `remote_wipe` | Yes | MDM can remotely wipe | Accept MDM profile |
| `unauthorized_apps` | No | No known risky apps | Remove flagged apps |
| `biometric_auth` | No | Fingerprint/Face ID available | Optional |

### OS-specific minimums

```
Windows: 10 22H2+ or 11
macOS: 13 (Ventura)+
iOS: 16+
Android: 12+
```

---

## 6. MDM Integration Adapters

### Interface (abstract)
```python
class MDMAdapter(ABC):
    async def enroll_device(self, device: ByodDevice, user_email: str) -> EnrollmentResult
    async def check_compliance(self, device_id: str) -> ComplianceResult
    async def get_device_info(self, device_id: str) -> DeviceInfo
```

### Implementations
1. **SimulatedAdapter** (current) – For dev/test, configurable pass/fail
2. **IntuneAdapter** – Microsoft Graph API
3. **JamfAdapter** – Jamf Pro API (macOS/iOS)
4. **GoogleEndpointAdapter** – Android Enterprise

### Config (env)
```
MDM_PROVIDER=simulated|intune|jamf|google
INTUNE_TENANT_ID=...
INTUNE_CLIENT_ID=...
JAMF_URL=...
JAMF_API_KEY=...
```

---

## 7. API Contract

### Request
```json
{
  "dry_run": false,
  "compliance_status": "COMPLIANT",
  "notes": "Manual override - device verified in person"
}
```

### Response (success)
```json
{
  "success": true,
  "request_id": "uuid",
  "final_status": "IN_USE",
  "mdm_enrollment": {
    "device_id": "uuid",
    "mdm_enrolled": true,
    "compliance_status": "COMPLIANT",
    "compliance_checks": {
      "encryption": true,
      "password_policy": true,
      "os_version": true,
      "security_patch_level": true,
      "remote_wipe": true,
      "unauthorized_apps": false
    },
    "enrollment_date": "ISO8601"
  }
}
```

### Response (rejected)
```json
{
  "success": true,
  "request_id": "uuid",
  "final_status": "BYOD_REJECTED",
  "mdm_enrollment": {
    "compliance_status": "NON_COMPLIANT",
    "compliance_checks": { ... },
    "remediation_steps": [
      "Enable BitLocker full-disk encryption",
      "Upgrade to Windows 11"
    ]
  }
}
```

---

## 8. Implementation Phases

### Phase 1: Model & Config (1–2 days)
- [ ] Add ByodDevice columns via migration
- [ ] Add policy config (JSON file or DB table)
- [ ] Add `MDM_PROVIDER` env and config loader

### Phase 2: Policy Engine (1–2 days)
- [ ] Extract policy rules into `policy_engine.py`
- [ ] OS detection from device_model/os_version
- [ ] Configurable min OS versions
- [ ] Return structured compliance_checks + remediation_steps

### Phase 3: Simulated Adapter (1 day)
- [ ] Refactor `simulate_mdm_enrollment` into `SimulatedMDMAdapter`
- [ ] Make pass/fail configurable (e.g. query param or env)
- [ ] Persist enrollment/compliance state on ByodDevice

### Phase 4: Integration Adapters (2–4 days per provider)
- [ ] Intune: Graph API device enrollment + compliance
- [ ] Jamf: Device enrollment + compliance API
- [ ] Error handling, retries, timeouts

### Phase 5: Audit & Reporting (1 day)
- [ ] Compliance history table (optional)
- [ ] Scheduled re-compliance checks
- [ ] Notifications for devices falling out of compliance

---

## 9. Error Handling

| Scenario | HTTP | Response |
|----------|------|----------|
| Request not found | 404 | `{"detail": "Request not found"}` |
| Not BYOD | 400 | `{"detail": "Request is not for a BYOD device"}` |
| Device not registered, no details | 400 | `{"detail": "Register device first..."}` |
| MDM unavailable | 503 | `{"detail": "MDM service temporarily unavailable"}` |
| Unauthorized | 403 | `{"detail": "Only IT Management..."}` |
| Invalid state | 400 | `{"detail": "Request must be in BYOD_COMPLIANCE_CHECK"}` |

---

## 10. Testing Strategy

1. **Unit** – Policy engine with mocked device data
2. **Integration** – Full flow with SimulatedAdapter
3. **E2E** – BYOD submit → approvals → compliance → IN_USE
4. **Contract** – Validate API request/response schema

---

## 11. File Structure (Proposed)

```
backend/app/
├── services/
│   ├── mdm_service.py          # validate_byod_compliance, orchestration
│   ├── policy_engine.py        # NEW: policy evaluation
│   └── mdm/
│       ├── __init__.py
│       ├── base.py             # MDMAdapter abstract class
│       ├── simulated.py        # SimulatedMDMAdapter
│       ├── intune.py           # IntuneAdapter (future)
│       └── jamf.py             # JamfAdapter (future)
├── config/
│   └── byod_policies.yaml      # Policy definitions
└── migrations/
    └── xxx_add_byod_mdm_fields.py
```

---

## Summary

The plan moves from simulated, hardcoded checks to a configurable policy engine and pluggable MDM adapters, with clear phases for rollout and testing.
