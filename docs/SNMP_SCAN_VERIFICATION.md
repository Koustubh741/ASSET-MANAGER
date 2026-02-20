# SNMP Scan Endpoint Verification

Step-by-step guide to verify `/api/v1/collect/scan` works correctly and to diagnose issues.

## What to Check When You Run the Curl

| Observation | Likely meaning |
|-------------|----------------|
| **200 OK** | Request accepted. Scan runs in background. Response includes `scan_id`, `status: "success"`. |
| **401 Unauthorized** | Token expired or invalid. Re-login to get a new token. |
| **403 Forbidden** | User is not admin. Requires `check_system_admin`. |
| **422 Unprocessable Entity** | Body/validation issue. Empty body fix should prevent this. |
| **500 Internal Server Error** | Server-side exception. Check `backend/exception.log`. |

## Response Shape When Successful (200)

```json
{
  "status": "success",
  "message": "SNMP scan started on 192.168.1.0/24 (254 hosts)...",
  "scan_id": "uuid-here",
  "range": "192.168.1.0/24",
  "total_hosts": 254,
  "async": true
}
```

## How to Run the Curl

**Windows PowerShell (send empty JSON body to avoid 422):**

```powershell
curl "http://127.0.0.1:8000/api/v1/collect/scan" -X POST -H "Content-Type: application/json" -H "Authorization: Bearer YOUR_TOKEN" -d "{}"
```

**With a valid token**, the backend loads SNMP config from the database (network range, community/v3 credentials) and starts the scan in the background.

## Verification Script

From the backend directory:

```bash
python scripts/verify_scan_endpoint.py YOUR_TOKEN
```

Or set the token via environment:

```bash
set AUTH_TOKEN=eyJ...
python scripts/verify_scan_endpoint.py
```

## If Scan Starts (200) But No Devices Found

- Ensure SNMP is configured and saved in **Agents > SNMP Scanner** before triggering.
- Confirm the network range includes reachable SNMP devices.
- Check device firewall / SNMP enablement and correct community string or v3 credentials.
- Inspect `backend/agent_execution.log` or backend console for SNMP errors.

## Quick Token Check

Decode your JWT at [jwt.io](https://jwt.io) to verify the `exp` (expiration) claim has not passed. `exp` is a Unix timestamp.
