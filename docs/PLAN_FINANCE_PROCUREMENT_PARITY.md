# Plan: Finance & Procurement Portal Parity

This plan implements the missing features so both departments have comparable capabilities while keeping workflow separation (Procurement: PO creation & delivery; Finance: budget approval & governance).

---

## Current Gaps (Summary)

| Feature | Finance has | Procurement has |
|---------|-------------|-----------------|
| Financial KPIs (Book Value, Depreciation, Budget Queue) | Yes | No (only single "Budget Remaining" mock) |
| Trend chart (asset value / spend) | Yes (mock) | No |
| PO detail view / edit (vendor, cost) | Yes | No |
| Extraction audit (PO telemetry table) | Yes | No |
| Export button | Yes (UI only) | No |
| Analytics nav link | Yes → `/financials` | No |
| Create/upload PO, confirm delivery | No | Yes |

**Goal:** Add to Procurement the reporting/audit/export/analytics features that Finance has, and make Finance’s export and KPIs real where possible.

---

## Phase 1: Procurement Dashboard – Reporting & Audit Parity

### 1.1 Procurement KPI cards (real + derived)

**File:** [frontend/components/dashboards/ProcurementManagerDashboard.jsx](frontend/components/dashboards/ProcurementManagerDashboard.jsx)

- **Awaiting PO** – already real (count).
- **Awaiting Delivery** – already real (count).
- **Replace or augment mock cards:**
  - **"Total PO value (pending)"** – Sum `total_cost` of POs for requests in `awaitingPO` and `budgetApprovals` (Finance queue). Fetch PO details for those requests (reuse `apiClient.getPO(requestId)` or batch), sum costs, display in a card.
  - **"Quarterly budget remaining"** – Keep as mock for now, or add backend `GET /financials/budget-summary` returning `remaining_budget`, `period`, and use it here.
- **Expected Deliveries** – Keep mock "12" or derive from requests in `awaitingDelivery` (e.g. count + ETA from PO if we have `expected_delivery_date`).
- **Invoice Discrepancies** – Keep mock "2" or leave as placeholder; optional later with invoice data.

**Tasks:**
- Add state for `poDetails` (map requestId → PO) and fetch PO for `awaitingPO` and optionally for `awaitingDelivery`.
- Add a KPI card "Total Pending PO Value" using summed `poDetails[*].total_cost`.
- Optionally add a small "Budget remaining" card wired to a new or existing API.

### 1.2 Procurement trend chart

**File:** [frontend/components/dashboards/ProcurementManagerDashboard.jsx](frontend/components/dashboards/ProcurementManagerDashboard.jsx)

- Add a section "PO / Request trend" (e.g. last 6 months).
- **Option A (quick):** Use mock data (counts or amounts per month) and render an `AreaChart` or `BarChart` (reuse pattern from FinanceDashboard).
- **Option B (real):** Backend `GET /financials/monthly-spend` or new `GET /procurement/po-stats?months=6` returning `{ month, po_count, total_value }`; frontend calls it and renders the chart.

**Tasks:**
- Add a chart component (Recharts) below the KPI grid.
- Use mock series for Phase 1; replace with API in Phase 3 if backend is added.

### 1.3 PO detail and extraction audit on Procurement

**File:** [frontend/components/dashboards/ProcurementManagerDashboard.jsx](frontend/components/dashboards/ProcurementManagerDashboard.jsx)

- For requests that have a PO (e.g. after upload, or when `procurementStage` is `PO_CREATED`/`PO_UPLOADED`), show PO details and extraction payload.
- **View:** Reuse the same pattern as Finance: fetch PO with `apiClient.getPO(requestId)` for items in a "PO audit" list (e.g. awaiting delivery + any with PO). Show a collapsible "Purchase Intelligence" table: Request ID, Vendor, Extracted Value, Status, Structured Payload (expandable), and optional **edit** (vendor_name, total_cost) with `apiClient.updatePODetails(poId, data)`.
- **Scope:** Only show for requests that are still in Procurement’s purview (e.g. `awaitingPO` after PO upload, or `awaitingDelivery`) so Procurement can correct before or after Finance approval.

**Tasks:**
- Add `poDetails` state and `useEffect` to load PO for relevant requests (e.g. awaitingDelivery and optionally awaitingPO where PO exists).
- Add a section "PO Intelligence" (table + expandable extraction data), and optional inline edit for vendor/cost (same as Finance) so Procurement can fix before sending to Finance.

### 1.4 Export for Procurement

**File:** [frontend/components/dashboards/ProcurementManagerDashboard.jsx](frontend/components/dashboards/ProcurementManagerDashboard.jsx)

- Add an "Export" button in the header (e.g. "Export PO & Delivery Summary").
- On click: build a CSV (or JSON) from current lists: `awaitingPO` (request id, asset type, requested by, justification, status) and `awaitingDelivery` (request id, asset type, for user, PO stage). Optionally include PO details (vendor, cost) from `poDetails`.
- Trigger client-side download (no backend required for Phase 1).

**Tasks:**
- Implement `exportProcurementSummary()` that builds CSV/JSON and uses a temporary `<a download>` or blob URL.
- Add button next to "Quarterly Budget Remaining" or in a header actions area.

### 1.5 Analytics link in Procurement portal

**File:** [frontend/components/PortalLayout.jsx](frontend/components/PortalLayout.jsx)

- Add to `PROCUREMENT_NAV`: `{ label: 'Analytics', href: '/financials', icon: PieChart }` (or href: `/procurement/analytics` if we add a dedicated page).
- Procurement users then have an "Analytics" entry that goes to the Financial Center page (or a procurement-specific analytics page).

**Tasks:**
- Add Analytics to `PROCUREMENT_NAV` with `href: '/financials'` so both portals have analytics; optionally add `frontend/pages/procurement/analytics.jsx` later that shows procurement-focused metrics and links to `/financials` for full financials.

---

## Phase 2: Finance Dashboard – Real Data & Export

### 2.1 Finance KPIs from API

**File:** [frontend/components/dashboards/FinanceDashboard.jsx](frontend/components/dashboards/FinanceDashboard.jsx)

- **Total Book Value / YTD Depreciation:** Call `apiClient.getFinancialSummary()` and `apiClient.getDepreciation()` (or existing financials endpoints). Map response to the existing KPI cards (e.g. `total_asset_value` → Total Book Value, depreciation series → YTD Depreciation card).
- **Budget Queue** – already real (count of `budgetApprovals`).
- Keep fallback to current mock values if API fails or returns empty.

**Tasks:**
- In `FinanceDashboard`, add `useEffect` to fetch `getFinancialSummary()` and optionally `getMonthlySpend(6)` / depreciation; store in state and pass to KPI cards and chart.
- Replace hardcoded "₹40.2 Lacs", "₹3.8 Lacs", and chart `data` with API-driven values.

### 2.2 Finance Export – real export

**File:** [frontend/components/dashboards/FinanceDashboard.jsx](frontend/components/dashboards/FinanceDashboard.jsx)

- Wire "Export Financial Intel" to a real export: e.g. CSV of current budget approval queue (request id, asset type, requester, justification, vendor, total cost from PO, status).
- Use `poDetails` and `budgetApprovals` to build rows; trigger client-side download.

**Tasks:**
- Implement `exportFinanceIntel()` that builds CSV from `budgetApprovals` + `poDetails` and triggers download.
- Call it from the existing Export button.

---

## Phase 3: Backend (Optional) – Procurement stats & budget

### 3.1 Procurement stats endpoint (for chart / KPIs)

**File:** [backend/app/routers/financials.py](backend/app/routers/financials.py) or new `backend/app/routers/procurement.py`

- Add e.g. `GET /procurement/stats` or extend financials with `GET /financials/procurement-summary` returning:
  - `pending_po_count`, `pending_po_total_value`, `awaiting_delivery_count`, `monthly_po_count` / `monthly_po_value` for last N months.
- Frontend Procurement dashboard then uses this for "Total Pending PO Value" and the trend chart (Phase 1.1, 1.2).

**Tasks:**
- Define Pydantic response and query PurchaseOrder / AssetRequest (and filters by status/procurement_stage); return aggregated counts and amounts.
- Register route; call from ProcurementManagerDashboard for KPIs and chart.

### 3.2 Budget summary endpoint (optional)

- If product wants "Quarterly budget remaining" to be real: add `GET /financials/budget-summary` (or company-level budget from Company/settings) and wire it in Finance and Procurement dashboards.

---

## Implementation Order

| Step | Task | Owner area |
|------|------|------------|
| 1 | Procurement: Add PO fetch + "Total Pending PO Value" KPI card | Frontend |
| 2 | Procurement: Add trend chart (mock data) | Frontend |
| 3 | Procurement: Add PO Intelligence table + optional edit | Frontend |
| 4 | Procurement: Add Export button + CSV download | Frontend |
| 5 | PortalLayout: Add Analytics to Procurement nav | Frontend |
| 6 | Finance: Wire KPIs to getFinancialSummary / getDepreciation | Frontend |
| 7 | Finance: Wire Export button to CSV export | Frontend |
| 8 | Backend: Optional procurement-stats and/or budget-summary | Backend |

---

## Files to Touch

- **Frontend:**  
  `ProcurementManagerDashboard.jsx`, `FinanceDashboard.jsx`, `PortalLayout.jsx`
- **Backend (optional):**  
  `financials.py` or new `procurement.py`, plus any new schema in `schemas/`.

---

## Success Criteria

- **Procurement:** Has KPI cards (including a pending PO value), a trend chart, a PO/extraction audit section, an export, and an Analytics nav link.
- **Finance:** KPIs and chart use real data from financials API where available; Export downloads a real CSV of the budget queue.
- Workflow separation is unchanged: only Procurement creates/uploads PO and confirms delivery; only Finance approves/rejects budget.
