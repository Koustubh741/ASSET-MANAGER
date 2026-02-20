# Asset Management Workflows – Testing Guide (Frontend)

This guide describes the **asset request lifecycle**, **BYOD path**, and **ticket workflow** with **roles**, **email IDs**, and **frontend steps** so you can test end-to-end in the UI.

---

## 1. Email IDs for Testing (by role)

Use these accounts at **Login** (`/login`) to test each role. Passwords may be `password123` or `password@123` depending on which seed/script was used; if login fails, try the other.

| Role | Email (login) | Typical password | Purpose |
|------|----------------|------------------|---------|
| **System Admin** | admin@itsm.com | password123 | Full access; read-only Procurement/Finance updates |
| **Manager** | manager@gmail.com **or** JohnathanPine@gmail.com | password123 **or** password@123 | Manager approval, Confirm IT (Asset Requests → **Review**) |
| **IT Management** | it_manager@itsm.com **or** richardroper@gmail.com | password123 **or** password@123 | IT Review, BYOD **Scan** (Asset Requests); Tickets acknowledge/diagnose/resolve |
| **End User** | endtest@gmail.com **or** koustubh@gmail.com | password123 **or** password@123 | Submit asset/BYOD request, create ticket; view own requests |
| **Finance** | pro@test.com | password123 | Finance portal → Budget queue approve/reject |
| **Inventory Manager (Asset Manager)** | asset@test.com | password123 | Allocate stock, route to Procurement, QC |

**Notes:**

- **Manager:** For Manager actions (Review button), the user must have **role** or **position** = Manager in the DB (e.g. `manager@gmail.com` has END_USER + position MANAGER; `JohnathanPine@gmail.com` in TEST_ACCOUNTS).
- **Procurement Manager:** If you have a dedicated procurement user in the DB (e.g. role `PROCUREMENT`), use that email for Procurement Hub; otherwise create/activate one and add it here.
- **Multiple environments:** Your DB may have been seeded by `scripts/standardize_workflow_users.py` (admin@itsm.com, manager@gmail.com, pro@test.com, etc.) or by other docs (koustubh@gmail.com, JohnathanPine@gmail.com, richardroper@gmail.com). Use whichever accounts exist and log in successfully.

---

## 2. Roles and Where to Test

| Role | Login / Role label | Default landing | Key pages for testing |
|------|--------------------|-----------------|------------------------|
| **End User** | End User | `/dashboard/end-user` | Dashboard (request asset/ticket), Asset Requests |
| **Manager** | End User with **Position = Manager** (or role Manager) | Same | Asset Requests → **Review** (Manager approval / Confirm IT) |
| **IT Management** | IT Management | `/dashboard/it-management` | Asset Requests → **IT Review**, **Scan** (BYOD) |
| **Inventory Manager** | Asset & Inventory Manager | `/dashboard/asset-inventory-manager` | Assets, Asset Requests (allocate / route to procurement), QC |
| **Procurement Manager** | Procurement Manager | `/procurement` | Procurement Hub → Dashboard, Purchase orders, Deliveries |
| **Finance** | Finance | `/finance` | Finance Portal → Budget queue |
| **System Admin** | System Admin | `/dashboard/system-admin` | All; read-only Procurement/Finance updates at `/dashboard/system-admin/procurement` and `/dashboard/system-admin/finance` |

**Frontend role source:** From login, the app uses `currentRole` (and `user.position`) from `RoleContext`. Manager actions use `currentUser.role === 'MANAGER'` **or** `currentUser.position === 'MANAGER'`.

---

## 3. Asset Request Lifecycle (End-to-End)

Single spine: one **Asset Request** moves through statuses; ownership is implied by status/stage.

### 3.1 Phases and statuses (in order)

| Phase | Status(es) | Who acts | Frontend action / where |
|-------|------------|----------|-------------------------|
| 1. Request | `SUBMITTED` | End User | Submit from **End User Dashboard** (Request Asset / BYOD) or (conceptually) **Asset Requests** → New Request. |
| 2. Manager | `MANAGER_APPROVED` / `MANAGER_REJECTED` | Manager | **Asset Requests** → row **Review** → Approve or Reject. |
| 3. IT | `IT_APPROVED` / `IT_REJECTED` | IT Management | **Asset Requests** → row **IT Review** (when status = MANAGER_APPROVED). |
| 4. Manager confirms IT | `MANAGER_CONFIRMED_IT` | Manager | **Asset Requests** → **Review** (when status = IT_APPROVED) → Confirm IT. |
| 5. Inventory / routing | `USER_ACCEPTANCE_PENDING` (stock) or `PROCUREMENT_REQUESTED` (no stock) | Inventory Manager | Inventory: allocate from stock **or** “Not available” → route to Procurement. |
| 6. Procurement | `PROCUREMENT_REQUIRED` → PO created/uploaded | Procurement Manager | **Procurement** → Purchase orders → Review & Approve / Reject / Upload PO. |
| 7. Finance | `PO_UPLOADED` / `PO_CREATED` → budget decision | Finance | **Finance** portal → Budget queue → Approve / Reject. |
| 8. Delivery | After Finance approved | Procurement Manager | **Procurement** → Deliveries → Confirm Delivery → Inventory. |
| 9. QC | `QC_PENDING` → `USER_ACCEPTANCE_PENDING` or `QC_FAILED` | Inventory / QC | Backend QC; frontend shows status. |
| 10. User acceptance | `USER_ACCEPTANCE_PENDING` → `FULFILLED` / `IN_USE` or `USER_REJECTED` | End User / Manager | End User accepts/rejects; Manager can confirm assignment. |

**Terminal / rejected:** Any `*_REJECTED` or `CLOSED` ends the workflow.

### 3.2 Frontend “Asset Requests” list – who sees what

- **Page:** `/asset-requests` (Asset Requests).
- **List:** `AssetRequestsList` shows requests from `AssetContext` (from API).
- **Row actions (by role):**
  - **View (eye):** Expand row → lifecycle bar + request context (all roles with access).
  - **Review (purple):** Shown when **Manager** can act:
    - Status `SUBMITTED` → initial Manager approval.
    - Status `IT_APPROVED` → Manager Confirm IT.
    - Status `FINANCE_APPROVED` → (if applicable).
    - Status `USER_ACCEPTANCE_PENDING` (with user accepted) / `MANAGER_CONFIRMED_ASSIGNMENT` → Manager confirm assignment.
  - **IT Review (green):** Shown for **IT Management** when status = `MANAGER_APPROVED`.
  - **Scan (blue):** Shown for **IT Management** when status = `BYOD_COMPLIANCE_CHECK` (BYOD path only).

### 3.3 Workflow progress bar (UI)

- **Component:** `WorkflowProgressBar` (e.g. in expanded row on Asset Requests).
- **Steps (conceptual):** Requested → Management → IT Validation → Inventory/Procurement → Quality Check (skipped for BYOD) → User Verification → Deployed.
- **Status mapping:** `WorkflowProgressBar` maps backend status to step index (e.g. `SUBMITTED` → step 0, `MANAGER_APPROVED` → 1, `IT_APPROVED` → 2, then Inventory/Procurement step, QC, User Verification, IN_USE/CLOSED).

---

## 4. BYOD (Bring Your Own Device) Path

BYOD is a **branch** after IT approval, instead of going to Inventory/Procurement.

### 4.1 Flow

1. End User submits request with **asset type BYOD** / ownership **BYOD** (from End User Dashboard).
2. Manager approves → `MANAGER_APPROVED`.
3. IT approves → `IT_APPROVED`.
4. Manager confirms IT → instead of Inventory, transition to **`BYOD_COMPLIANCE_CHECK`**.
5. **IT Management** runs BYOD compliance scan:
   - **Frontend:** Asset Requests → row with status **BYOD_COMPLIANCE_CHECK** → **Scan** → opens **ComplianceCheckModal**.
   - **API:** `byodComplianceCheck(requestId, userId)`.
   - On success, request can move to **`IN_USE`** (or backend sets appropriate status).
6. If BYOD fails: **`BYOD_REJECTED`** → workflow ends (terminal).

### 4.2 Roles for BYOD

- **End User:** Submit BYOD request.
- **Manager:** Approve, then Confirm IT (branch to BYOD).
- **IT Management:** **Scan** button when status = `BYOD_COMPLIANCE_CHECK`; runs compliance check (encryption, password, OS policies in modal).

### 4.3 Where to test BYOD

- **End User Dashboard:** Request asset → choose BYOD / device details (model, OS, serial).
- **Asset Requests** (as Manager): Approve → Confirm IT.
- **Asset Requests** (as IT Management): **IT Review** for `MANAGER_APPROVED`, then after Manager Confirms IT, **Scan** for `BYOD_COMPLIANCE_CHECK`.

---

## 5. Ticket Workflow

Tickets are **support requests** (e.g. hardware/software issues). They are separate from asset requests but can be linked to an asset/BYOD.

### 5.1 Ticket statuses (backend / UI)

- **OPEN** – newly created.
- **IN_PROGRESS** – IT has acknowledged or is working on it.
- **RESOLVED** – closed by IT.

(Labels in `statusLabels.js`: Open, In progress, Resolved.)

### 5.2 Who does what

| Step | Role | Action | Frontend / API |
|------|------|--------|-----------------|
| Create ticket | End User (any authenticated user) | Create with subject, description, priority, category, optional `related_asset_id` | End User Dashboard → “Create ticket” / **Tickets** → New ticket; API: `POST /tickets` (requestor from JWT). |
| List tickets | End User | See **own** tickets only | Tickets page (filtered by `requestor_id`). |
| List tickets | Manager | See department tickets | API filters by department. |
| List tickets | IT Management / Admin | See all (or scoped) | Tickets page. |
| Acknowledge | IT Management | OPEN → IN_PROGRESS | API: `POST /tickets/{id}/acknowledge` (IT only). |
| Diagnose | IT Management | Link to asset/BYOD: “repair” (company) or “secure” (BYOD); can set ticket IN_PROGRESS or RESOLVED | API: `POST /tickets/{id}/it/diagnose` with `outcome: "repair" | "secure"`. |
| Update progress | IT Management | Set resolution checklist / % | API: `POST /tickets/{id}/progress`. |
| Resolve | IT Management | Mark RESOLVED, checklist, notes | API: `POST /tickets/{id}/resolve`. |

### 4.3 Ticket RBAC (backend)

- **END_USER:** Create; read/update **only own** tickets (subject/description); cannot change status/priority/assignment.
- **MANAGER (position):** Read tickets by department.
- **IT_MANAGEMENT / ADMIN:** Acknowledge, diagnose, progress, resolve (and see tickets as per backend filters).

### 5.4 Where to test tickets

- **End User:** Dashboard → create ticket; **Tickets** (`/tickets`) → view own list, open detail.
- **IT Management:** **Tickets** → open a ticket → Acknowledge, Diagnose (repair/secure), Progress, Resolve (UI must call the above endpoints).

---

## 6. Procurement and Finance (Short)

- **Procurement Manager:**  
  - **Dashboard** (`/procurement`) – KPIs, trend.  
  - **Purchase orders** (`/procurement/purchase-orders`) – create/upload PO, approve/reject.  
  - **Deliveries** (`/procurement/deliveries`) – confirm delivery after Finance approval.  

- **Finance:**  
  - **Finance portal** (`/finance`) – budget queue; approve/reject requests that have PO.  

- **System Admin:**  
  - Read-only **Procurement updates** (`/dashboard/system-admin/procurement`) and **Finance updates** (`/dashboard/system-admin/finance`) – no actions, view step/status only.

---

## 7. Quick Test Checklist (by role)

- **End User**
  - [ ] Request company-owned asset (End User Dashboard).
  - [ ] Request BYOD asset (End User Dashboard).
  - [ ] Create a support ticket (End User Dashboard / Tickets).
  - [ ] Open Asset Requests; use **View** to see lifecycle on a request.
  - [ ] (If any) Accept/reject user acceptance step.

- **Manager**
  - [ ] Asset Requests → **Review** on `SUBMITTED` (approve/reject).
  - [ ] Asset Requests → **Review** on `IT_APPROVED` (Confirm IT) – company-owned vs BYOD branch.
  - [ ] Asset Requests → **Review** for user acceptance / assignment confirmation if applicable.

- **IT Management**
  - [ ] Asset Requests → **IT Review** on `MANAGER_APPROVED`.
  - [ ] Asset Requests → **Scan** on `BYOD_COMPLIANCE_CHECK` (BYOD flow).
  - [ ] Tickets → Acknowledge, Diagnose (repair/secure), Progress, Resolve.

- **Inventory Manager**
  - [ ] Allocate from stock or route to Procurement (no stock) for requests in inventory segment.

- **Procurement Manager**
  - [ ] Procurement → Purchase orders: approve/reject, upload PO.
  - [ ] Procurement → Deliveries: confirm delivery for Finance-approved requests.

- **Finance**
  - [ ] Finance portal: approve/reject requests in budget queue (with PO).

- **System Admin**
  - [ ] View Procurement updates and Finance updates (read-only); no action buttons.

---

## 8. References in code

- **Workflow doc:** `docs/WORKFLOW_FINANCE_PROCUREMENT.md`
- **State machine:** `backend/app/utils/state_machine.py` (transitions, terminal states, role per state)
- **Asset request list + actions:** `frontend/components/AssetRequestsList.jsx` (`canAct`, Review / IT Review / Scan)
- **BYOD compliance modal:** `frontend/components/ComplianceCheckModal.jsx` (Scan → `byodComplianceCheck`)
- **Manager modal:** `frontend/components/ManagerApprovalModal.jsx` (initial approval, confirm IT, etc.)
- **Status labels:** `frontend/lib/statusLabels.js`
- **Tickets API:** `backend/app/routers/tickets.py`; service: `backend/app/services/ticket_service.py`

Use this guide to drive role-based testing of the asset lifecycle, BYOD path, and tickets on the frontend.
