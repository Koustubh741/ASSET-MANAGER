# Procurement vs Finance Separation – Gap Analysis

This document lists what is **present** and what may be **missing or inconsistent** across frontend, backend, and database/ORMs for the Procurement and Finance portals after separation. It does **not** change any code; it is a checklist for verification and fixes.

---

## 1. Backend

### 1.1 Present

| Item | Location | Notes |
|------|----------|--------|
| `AssetRequest.procurement_finance_status` | `backend/app/models/models.py` | Column exists; values used: `PO_UPLOADED`, `APPROVED`, `REJECTED`, `DELIVERED` |
| `AssetRequestResponse.procurement_finance_status` | `backend/app/schemas/asset_request_schema.py` | Exposed in API |
| `get_all_asset_requests` populates requester | `asset_request_service.get_all_asset_requests` | Uses `_populate_requester_info` so list includes `requester_name` and `procurement_finance_status` |
| Procurement approve/reject | `POST /asset-requests/{id}/procurement/approve`, `.../reject` | Calls `update_procurement_finance_status` |
| Finance approve/reject | `POST /asset-requests/{id}/finance/approve`, `.../reject` | Same service; both use `update_procurement_finance_status(..., "PROCUREMENT_APPROVED" \| "PROCUREMENT_REJECTED")` |
| Confirm delivery | `POST /asset-requests/{id}/procurement/confirm-delivery` | Sets `status=QC_PENDING`, `procurement_finance_status=DELIVERED` |
| PO upload | `POST /upload/po/{request_id}` | Sets `status=PO_UPLOADED`, `procurement_finance_status=PO_UPLOADED` |
| PO fetch / update | `GET /upload/po/{request_id}`, `PATCH /upload/po/{po_id}` | Finance/Procurement can read and edit PO details |
| `validate_finance_budget` (procurement_service) | When PO exists and Finance approves/rejects | Sets `request.status` to `FINANCE_APPROVED` or `FINANCE_REJECTED` and `procurement_finance_status` to `APPROVED` or `REJECTED` |
| State machine | `backend/app/utils/state_machine.py` | References `docs/WORKFLOW_FINANCE_PROCUREMENT.md`; `PROCUREMENT` / `FINANCE` allowed where `PROCUREMENT_FINANCE` required |
| Role checks | asset_requests, upload, financials | Use `PROCUREMENT`, `FINANCE`, `PROCUREMENT_FINANCE`, `ADMIN` as needed |

### 1.2 Gaps / Bugs

| Issue | Location | Description |
|-------|----------|-------------|
| **Finance approve overwrites status** | `asset_request_service.update_procurement_finance_status` | When Finance approves, `validate_finance_budget` sets `request.status = "FINANCE_APPROVED"`. Then line 311 does `db_request.status = new_status` (`"PROCUREMENT_APPROVED"`), so the saved status becomes `PROCUREMENT_APPROVED` instead of `FINANCE_APPROVED`. Frontend relies on `status === 'FINANCE_APPROVED'` (mapped to PROCUREMENT_REQUIRED) + `procurementStage === 'FINANCE_APPROVED'` to show the request in Procurement’s “Awaiting delivery” queue. **Fix:** After calling `validate_finance_budget` for `new_status == "PROCUREMENT_APPROVED"` and `po`, do **not** overwrite `db_request.status` with `new_status` (keep `FINANCE_APPROVED`). |
| **Procurement approve uses same `procurement_finance_status` as Finance** | Same service | When Procurement approves (no PO or before PO upload), backend sets `procurement_finance_status = "APPROVED"`. Frontend maps `APPROVED` → `procurementStage = 'FINANCE_APPROVED'`, so the request appears in **Procurement** “Awaiting delivery” instead of **Finance** “Budget queue”. **Fix (optional):** When the transition is “Procurement approved, waiting for Finance”, set `procurement_finance_status = "PO_CREATED"` (or similar) so the frontend can show it in the Finance queue; reserve `APPROVED`/`FINANCE_APPROVED` for after Finance has approved. |
| **Model comment too narrow** | `models.AssetRequest` | Comment says `procurement_finance_status`: `APPROVED \| REJECTED`. Actual values include `PO_UPLOADED`, `DELIVERED`. Update comment to list all used values. |
| **Alerts service** | `alerts_service.py` | Uses `procurement_finance_status.in_(["APPROVED", "PROCUREMENT_APPROVED"])`. Backend never stores `"PROCUREMENT_APPROVED"` in this column; only `"APPROVED"`. Behavior is fine but the extra enum is redundant. |

### 1.3 Router authorization

- **procurement/approve** and **procurement/reject** allow `PROCUREMENT_FINANCE`, `FINANCE`, `ADMIN`. For strict separation, consider restricting **procurement/** to `PROCUREMENT` (and combined role) and **finance/** to `FINANCE` (and combined role). Currently both roles can call both endpoints.

---

## 2. Frontend

### 2.1 Present

| Item | Location | Notes |
|------|----------|--------|
| `deriveOwnerRole` | `AssetContext.jsx` | Uses `status`, `assetType`, `procurementStage`; returns `FINANCE` for `PO_CREATED`/`PO_UPLOADED`, `PROCUREMENT` for `FINANCE_APPROVED` or `status === 'FINANCE_APPROVED'` |
| Status mapping | Same | `rawStatus` → `status` (e.g. `PO_UPLOADED` → `PROCUREMENT_REQUIRED`, `FINANCE_APPROVED` → `PROCUREMENT_REQUIRED`) |
| `procurementStage` from API | Same | `procurement_finance_status === 'APPROVED'` → `'FINANCE_APPROVED'`, else use raw `procurement_finance_status` |
| Procurement dashboard | `ProcurementManagerDashboard.jsx` | Awaiting PO (PROCUREMENT + PROCUREMENT_REQUIRED + AWAITING_DECISION), Awaiting delivery (PROCUREMENT + FINANCE_APPROVED); actions: upload PO, reject, confirm delivery |
| Finance dashboard | `FinanceDashboard.jsx` | Budget queue: `currentOwnerRole === 'FINANCE'` and `procurementStage === 'PO_CREATED' \|\| 'PO_UPLOADED'`; actions: approve (Release Funds), reject |
| Procurement modal | `ProcurementActionModal.jsx` | Uses `procurementStage === 'FINANCE_APPROVED'` for delivery confirmation |
| Admin-level fetch | `AssetContext` | FINANCE and PROCUREMENT (and PROCUREMENT_FINANCE, ASSET_MANAGER, etc.) get full request list |
| API client | `apiClient.js` | `getPO(requestId)`, `procurementUploadPO`, `updatePODetails`, finance/procurement actions wired |
| Role → portal | `AuthGuard`, `PortalLayout` | Procurement Manager → `/procurement`, Finance → `/finance`; Procurement & Finance → tabbed `FinanceAuditDashboard` |

### 2.2 Gaps / Inconsistencies

| Issue | Location | Description |
|-------|----------|-------------|
| **PO_CREATED never from backend** | Frontend `deriveOwnerRole` | Frontend expects `procurementStage === 'PO_CREATED'` for Finance queue. Backend never sets `procurement_finance_status = "PO_CREATED"` (only `APPROVED` after Procurement approve). So “Budget queue” only fills when status is `PO_UPLOADED` (after PO upload). If the intended flow is “Procurement approves → appears in Finance queue before PO upload”, backend must send something like `PO_CREATED` and frontend already supports it. |
| **requestedBy.role fallback** | FinanceDashboard / others | Uses `req.requestedBy?.name` and `req.requestedBy.role`; fallback for missing `requestedBy` or `role` is already handled in some dashboards (e.g. ProcurementManagerDashboard). Ensure Finance dashboard and any other consumers use optional chaining and safe fallbacks. |
| **No explicit handling for PROCUREMENT_APPROVED** | `deriveOwnerRole` | When backend returns `status === 'PROCUREMENT_APPROVED'` and `procurement_finance_status === 'APPROVED'`, frontend maps to `procurementStage = 'FINANCE_APPROVED'` and hits `case 'PROCUREMENT_APPROVED': return PROCUREMENT`. So the request shows in Procurement “Awaiting delivery” even when no PO exists. Fix is either backend (e.g. use `PO_CREATED` when Procurement approves) or frontend (e.g. treat “Procurement approved but no PO” differently so it does not appear as “Awaiting delivery”). |

---

## 3. Database / ORMs

### 3.1 Present

| Item | Location | Notes |
|------|----------|--------|
| `asset.asset_requests.procurement_finance_status` | Model + migrations | Column exists; nullable `String(50)` |
| `asset.asset_requests.procurement_finance_reviewed_by`, `_at`, `_rejection_reason` | Model | Audit fields for procurement/finance review |
| `procurement.purchase_orders` | Model + migrations | Links to `asset_request_id`; has `extracted_data` (JSONB), `status` (UPLOADED/VALIDATED/REJECTED) |
| `procurement.purchase_invoices` | Model | Linked to PO |
| `auth.users.role` | Model | Values include `FINANCE`, `PROCUREMENT`, `PROCUREMENT_FINANCE` (from reference router and auth) |

### 3.2 Gaps

| Issue | Description |
|-------|-------------|
| **No enum constraint on `procurement_finance_status`** | Values are free-form string. Consider a DB enum or check constraint for `PO_CREATED`, `PO_UPLOADED`, `APPROVED`, `REJECTED`, `FINANCE_APPROVED`, `FINANCE_REJECTED`, `DELIVERED` (or whatever is canonical) to avoid typos and drift. |
| **Model docstring** | `AssetRequest` comment lists statuses but omits some procurement/finance states (e.g. `PO_UPLOADED`, `FINANCE_APPROVED`). Align with `state_machine.VALID_TRANSITIONS` and workflow doc. |

---

## 4. Summary Table

| Layer | Missing / Inconsistent |
|-------|-------------------------|
| **Backend** | (1) Finance approve overwrites `status` with `PROCUREMENT_APPROVED`; (2) Procurement approve uses `APPROVED` so request shows in Procurement “Awaiting delivery” instead of Finance queue; (3) Model comment for `procurement_finance_status` incomplete; (4) Optional: restrict procurement vs finance endpoints by role. |
| **Frontend** | (1) `PO_CREATED` never sent by backend; (2) Safe fallbacks for `requestedBy`/role; (3) Logic for “Procurement approved, no PO yet” so it does not show as “Awaiting delivery”. |
| **Database/ORMs** | (1) Optional enum/constraint for `procurement_finance_status`; (2) Model docstring aligned with workflow. |

---

## 5. Recommended order of fixes

1. **Backend:** In `update_procurement_finance_status`, after calling `validate_finance_budget` for Finance approve, do not set `db_request.status = new_status` when a PO existed (keep `FINANCE_APPROVED`).
2. **Backend (optional):** When Procurement approves, set `procurement_finance_status = "PO_CREATED"` so the request appears in the Finance queue; keep `APPROVED`/`FINANCE_APPROVED` for after Finance approval.
3. **Backend:** Update `AssetRequest` model comment for `procurement_finance_status` to list all used values.
4. **Frontend:** Ensure all dashboards that use `requestedBy` or `procurementStage` have optional chaining and fallbacks (already partially done).
5. **DB/ORM (optional):** Add enum or check constraint for `procurement_finance_status` and align model docstrings with the workflow doc.

No changes to state transition rules, terminal states, or workflow doc are required for the above; they are incremental fixes for consistency and correct queue routing.
