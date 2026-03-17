# ITSM Platform Master Documentation

## 1. Project Overview & Proposal

The ITSM (IT Service Management) Platform is a comprehensive solution designed to manage the full lifecycle of IT assets, support tickets, and employee transitions.

### Key Capabilities

- **Role-Based Security:** 6 distinct roles (System Admin, IT, Inventory, Finance, Manager, Employee).
- **Asset Command Center:** Real-time inventory tracking and automated lifecycle management.
- **Intelligent Procurement:** 5-stage approval pipeline (Employee -> Manager -> IT -> Finance -> Delivery).
- **IT Support & Helpdesk:** Linked incident ticketing with mandatory diagnostics.
- **Secure Offboarding:** Snapshot-based asset reclamation and account locking.
- **Strategic Analytics:** Executive dashboards and operational reports.

## 2. Feature Implementation Matrix

Current Status: **~68% Complete** (15/22 Features Active)

| Module              | Feature                               | Status     |
| :------------------ | :------------------------------------ | :--------- |
| **Access Control**  | RBAC, User Onboarding                 | ✅ ACTIVE  |
| **Asset Mgmt**      | Hardware Tracking, Inventory, History | ✅ ACTIVE  |
| **Procurement**     | PR Workflow, Delivery Verification    | ✅ ACTIVE  |
| **IT Support**      | Incident Ticketing, Checklists, BYOD  | ✅ ACTIVE  |
| **HR Operations**   | Exit Workflow, Asset Reclamation      | ✅ ACTIVE  |
| **Employee Portal** | "My Assets", Service Catalog          | ✅ ACTIVE  |
| **Analytics**       | Executive Dashboards, Stock Alerts    | ✅ ACTIVE  |
| **Roadmap**         | SSO, Software Mgmt, Barcode Scanning  | ❌ Roadmap |

## 3. Technical Infrastructure & Setup

### Database Configuration (PostgreSQL)

The backend uses PostgreSQL with the `asset` schema.

- **Connectivity:** Controlled via `.env` variables (`DATABASE_URL` or individual host/port settings).
- **Setup:** Run `python setup_database.py` to initialize schemas and tables.
- **Mock Data:** Use `python populate_mock_data.py` for testing.

### Backend Workflow Engine

A standardized state machine manages transitions:
`SUBMITTED` -> `MANAGER_APPROVED` -> `IT_APPROVED` -> `PROCUREMENT_REQUESTED` -> `QC_PENDING` -> `USER_ACCEPTANCE_PENDING` -> `IN_USE` -> `CLOSED`.

### Integration Summary

- **Frontend-Backend:** Fully integrated via `apiClient.js` and `AssetContext.jsx`.
- **API Base:** `http://localhost:8000`
- **Authentication:** JWT-based persistent sessions.

## 4. Operational Workflows

### Asset Request & Procurement

1. **Employee** submits request (`SUBMITTED`).
2. **First-line Manager** approves justification (`MANAGER_APPROVED`).
3. **IT Management** performs technical spec verification (`IT_APPROVED`).
4. **Manager** confirms IT decision to finalize technical scope (`MANAGER_CONFIRMED_IT`).
5. **Inventory Manager** performs manual stock check:
   - **Found in Inventory**: Reserves asset and routes directly to User Acceptance.
   - **Needs Purchase**: Marks as "Not Available" to route to Procurement.
6. **Procurement Manager** creates/uploads Purchase Order (`PO_UPLOADED`).
7. **Finance** reviews budget and validates order (`PO_VALIDATED`).
8. **Finance/Procurement** finalizes approval/payment (`PROCUREMENT_APPROVED`).
9. **Procurement** confirms physical delivery from vendor (`DELIVERED`).
10. **Inventory Manager** performs Quality Control (`QC_PENDING`) and final allocation.
11. **Employee** accepts/rejects receipt of asset (`IN_USE`).

### IT Support (Ticketing)

- Tickets are auto-linked to assets.
- Technicians must complete diagnostic checklists before resolution notes can be submitted.

### Employee Exit (Offboarding)

1. **Admin** initiates exit.
2. **System** freezes asset/BYOD snapshot.
3. **Inventory Manager** reclaims physical assets.
4. **IT** wipes/unenrolls BYOD devices.
5. **Admin** finalizes and disables account.

## 5. System Status & Verification

- **Internal Docs:** Interactive API documentation available at `/docs`.
- **Audit Logs:** All significant actions are recorded in `system.audit_logs`.
- **Data Collection:** The `/api/v1/collect` endpoint allows external systems to auto-register assets via serial number detection.
