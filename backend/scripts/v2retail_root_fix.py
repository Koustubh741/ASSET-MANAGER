"""
V2 Retail ITSM — Master Database Root Fix
==========================================
Run from: d:\\ASSET-MANAGER\\backend
    python scripts/v2retail_root_fix.py

Phases:
  1. Pre-flight  — verify DB connection + admin existence
  2. Dept Sync   — upsert the 16 canonical V2 Retail departments
  3. Purge       — remove / deprecate legacy ghost departments
  4. User Seed   — seed V2 Retail workflow accounts (correct dept links)
  5. Role Norm   — normalize existing user roles to V2 Retail role map
  6. Audit       — final verification report
"""

import asyncio
import os
import sys
import uuid
import io

# Force UTF-8 output on Windows terminals
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

# ── Path setup ───────────────────────────────────────────────────────────────
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text, func
from sqlalchemy.future import select

from app.database.database import AsyncSessionLocal
from app.models.models import (
    Department, User, AssignmentGroup, AssignmentGroupMember, Ticket, Asset
)
from app.services.user_service import get_password_hash

# ── Colour helpers ────────────────────────────────────────────────────────────
G = '\033[92m'   # green
R = '\033[91m'   # red
Y = '\033[93m'   # yellow
B = '\033[94m'   # blue
C = '\033[96m'   # cyan
W = '\033[97m'   # white
X = '\033[0m'    # reset

def ok(msg):    print(f"  {G}[OK]{X}    {msg}")
def warn(msg):  print(f"  {Y}[WARN]{X}  {msg}")
def info(msg):  print(f"  {C}[INFO]{X}  {msg}")
def err(msg):   print(f"  {R}[FAIL]{X}  {msg}")
def new(msg):   print(f"  {B}[NEW]{X}   {msg}")
def upd(msg):   print(f"  {W}[UPD]{X}   {msg}")

def section(title):
    print(f"\n{B}{'='*65}")
    print(f"  {title}")
    print(f"{'='*65}{X}\n")

# ── Canonical V2 Retail Department Master List ────────────────────────────────
V2_RETAIL_DEPTS = [
    {"name": "ADMIN",               "slug": "admin",     "desc": "General administration and facility support."},
    {"name": "B&M",                 "slug": "bandm",     "desc": "Buying & Merchandising - Product selection and planning."},
    {"name": "BD",                  "slug": "bd",        "desc": "Business Development - Partnerships and growth."},
    {"name": "F&A",                 "slug": "fanda",     "desc": "Finance & Accounts - Invoicing, budgeting and auditing."},
    {"name": "HR",                  "slug": "hr",        "desc": "Human Resources - Recruitment and employee relations."},
    {"name": "INVENTORY",           "slug": "inventory", "desc": "Warehouse management and stock tracking."},
    {"name": "IT",                  "slug": "it",        "desc": "Information Technology and retail systems support."},
    {"name": "LOSS PREVENTION",     "slug": "lossprev",  "desc": "Security and shrinkage management."},
    {"name": "MARKETING",           "slug": "marketing", "desc": "Branding and campaign management."},
    {"name": "NSO",                 "slug": "nso",       "desc": "New Store Opening - planning and deployment."},
    {"name": "PLANNING",            "slug": "planning",  "desc": "Strategic organisational planning."},
    {"name": "PROJECT",             "slug": "project",   "desc": "Infrastructure builds and special initiatives."},
    {"name": "RETAIL",              "slug": "retail",    "desc": "Core store operations management."},
    {"name": "RETAIL OPERATION",    "slug": "retailops", "desc": "Back-end operational support for store networks."},
    {"name": "SCM",                 "slug": "scm",       "desc": "Supply Chain Management - Logistics and distribution."},
    {"name": "LEGAL & COMPANY SECRETARY", "slug": "legal",    "desc": "Compliance and corporate governance."},
]

V2_DEPT_NAMES = {d["name"] for d in V2_RETAIL_DEPTS}

# ── V2 Retail Workflow Seed Accounts ─────────────────────────────────────────
DEFAULT_PASSWORD = "V2Retail@123"

V2_SEED_USERS = [
    {
        "email":      "admin@v2retail.com",
        "full_name":  "V2 System Administrator",
        "role":       "ADMIN",
        "position":   "System Admin",
        "department": "IT",
        "domain":     "ADMINISTRATION",
        "persona":    "SYSTEM_ADMIN",
    },
    {
        "email":      "it.head@v2retail.com",
        "full_name":  "Head IT Support",
        "role":       "IT_MANAGEMENT",
        "position":   "Head IT Support",
        "department": "IT",
        "domain":     "SUPPORT",
        "persona":    "IT_OPERATIONS",
    },
    {
        "email":      "scm.head@v2retail.com",
        "full_name":  "SCM Procurement Head",
        "role":       "PROCUREMENT",
        "position":   "SCM Head",
        "department": "SCM",
        "domain":     "MANAGEMENT",
        "persona":    "PROCUREMENT_OPS",
    },
    {
        "email":      "fa.head@v2retail.com",
        "full_name":  "Finance & Accounts Head",
        "role":       "FINANCE",
        "position":   "F&A Head",
        "department": "F&A",
        "domain":     "FINANCE",
        "persona":    "FINANCE_GOVERNANCE",
    },
    {
        "email":      "inventory.head@v2retail.com",
        "full_name":  "Inventory Controller",
        "role":       "SUPPORT",
        "position":   "Inventory Head",
        "department": "INVENTORY",
        "domain":     "INVENTORY",
        "persona":    "INVENTORY_CONTROL",
    },
    {
        "email":      "store.manager@v2retail.com",
        "full_name":  "Store Manager (Retail)",
        "role":       "MANAGER",
        "position":   "SM",
        "department": "RETAIL",
        "domain":     "MANAGEMENT",
        "persona":    "MANAGER",
    },
    {
        "email":      "lp.head@v2retail.com",
        "full_name":  "Loss Prevention Officer",
        "role":       "LOSS_PREVENTION",
        "position":   "Zonal LP Head",
        "department": "LOSS PREVENTION",
        "domain":     "SECURITY",
        "persona":    "LOSS_PREVENTION",
    },
    {
        "email":      "legal.head@v2retail.com",
        "full_name":  "Company Secretary Head",
        "role":       "MANAGER",
        "position":   "Head CS",
        "department": "LEGAL & COMPANY SECRETARY",
        "domain":     "COMPLIANCE",
        "persona":    "MANAGER",
    },
]

# ═════════════════════════════════════════════════════════════════════════════
# PHASE 1 — Pre-flight
# ═════════════════════════════════════════════════════════════════════════════
async def phase1_preflight(db):
    section("PHASE 1 — Pre-flight Verification")

    # Check DB connection
    try:
        await db.execute(text("SELECT 1"))
        ok("Database connection to ITSM_V2RETAIL confirmed.")
    except Exception as e:
        err(f"Cannot connect to database: {e}")
        raise

    # Count existing depts
    dept_count = (await db.execute(select(func.count()).select_from(Department))).scalar()
    user_count = (await db.execute(select(func.count()).select_from(User))).scalar()
    info(f"Current state: {dept_count} department(s), {user_count} user(s) in database.")

    # Must have at least one ADMIN
    admin_res = await db.execute(select(User).where(User.role == 'ADMIN').limit(1))
    admin_user = admin_res.scalar_one_or_none()
    if admin_user:
        ok(f"Admin user found: {admin_user.email} (ID: {admin_user.id})")
    else:
        warn("No ADMIN user found — departments will be created without a manager link.")

    return admin_user

# ═════════════════════════════════════════════════════════════════════════════
# PHASE 2 — Department Sync (Canonical 16)
# ═════════════════════════════════════════════════════════════════════════════
async def phase2_dept_sync(db, admin_user):
    section("PHASE 2 — V2 Retail Department Sync (Canonical 16)")

    admin_id = admin_user.id if admin_user else None

    # Load all existing departments
    curr_res = await db.execute(select(Department))
    curr_depts = curr_res.scalars().all()

    # Step 1: Temporarily free up all slugs to avoid unique-constraint conflicts
    for d in curr_depts:
        d.slug = f"tmp_{uuid.uuid4().hex[:8]}"
    await db.flush()

    curr_names = {d.name: d for d in curr_depts}
    dept_id_map = {}   # name -> id (for use in later phases)

    for d_info in V2_RETAIL_DEPTS:
        name = d_info["name"]

        if name in curr_names:
            dept = curr_names[name]
            dept.slug = d_info["slug"]
            dept.description = d_info["desc"]
            if admin_id and not dept.manager_id:
                dept.manager_id = admin_id
            upd(f"Dept updated  : {name}")
        else:
            dept = Department(
                name=d_info["name"],
                slug=d_info["slug"],
                description=d_info["desc"],
                manager_id=admin_id,
            )
            db.add(dept)
            new(f"Dept created  : {name}")

        await db.flush()
        dept_id_map[name] = dept.id

        # Ensure a default assignment group exists
        group_name = f"{name} Support Group"
        grp_res = await db.execute(
            select(AssignmentGroup).where(AssignmentGroup.name == group_name)
        )
        group = grp_res.scalar_one_or_none()
        if not group:
            group = AssignmentGroup(
                name=group_name,
                department_id=dept.id,
                description=f"Primary support group for {name}",
                manager_id=admin_id,
            )
            db.add(group)
            await db.flush()
            info(f"  + Assignment group created: {group_name}")

        # Add admin to group if not already a member
        if admin_id:
            mem_res = await db.execute(
                select(AssignmentGroupMember).where(
                    AssignmentGroupMember.group_id == group.id,
                    AssignmentGroupMember.user_id == admin_id,
                )
            )
            if not mem_res.scalar_one_or_none():
                db.add(AssignmentGroupMember(group_id=group.id, user_id=admin_id))

    ok(f"All {len(V2_RETAIL_DEPTS)} V2 Retail departments synced.")
    return dept_id_map

# ═════════════════════════════════════════════════════════════════════════════
# PHASE 3 — Legacy Department Purge
# ═════════════════════════════════════════════════════════════════════════════
async def phase3_purge_legacy(db, dept_id_map):
    section("PHASE 3 — Legacy Department Purge")

    # Reload all departments (post-sync)
    curr_res = await db.execute(select(Department))
    all_depts = curr_res.scalars().all()

    # IT is our reassignment fallback
    it_id = dept_id_map.get("IT")

    deprecated_count = 0
    purged_count = 0
    blocked_count = 0

    for dept in all_depts:
        if dept.name in V2_DEPT_NAMES:
            continue   # canonical — skip

        # Flag as deprecated (preserve existing [DEPRECATED] prefix logic)
        clean_name = dept.name.replace("[DEPRECATED] ", "")
        deprecated_label = f"[DEPRECATED] {clean_name}"
        dept.name = deprecated_label
        deprecated_count += 1
        warn(f"Marked deprecated: {deprecated_label}")

        # Reassign users
        await db.execute(
            text("UPDATE auth.users SET department_id = :it_id WHERE department_id = :d_id"),
            {"it_id": it_id, "d_id": dept.id}
        )
        # Reassign tickets
        await db.execute(
            text("UPDATE support.tickets SET target_department_id = :it_id WHERE target_department_id = :d_id"),
            {"it_id": it_id, "d_id": dept.id}
        )

    await db.flush()

    # Hard-delete safe deprecated depts
    dep_res = await db.execute(select(Department).where(Department.name.like('[DEPRECATED]%')))
    deprecated_depts = dep_res.scalars().all()

    for dept in deprecated_depts:
        # Safety checks
        uc = (await db.execute(select(func.count()).select_from(User).where(User.department_id == dept.id))).scalar()
        tc = (await db.execute(select(func.count()).select_from(Ticket).where(Ticket.target_department_id == dept.id))).scalar()
        ac = (await db.execute(select(func.count()).select_from(Asset).where(Asset.department_id == dept.id))).scalar()

        if uc > 0 or tc > 0 or ac > 0:
            warn(f"Cannot purge '{dept.name}' — {uc} user(s), {tc} ticket(s), {ac} asset(s) still linked.")
            blocked_count += 1
            continue

        # Delete group members + groups first
        grp_res = await db.execute(select(AssignmentGroup).where(AssignmentGroup.department_id == dept.id))
        groups = grp_res.scalars().all()
        for g in groups:
            mem_res = await db.execute(select(AssignmentGroupMember).where(AssignmentGroupMember.group_id == g.id))
            for m in mem_res.scalars().all():
                await db.delete(m)
            await db.delete(g)

        await db.delete(dept)
        purged_count += 1
        ok(f"Purged: {dept.name}")

    info(f"Deprecated: {deprecated_count} | Hard-deleted: {purged_count} | Blocked (live data): {blocked_count}")

# ═════════════════════════════════════════════════════════════════════════════
# PHASE 4 — V2 Retail User Seeding
# ═════════════════════════════════════════════════════════════════════════════
async def phase4_seed_users(db, dept_id_map):
    section("PHASE 4 — V2 Retail Workflow User Seeding")

    pw_hash = get_password_hash(DEFAULT_PASSWORD)

    for u_data in V2_SEED_USERS:
        email     = u_data["email"]
        dept_name = u_data["department"]
        dept_id   = dept_id_map.get(dept_name)

        if not dept_id:
            warn(f"Department '{dept_name}' not found for {email} — skipping.")
            continue

        res = await db.execute(select(User).where(User.email == email))
        user = res.scalar_one_or_none()

        if not user:
            user = User(
                id=uuid.uuid4(),
                email=email,
                full_name=u_data["full_name"],
                password_hash=pw_hash,
                role=u_data["role"],
                status="ACTIVE",
                position=u_data["position"],
                domain=u_data["domain"],
                department_id=dept_id,
                persona=u_data.get("persona"),
            )
            db.add(user)
            new(f"Created  : {email} → {dept_name} ({u_data['role']})")
        else:
            user.full_name     = u_data["full_name"]
            user.role          = u_data["role"]
            user.password_hash = pw_hash
            user.position      = u_data["position"]
            user.domain        = u_data["domain"]
            user.department_id = dept_id
            user.status        = "ACTIVE"
            user.persona       = u_data.get("persona")
            upd(f"Updated  : {email} → {dept_name} ({u_data['role']})")

        await db.flush()

    ok(f"Seeded {len(V2_SEED_USERS)} V2 Retail workflow accounts.")
    info(f"Default password for all seeded accounts: {DEFAULT_PASSWORD}")

# ═════════════════════════════════════════════════════════════════════════════
# PHASE 5 — Role Normalization
# ═════════════════════════════════════════════════════════════════════════════
async def phase5_role_normalization(db, dept_id_map):
    section("PHASE 5 — Role Normalization")

    # Load all users with their dept
    res = await db.execute(select(User))
    users = res.scalars().all()

    # Build reverse map: dept_id -> dept_name
    id_to_name = {v: k for k, v in dept_id_map.items()}

    it_id = dept_id_map.get("IT")
    fixed_null  = 0
    fixed_role  = 0

    manager_keywords = {"MANAGER", "MGR", "SM", "ASM", "HEAD", "AVP", "VP", "GM", "PRESIDENT", "DIRECTOR", "LEAD"}

    for user in users:
        changed = False
        pos = (user.position or "").upper()

        # Fix NULL dept — reassign to IT
        if not user.department_id:
            user.department_id = it_id
            user.role = user.role or "END_USER"
            warn(f"NULL dept fixed → IT: {user.email}")
            fixed_null += 1
            changed = True

        dept_name = id_to_name.get(user.department_id, "")

        # LP dept → must be LOSS_PREVENTION
        if dept_name == "LOSS PREVENTION" and user.role != "LOSS_PREVENTION":
            user.role = "LOSS_PREVENTION"
            fixed_role += 1
            changed = True

        # IT dept with manager/head position → IT_MANAGEMENT
        elif dept_name == "IT" and user.role not in ("ADMIN", "IT_MANAGEMENT", "LOSS_PREVENTION"):
            if any(kw in pos for kw in manager_keywords):
                user.role = "IT_MANAGEMENT"
                fixed_role += 1
                changed = True

        # F&A dept with manager/head → FINANCE
        elif dept_name == "F&A" and user.role not in ("ADMIN", "FINANCE"):
            if any(kw in pos for kw in manager_keywords):
                user.role = "FINANCE"
                fixed_role += 1
                changed = True

        # SCM dept with manager/head → PROCUREMENT
        elif dept_name == "SCM" and user.role not in ("ADMIN", "PROCUREMENT"):
            if any(kw in pos for kw in manager_keywords):
                user.role = "PROCUREMENT"
                fixed_role += 1
                changed = True

        if changed:
            await db.flush()

    ok(f"Role normalization complete. NULL depts fixed: {fixed_null} | Role upgrades: {fixed_role}")

# ═════════════════════════════════════════════════════════════════════════════
# PHASE 6 — Final Verification Audit
# ═════════════════════════════════════════════════════════════════════════════
async def phase6_audit(db):
    section("PHASE 6 — Final Verification Audit")

    # 1. Department count
    dept_res = await db.execute(select(Department))
    all_depts = dept_res.scalars().all()
    canonical = [d for d in all_depts if d.name in V2_DEPT_NAMES]
    deprecated = [d for d in all_depts if d.name.startswith("[DEPRECATED]")]

    print(f"  {'─'*55}")
    print(f"  {'Department Audit':50s}")
    print(f"  {'─'*55}")
    print(f"  Total departments in DB   : {len(all_depts)}")
    print(f"  Canonical V2 Retail depts : {len(canonical)}")
    if len(canonical) == 16:
        ok("Exactly 16 canonical departments — PASS ✅")
    else:
        missing = V2_DEPT_NAMES - {d.name for d in canonical}
        err(f"Only {len(canonical)}/16 canonical depts. Missing: {missing}")

    if deprecated:
        warn(f"Remaining deprecated (blocked by live data): {len(deprecated)}")
        for d in deprecated:
            print(f"    - {d.name}")
    else:
        ok("No deprecated ghost departments — PASS ✅")

    # 2. Users per department
    print(f"\n  {'─'*55}")
    print(f"  {'Users per V2 Retail Department':50s}")
    print(f"  {'─'*55}")
    for dept in sorted(canonical, key=lambda d: d.name):
        uc = (await db.execute(
            select(func.count()).select_from(User).where(User.department_id == dept.id)
        )).scalar()
        bar = "▓" * min(uc, 30)
        print(f"  {dept.name:<22s} {uc:>4d}  {bar}")

    # 3. NULL department users
    null_count = (await db.execute(
        select(func.count()).select_from(User).where(User.department_id.is_(None))
    )).scalar()
    print(f"\n  Users with NULL department_id: {null_count}")
    if null_count == 0:
        ok("Zero NULL department users — PASS ✅")
    else:
        err(f"{null_count} users still have NULL department_id — investigate!")

    # 4. Seeded workflow accounts
    print(f"\n  {'─'*55}")
    print(f"  {'V2 Retail Workflow Accounts':50s}")
    print(f"  {'─'*55}")
    all_pass = True
    for u_data in V2_SEED_USERS:
        res = await db.execute(select(User).where(User.email == u_data["email"]))
        user = res.scalar_one_or_none()
        if user and user.status == "ACTIVE" and user.department_id:
            print(f"  {G}✅{X}  {u_data['email']:<35s} role={user.role}")
        else:
            print(f"  {R}❌{X}  {u_data['email']:<35s} MISSING or INACTIVE")
            all_pass = False

    if all_pass:
        ok("All 8 workflow accounts verified — PASS ✅")
    else:
        err("Some workflow accounts missing or inactive — CHECK!")

    print(f"\n{B}{'='*65}{X}")
    print(f"{G if all_pass and null_count == 0 and len(canonical) == 16 else R}  ROOT FIX {'COMPLETE — ALL CHECKS PASSED ✅' if (all_pass and null_count == 0 and len(canonical) == 16) else 'COMPLETE — WARNINGS ABOVE ⚠️'}{X}")
    print(f"{B}{'='*65}{X}\n")
    print(f"  Login credentials for all seeded accounts: {DEFAULT_PASSWORD}")

# ═════════════════════════════════════════════════════════════════════════════
# MAIN
# ═════════════════════════════════════════════════════════════════════════════
async def main():
    print(f"\n{B}{'='*65}")
    print("  V2 RETAIL ITSM — MASTER DATABASE ROOT FIX")
    print(f"  Database: ITSM_V2RETAIL @ 127.0.0.1:5432")
    print(f"{'='*65}{X}\n")

    async with AsyncSessionLocal() as db:
        try:
            admin_user  = await phase1_preflight(db)
            dept_id_map = await phase2_dept_sync(db, admin_user)
            await phase3_purge_legacy(db, dept_id_map)
            await phase4_seed_users(db, dept_id_map)
            await phase5_role_normalization(db, dept_id_map)

            # Commit all changes before final audit
            await db.commit()
            info("All changes committed to ITSM_V2RETAIL.")

            await phase6_audit(db)

        except Exception as e:
            await db.rollback()
            err(f"FATAL — rolled back all changes: {e}")
            import traceback
            traceback.print_exc()
            sys.exit(1)

if __name__ == "__main__":
    asyncio.run(main())
