# V2 Retail ITSM Platform — Master Documentation

## 1. Project Overview: The V2 Retail Build

The ITSM (IT Service Management) Platform for **V2 Retail** is a high-fidelity enterprise ecosystem designed to manage the full lifecycle of IT assets, retail infrastructure, and employee identities across 16 specialized departments.

### Key Capabilities

- **Deep RBAC (Role-Based Access Control):** Granular security permissions for 800+ functional designations (e.g., ASM, LPO, Basis Head, CIO).
- **Multi-Departmental Integration:** Unified management across Corporate (HQ), Warehouse (SCM), and Store (Retail) environments.
- **Retail Hardware Lifecycle:** Tracking specialized retail assets (Barcode Scanners, Thermal Printers, POS Units) alongside backend server infrastructure.
- **Intelligent Financial Governance:** 5-stage procurement pipeline with CFO/Finance oversight.
- **Security & Loss Prevention:** Specialized "Loss Prevention" (LP) protocols for asset reclamation and physical security verification.

---

## 2. Departmental Matrix (16 Core Verticals)

The platform is architected around these 16 core departments, each with dedicated workflows:

1.  **HR (Human Resources)**: Employee lifecycle and onboarding.
2.  **BD (Business Development)**: Regional growth and site expansion.
3.  **IT (Information Technology)**: Infrastructure, SAP/ERP, Security, and Support.
4.  **LOSS PREVENTION (LP)**: Inventory security and audit compliance.
5.  **MARKETING**: Digital signage and customer-facing technology.
6.  **NSO (New Store Opening)**: Rapid deployment kits for new retail sites.
7.  **PLANNING**: Resource allocation and strategic forecasting.
8.  **ADMIN**: Facility management and office infrastructure.
9.  **PROJECT**: Construction and site-build technical oversight.
10. **INVENTORY**: Master stock control and asset distribution.
11. **RETAIL OPERATION**: Day-to-day store-level technical support.
12. **RETAIL**: Store-facing assets and associate management.
13. **SCM (Supply Chain Management)**: Warehouse and logistics technology.
14. **F&A (Finance & Accounts)**: Budgeting, PO validation, and CFO-level reporting.
15. **B&M (Buying & Merchandising)**: Merchandising tools and vendor portals.
16. **LEGAL & COMPANY SECRETARY**: Compliance, corporate governance, and secretarial functions.

---

## 3. Role & Permission Infrastructure

The V2 Retail build uses a specialized **Persona-Based** identity model:

| Role Level | Target Personas | Primary Dashboard |
| :--- | :--- | :--- |
| **EXECUTIVE** | CEO, CFO, CIO, CTO, Zonal Managers | `SystemAdminAnalytics` |
| **SYSTEM ADMIN** | System Admin, Basis Head | `SystemAdminDashboard` |
| **IT MANAGEMENT** | Head-IT Support, Infra Head, DBAs | `ITSupportDashboard` |
| **FINANCE** | CFO, Finance Managers, Executives | `FinanceDashboard` |
| **PROCUREMENT** | SCM Head, Procurement Managers | `ProcurementManagerDashboard` |
| **LOSS PREVENTION** | Zonal LP, LPO, CCTV Technicians | `LossPreventionDashboard` |
| **MANAGER** | Store Managers (SM), Warehouse Managers | `BusinessOpsDashboard` |
| **EMPLOYEE** | Store Associates, Executives, Trainees | `EndUserDashboard` |

---

## 4. V2 Retail Workflows

### 4.1. Procurement Pipeline (V2 Logic)
1. **Employee** (Any Dept) submits Purchase Request (PR) with justification.
2. **Department Manager** (SM / ASM / Dept Head) approves business justification.
3. **IT Management** (Head-IT / Infra Head / ERP Apps Head) approves technical specifications.
4. **Department Manager** (Oversight) confirms the IT decision.
5. **SCM** (Supply Chain Management) creates the Purchase Order (PO) with vendor details.
6. **F&A** (Finance & Accounts) validates the PO against budget and gives final financial approval.
7. **SCM** (Supply Chain Management) confirms physical delivery from vendor.
8. **INVENTORY** (Inventory Dept) performs Quality Control (QC) and allocates the asset to the requestor.
9. **Employee** verifies asset condition and accepts (or raises an issue).
10. **Department Manager** (Final Oversight) confirms the completed assignment.
11. **System** marks asset as `IN_USE`; workflow closed.

### 4.2. Loss Prevention & Incident Mgmt
Specialized "Loss Prevention" (LP) dashboards track physical security assets. LP Officers (LPO) have authority to trigger "Asset Reclamation" workflows independently of HR.

### 4.3. NSO (New Store Opening) Kits
Automated asset grouping for NSO kits, allowing rapid provisioning of POS, Scanners, and networking gear for new locations.

---

## 5. Technical Stack

- **Frontend**: Next.js 14, Tailwind CSS, Lucide Icons.
- **Backend**: Python 3.11, FastAPI, SQLAlchemy 2.0.
- **Database**: PostgreSQL (Schematized: `auth`, `asset`, `support`, `system`, `finance`, `security`).
- **Identity**: `RoleContext.js` with integrated V2 Retail persona mapping.

---

## 6. Verification & Auditing

All actions are logged in the `system.audit_logs`. The **System Admin** can view the complete **Persona Matrix** to audit permission overlap across departments.
