# BYOD Workflow – IT Admin Steps Guide

After Manager has approved and confirmed the IT decision, the request moves to **BYOD_COMPLIANCE_CHECK**. As IT Admin, follow these steps.

---

## Step 1: Log in as IT Admin

1. Go to **`/login`**
2. Log in with:
   - **richardroper@gmail.com** / password@123  
   - or **it_manager@itsm.com** / password123

3. You should see the **Technician Workbench** (IT Support dashboard).

---

## Step 2: Open the request

1. Click **"Pending Approval"** (first purple card).
2. Find your BYOD request (blue **BYOD** badge).
3. Click **"View Details"** or the request row to open details.

---

## Step 3: Register the device

**Do this if you have not registered the device yet.**

1. In Request Details, click **"Validate & Register BYOD"** (sky-blue button).
2. The system uses device details from the employee’s request (model, OS, serial number).
3. Wait for the confirmation that the device was registered.

---

## Step 4: Run compliance check

**Do this after the device is registered.**

1. Click **"Run Compliance Check"** (green button).
2. The **BYOD Security Scan** modal opens.
3. Click **"Run Compliance Check"** in the modal.
4. The system runs the MDM compliance check.
5. If successful, the request status becomes **IN_USE**.
6. The modal closes and the list refreshes.

---

## Step 5: Employee accepts the device

1. The employee logs in (e.g. **koustubh@gmail.com** or **JohnathanPine@gmail.com**).
2. Opens **"My Assigned Assets"**.
3. The BYOD device appears in their asset list.
4. No extra acceptance step is needed for BYOD (status is already IN_USE).

---

## Quick reference

| Step | Action | Button / Location |
|------|--------|-------------------|
| 1 | Log in as IT Admin | Login page |
| 2 | Open the request | Pending Approval → View Details |
| 3 | Register device | "Validate & Register BYOD" |
| 4 | Run compliance check | "Run Compliance Check" |
| 5 | Employee sees device | My Assigned Assets |

---

## Troubleshooting

- **Request not visible**  
  - Confirm you are on the IT Support dashboard (Technician Workbench).  
  - Hard-refresh (Ctrl+Shift+R) and log in again.  
  - Check the browser console for errors.

- **"Registration failed"**  
  - Confirm the request has device model, OS, and serial number (from the employee’s original BYOD form).  
  - If not, contact the requester to resubmit with complete details.

- **"BYOD device not registered" when running compliance**  
  - Complete Step 3 (Validate & Register BYOD) before running the compliance check.
