"""
End-to-end workflow state verification for Finance & Procurement separation.
Checks DB state for requests at each stage of the procurement/finance workflow.
"""
import asyncio, sys
sys.path.insert(0, '.')
from dotenv import load_dotenv; load_dotenv()
from app.database.database import AsyncSessionLocal
from app.models.models import AssetRequest, PurchaseOrder, PurchaseInvoice
from sqlalchemy.future import select
from sqlalchemy import func

PROCUREMENT_STATUSES = [
    'PROCUREMENT_REQUESTED', 'PO_UPLOADED', 'PO_VALIDATED',
    'FINANCE_APPROVED', 'QC_PENDING', 'PROCUREMENT_REJECTED',
    'FINANCE_REJECTED', 'PO_REJECTED',
]

async def run():
    async with AsyncSessionLocal() as db:
        print("=" * 60)
        print("WORKFLOW STATE VERIFICATION - Finance & Procurement")
        print("=" * 60)

        # 1. Count requests by status
        r = await db.execute(
            select(AssetRequest.status, func.count(AssetRequest.id).label('cnt'))
            .group_by(AssetRequest.status)
            .order_by(func.count(AssetRequest.id).desc())
        )
        rows = r.fetchall()
        print("\n[1] Asset Request Status Distribution:")
        total = 0
        for status, cnt in rows:
            total += cnt
            marker = " << PROCUREMENT/FINANCE" if status in PROCUREMENT_STATUSES else ""
            print(f"  {status:<35} {cnt:>4}{marker}")
        print(f"  {'TOTAL':<35} {total:>4}")

        # 2. Procurement workflow requests
        print("\n[2] Active Procurement Workflow Requests:")
        r2 = await db.execute(
            select(AssetRequest)
            .filter(AssetRequest.status.in_(PROCUREMENT_STATUSES))
            .order_by(AssetRequest.updated_at.desc())
        )
        proc_reqs = r2.scalars().all()
        if not proc_reqs:
            print("  No active procurement/finance requests found.")
        for req in proc_reqs[:20]:
            print(f"  [{req.status}] id={str(req.id)[:8]} | pf_status={req.procurement_finance_status} | updated={str(req.updated_at)[:10]}")

        # 3. PurchaseOrder stats
        r3 = await db.execute(
            select(PurchaseOrder.status, func.count(PurchaseOrder.id).label('cnt'))
            .group_by(PurchaseOrder.status)
        )
        rows3 = r3.fetchall()
        print("\n[3] PurchaseOrder Status Distribution:")
        for po_status, cnt in rows3:
            print(f"  {po_status:<30} {cnt:>4}")

        # 4. PurchaseInvoice count
        r4 = await db.execute(select(func.count(PurchaseInvoice.id)))
        inv_count = r4.scalar()
        print(f"\n[4] PurchaseInvoices total: {inv_count}")

        # 5. Finance Records
        from sqlalchemy import text
        r5 = await db.execute(text("SELECT finance_status, COUNT(*) FROM finance.finance_records GROUP BY finance_status"))
        rows5 = r5.fetchall()
        print("\n[5] Finance Records:")
        if rows5:
            for fs, cnt in rows5:
                print(f"  {fs:<30} {cnt:>4}")
        else:
            print("  No finance records yet (table is empty).")

        # 6. Workflow transition sanity check
        print("\n[6] State Machine Sanity Checks:")
        from app.utils.state_machine import validate_state_transition

        test_cases = [
            # (from, to, role, expected_valid)
            ('PO_UPLOADED', 'PROCUREMENT_APPROVED', 'PROCUREMENT', True),
            ('PO_VALIDATED', 'FINANCE_APPROVED', 'FINANCE', True),
            ('FINANCE_APPROVED', 'QC_PENDING', 'PROCUREMENT', False),  # Should fail - wrong role/transition
            ('QC_PENDING', 'USER_ACCEPTANCE_PENDING', 'ASSET_INVENTORY_MANAGER', True),
            ('PO_UPLOADED', 'FINANCE_APPROVED', 'FINANCE', False),  # Should fail - must go through PO_VALIDATED
        ]
        all_passed = True
        for (from_s, to_s, role, expected) in test_cases:
            valid, msg = validate_state_transition(from_s, to_s, role)
            ok = "OK" if valid == expected else "FAIL"
            if valid != expected:
                all_passed = False
            print(f"  {ok} {from_s:>30} -> {to_s:<30} ({role}){' | ' + msg if not valid else ''}")
        print(f"  {'All checks passed!' if all_passed else '[!] Some checks failed'}")

        print("\n" + "=" * 60)
        print("VERIFICATION COMPLETE")

asyncio.run(run())
