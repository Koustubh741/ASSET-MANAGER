# IT Manager Portal – Requests Visibility Diagnostic Guide

**Issue:** Requests (e.g. MANAGER_APPROVED BYOD) are not visible when logged in as `it_manager@itsm.com`.

**Status:** Database confirmed to have 1 MANAGER_APPROVED BYOD request that should be visible to IT manager.

---

## Quick Checks

### 1. Which dashboard do you see?

- **Expected:** Page heading should include **"IT Support"** or **"IT Management"**.
- **If you see:** "System Admin", "Asset & Inventory Manager", "Procurement Manager", "Finance", or "End User" (when you expect IT) → **Role mismatch**.

### 2. Browser console (F12 → Console)

Look for:

```
[AssetContext] Admin fetch: X requests, Y assets, Z tickets
[ITSupportDashboard] Total requests: X
[ITSupportDashboard] Requests with MANAGER_APPROVED status: [...]
[ITSupportDashboard] Filtered incomingRequests: X
```

- If `Total requests: 0` → API returns no requests.
- If `Total requests: 1` but `Filtered incomingRequests: 0` → Frontend filter issue (status or `currentOwnerRole`).
- If `Admin fetch` is missing → IT_MANAGEMENT path may not be used; role may be wrong.

### 3. Network tab (F12 → Network)

Filter for `asset-requests`. Check the request:

- **URL:** `GET /api/v1/asset-requests` (no query params for IT).
- **Status:** 200.
- **Response:** JSON array of requests.

If 401 → auth/token problem. If 200 and empty array → backend filtering.

---

## Data Flow Summary

```
Database (MANAGER_APPROVED) 
  → Backend GET /asset-requests (no filters for IT_MANAGEMENT)
  → AssetContext (status mapping, deriveOwnerRole)
  → ITSupportDashboard (incomingRequests filter)
  → "Incoming Requests" / "Pending Setup Assets"
```

IT manager requests must pass:

1. `status === 'MANAGER_APPROVED' || 'IT_APPROVED' || 'REQUESTED'`
2. `currentOwnerRole === 'IT_MANAGEMENT'`
3. `assetType !== 'Ticket'`

---

## Root Cause Checklist

### A. Role / dashboard mismatch

| Check | Action |
|-------|--------|
| Login response has `role: "IT_MANAGEMENT"` | Inspect Network → login response → `user.role` |
| RoleContext uses `IT_MANAGEMENT` | Console: `JSON.parse(localStorage.getItem('auth_session'))` → `role` |
| Dashboard is ITSupportDashboard | Verify page title/heading matches IT Support view |

If `role` is not `"IT_MANAGEMENT"` (e.g. `"END_USER"`, `"MANAGER"`), the user will get a different dashboard and different API filters.

### B. API returns no requests

| Check | How |
|-------|-----|
| Backend user role | Run `python backend/check_it_manager.py` |
| Asset request service | Run `python backend/verify_it_visibility.py` |
| Direct API call | `curl -H "Authorization: Bearer <token>" http://localhost:8000/api/v1/asset-requests` |

### C. Frontend filtering

| Check | Where |
|-------|-------|
| `deriveOwnerRole('MANAGER_APPROVED', assetType)` → `IT_MANAGEMENT` | `AssetContext.jsx` ~line 60 |
| `asset_type` present on API response | AssetContext uses `r.asset_type \|\| r.type \|\| 'Standard'` |
| Status mapping | `MANAGER_APPROVED` stays as-is (no remap) |

---

## Verification Scripts

### 1. IT manager user check

```bash
cd backend
python check_it_manager.py
```

Verifies: user exists, role, status, and MANAGER_APPROVED / IT_APPROVED counts.

### 2. Visibility fix verification

```bash
cd backend
python verify_it_visibility.py
```

Verifies: IT user sees requests (including from other departments).

### 3. Root cause analysis

```bash
cd backend
python analyze_it_visibility.py
```

Verifies: IT users, MANAGER_APPROVED requests, and role matching.

---

## Manual API Test

1. Log in as `it_manager@itsm.com` in the browser.
2. F12 → Console → run:
   ```javascript
   JSON.parse(localStorage.getItem('auth_session'))
   ```
3. Copy the structure (do not share real tokens).
4. F12 → Network → find `asset-requests` request → copy as cURL.
5. Run the cURL in a terminal and inspect the JSON.

---

## Common Fixes

### Fix 1: Ensure IT_MANAGEMENT role in DB

```bash
cd backend
python activate_it_management.py
```

Activates IT management users and confirms they can see MANAGER_APPROVED requests.

### Fix 2: Clear stale session

1. Logout.
2. Clear `localStorage` (F12 → Application → Local Storage → Clear).
3. Log in again as `it_manager@itsm.com`.

### Fix 4: Check backend filter logic

In `backend/app/routers/asset_requests.py`, IT_MANAGEMENT must be in `exclude_roles` so no department/domain filter is applied:

```python
exclude_roles = ["ADMIN", "SYSTEM_ADMIN", "IT_MANAGEMENT", "ASSET_MANAGER", "FINANCE", "PROCUREMENT"]
if current_user.role not in exclude_roles and current_user.position == "MANAGER":
    # ... department filter
```

---

## Expected Console Output (Success)

```
[AssetContext] User position: ..., Domain: ..., RoleSlug: IT_MANAGEMENT
[AssetContext] Admin fetch: 1 requests, X assets, Y tickets
[AssetContext] Request <id>: rawStatus=MANAGER_APPROVED, mappedStatus=MANAGER_APPROVED, ownerRole=IT_MANAGEMENT
[ITSupportDashboard] Total requests: 1
[ITSupportDashboard] Requests with MANAGER_APPROVED status: [{id: '...', assetType: 'BYOD', status: 'MANAGER_APPROVED', currentOwnerRole: 'IT_MANAGEMENT'}]
[ITSupportDashboard] Filtered incomingRequests: 1
```

---

## Where requests appear in the UI

1. Main dashboard card: **"Incoming Asset Requests"** (click to open PENDING modal).
2. Modal: **"Pending Setup Assets"** shows the queue.
3. If empty: either no requests, or they are filtered out.

---

## Contact / Escalation

If the above does not resolve the issue, provide:

1. Screenshot of dashboard header/title.
2. Browser console logs (with any `[AssetContext]` / `[ITSupportDashboard]` lines).
3. Network response for `GET /api/v1/asset-requests` (status code and response body).
4. Output of `python backend/check_it_manager.py`.
