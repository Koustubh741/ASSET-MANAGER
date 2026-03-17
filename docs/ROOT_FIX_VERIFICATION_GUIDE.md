# Root Fix & Frontend–Backend–Database Verification Guide

This guide explains how to apply the root fix and verify the full integration (frontend ↔ backend API ↔ ORM ↔ database) from the frontend.

---

## 1. Overview

The **root fix** syncs `Asset.assigned_to` and `Asset.assigned_to_id` from the `AssetRequest` requester for requests that have an asset assigned but may have stale or orphaned assignment data. This ensures:

- **My Assets** shows correct assets for end users (filtered by `assigned_to`).
- **Asset requests** in FULFILLED/IN_USE show the right requester as owner.
- **Integration** between frontend, backend, and database stays consistent.

---

## 2. Prerequisites

| Component | Command / URL |
|-----------|---------------|
| **Backend** | `cd backend && .\start_backend.bat` or `uvicorn app.main:app --reload` |
| **Frontend** | `cd frontend && npm run dev` |
| **Database** | PostgreSQL with migrations applied (`alembic upgrade head`) |
| **API** | `http://127.0.0.1:8000` |
| **Frontend** | `http://localhost:3000` |

---

## 3. Apply the Root Fix

```powershell
cd d:\ASSET-MANAGER\backend
python apply_root_fix.py
```

**What it does:**
- Finds `AssetRequest` rows with `asset_id` set and status in:
  - `USER_ACCEPTANCE_PENDING`
  - `MANAGER_CONFIRMED_ASSIGNMENT`
  - `FULFILLED`
  - `IN_USE`
- For each request: updates `Asset.assigned_to` and `Asset.assigned_to_id` from the requester `User`.
- Sets `Asset.status` to `"In Use"` for IN_USE/FULFILLED, `"Reserved"` otherwise.

**Expected output:**
```
Applying Root Fix to N requests...
  Updating Asset <id> for user '<name>'
    Current Status: ..., Current Assigned To: ...
    New Status: ..., New Assigned To: ...
  Error: Asset <id> not found for request <id>   # Orphaned refs - skipped

Root Fix applied successfully!
```

**Note:** Requests with `asset_id` pointing to deleted/non-existent assets are skipped with an error. These are orphaned references; the fix does not create assets.

---

## 4. Frontend Verification Steps

### 4.1 Login & Dashboard Load

1. Open `http://localhost:3000/login`.
2. Log in with a test account (e.g. `koustubh@gmail.com` / `password@123`).
3. **Verify:** No console errors, dashboard loads with requests and assets as expected.

### 4.2 End User – My Assets

1. Log in as **End User** (e.g. `koustubh@gmail.com`).
2. Go to **Dashboard** → **My Assets** (or equivalent section).
3. **Verify:** Assets assigned to this user appear.
4. **Root fix check:** If you had a fulfilled request but assets were missing, run the root fix and refresh; assets should now appear.

**API behind the scenes:** `GET /api/v1/assets/my-assets` → filters by `Asset.assigned_to == current_user.full_name`.

### 4.3 Manager – Pending Requests

1. Log in as **Manager** (e.g. `JohnathanPine@gmail.com`).
2. Go to **Manager Dashboard**.
3. **Verify:** Requests from the manager’s department/domain appear in the incoming/pending list.
4. **Verify:** Can approve/reject requests.

**API:** `GET /api/v1/asset-requests?limit=300` (admin/manager roles).

### 4.4 IT Manager – All Requests & BYOD

1. Log in as **IT Manager** (e.g. `richardroper@gmail.com`).
2. Go to **IT Support Dashboard**.
3. **Verify:** BYOD and company-owned requests appear.
4. **Verify:** For BYOD in `IT_APPROVED` or `BYOD_COMPLIANCE_CHECK`:
   - Can run **BYOD Compliance Check**.
   - Request moves to **IN_USE** (shown as FULFILLED) on success.

**API:** `POST /api/v1/asset-requests/{id}/byod-compliance-check`.

### 4.5 Asset Request Status Flow

1. Create a new asset request as End User.
2. Approve as Manager → IT approves → Manager confirms IT (for BYOD) or proceed through procurement.
3. **Verify:** Status progresses: SUBMITTED → MANAGER_APPROVED → IT_APPROVED → … → IN_USE.
4. **Verify:** Frontend maps `IN_USE` to `FULFILLED` and shows a completed badge.

**Frontend mapping:** `AssetContext.jsx` line ~181: `if (rawStatus === 'IN_USE') status = 'FULFILLED'`.

### 4.6 Asset Visibility by Role

| Role | Expected behavior |
|------|-------------------|
| **END_USER** | Sees only own assets via `/my-assets`. |
| **MANAGER** | Sees department-scoped assets and requests. |
| **IT_MANAGEMENT / ADMIN** | Sees all assets and requests (limit 300). |

**Verify:** Switch roles and confirm visibility matches the table above.

---

## 5. Integration Points

| Layer | Key Files |
|-------|-----------|
| **Frontend** | `frontend/contexts/AssetContext.jsx`, `frontend/lib/apiClient.js` |
| **API** | `backend/app/routers/asset_requests.py`, `backend/app/routers/assets.py` |
| **Services** | `backend/app/services/asset_request_service.py`, `asset_service.py`, `mdm_service.py` |
| **ORM / DB** | `backend/app/models/models.py`, `backend/app/database/database.py` |

---

## 6. Quick API Checks (Optional)

Using browser DevTools → Network or a REST client:

```http
GET /api/v1/asset-requests?limit=10
Authorization: Bearer <token>

GET /api/v1/assets/my-assets
Authorization: Bearer <token>
```

Ensure responses are 200 and data structure matches what the frontend expects.

---

## 7. Test Accounts

| Email | Password | Role | Use |
|-------|----------|------|-----|
| koustubh@gmail.com | password@123 | End User | Submit requests, view My Assets |
| JohnathanPine@gmail.com | password@123 | Manager | Approve requests |
| richardroper@gmail.com | password@123 | IT Management | IT approvals, BYOD compliance |
| it_manager@itsm.com | password123 | IT Management | Alternate IT |
| admin@itsm.com | password123 | Admin | Full access |

---

## 8. Troubleshooting

| Issue | Action |
|-------|--------|
| **My Assets empty** | Run `apply_root_fix.py`, refresh page. Ensure `Asset.assigned_to` matches `User.full_name`. |
| **Requests not visible** | Check user role, department, and domain. IT/Admin see all; managers see department-scoped. |
| **BYOD compliance 403** | Use IT_MANAGEMENT or ADMIN account. |
| **CORS / network errors** | Confirm backend at `http://127.0.0.1:8000` and frontend `NEXT_PUBLIC_API_URL` match. |
| **Stale data** | Hard refresh (Ctrl+Shift+R) or clear localStorage. |
