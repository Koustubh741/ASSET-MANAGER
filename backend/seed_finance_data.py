"""
Idempotent finance data seeder.
Safe to run multiple times — will skip sections already seeded.
"""
import asyncio
import uuid
from datetime import datetime, timedelta
from sqlalchemy import select
from app.database.database import get_db_context
from app.models.models import Asset, PurchaseOrder, AssetRequest, User


async def seed_data():
    async with get_db_context() as session:
        # 1. Get an admin or finance user
        result = await session.execute(
            select(User).where(User.role.in_(['ADMIN', 'FINANCE', 'PROCUREMENT'])).limit(1)
        )
        user = result.scalars().first()
        if not user:
            result = await session.execute(select(User).limit(1))
            user = result.scalars().first()
        if not user:
            print("No users found. Please create a user first.")
            return

        print(f"Using user: {user.email}")

        # ---------------------------------------------------------------
        # Block 1: Assets with costs
        # Idempotency: skip if costed assets already assigned to this user
        # ---------------------------------------------------------------
        existing_asset = await session.execute(
            select(Asset).filter(Asset.assigned_to_id == user.id, Asset.cost > 0).limit(1)
        )
        if existing_asset.scalars().first():
            print("  [SKIP] Assets already seeded.")
        else:
            assets_data = [
                {"name": "MacBook Pro 16 (Engineering)", "type": "Laptop", "cost": 2500.0, "status": "In Use"},
                {"name": "Dell Precision 7550 (Dev)", "type": "Laptop", "cost": 2200.0, "status": "In Use"},
                {"name": "AWS EC2 Reserved Instance", "type": "Server", "cost": 15000.0, "status": "In Use"},
                {"name": "Adobe Creative Cloud (Annual)", "type": "Software", "cost": 600.0, "status": "In Use"},
                {"name": "CrowdStrike Falcon Endpoint", "type": "Software", "cost": 12000.0, "status": "In Use"},
                {"name": "Cisco Meraki MX64", "type": "Networking", "cost": 850.0, "status": "In Stock"},
                {"name": "HP EliteDesk 800 G5", "type": "Desktop", "cost": 1400.0, "status": "In Use"},
                {"name": "Microsoft Intune License (Annual)", "type": "Software", "cost": 3600.0, "status": "In Use"},
            ]
            for data in assets_data:
                session.add(Asset(
                    id=uuid.uuid4(),
                    name=data["name"],
                    type=data["type"],
                    model="Standard",
                    vendor="Various",
                    cost=data["cost"],
                    status=data["status"],
                    segment="IT",
                    purchase_date=(datetime.now() - timedelta(days=90)).date(),
                    assigned_to_id=user.id,
                    assigned_to=user.full_name,
                ))
            print(f"  [OK] Seeded {len(assets_data)} assets.")

        # ---------------------------------------------------------------
        # Block 2: PO_VALIDATED requests for Finance Budget Queue
        # Idempotency: skip if any PO_VALIDATED request with matching name already exists
        # ---------------------------------------------------------------
        po_validated_specs = [
            {"vendor": "Apple Business", "cost": 50000.0},
            {"vendor": "CDW Government", "cost": 8500.0},
        ]
        for spec in po_validated_specs:
            asset_name = f"New {spec['vendor']} Hardware Bundle"
            existing_req = await session.execute(
                select(AssetRequest).filter(
                    AssetRequest.asset_name == asset_name,
                    AssetRequest.requester_id == user.id,
                    AssetRequest.status == "PO_VALIDATED"
                ).limit(1)
            )
            if existing_req.scalars().first():
                print(f"  [SKIP] PO_VALIDATED request for '{spec['vendor']}' already exists.")
                continue

            req_id = uuid.uuid4()
            session.add(AssetRequest(
                id=req_id,
                requester_id=user.id,
                asset_name=asset_name,
                asset_type="Laptop",
                status="PO_VALIDATED",
                procurement_finance_status="PO_VALIDATED",
                cost_estimate=spec["cost"],
                asset_ownership_type="COMPANY_OWNED",
                business_justification="Q1 expansion hiring"
            ))
            session.add(PurchaseOrder(
                id=uuid.uuid4(),
                asset_request_id=req_id,
                uploaded_by=user.id,
                po_pdf_path=f"uploads/procurement/po_{uuid.uuid4().hex[:8]}.pdf",
                vendor_name=spec["vendor"],
                total_cost=spec["cost"],
                status="VALIDATED"
            ))
            print(f"  [OK] Seeded PO_VALIDATED request for '{spec['vendor']}'.")

        # ---------------------------------------------------------------
        # Block 3: Historical RECEIVED POs for Monthly Spend chart
        # Idempotency: skip per vendor if request already exists
        # ---------------------------------------------------------------
        received_specs = [
            {"vendor": "Dell Technologies", "cost": 12000.0, "months_ago": 2},
            {"vendor": "Microsoft Corp", "cost": 6000.0, "months_ago": 1},
            {"vendor": "Amazon Web Services", "cost": 4500.0, "months_ago": 0},
        ]
        for spec in received_specs:
            asset_name = f"{spec['vendor']} Purchase"
            existing_req = await session.execute(
                select(AssetRequest).filter(
                    AssetRequest.asset_name == asset_name,
                    AssetRequest.requester_id == user.id
                ).limit(1)
            )
            if existing_req.scalars().first():
                print(f"  [SKIP] Historical PO for '{spec['vendor']}' already exists.")
                continue

            purchase_date = datetime.now() - timedelta(days=spec["months_ago"] * 30)
            req_id = uuid.uuid4()
            session.add(AssetRequest(
                id=req_id,
                requester_id=user.id,
                asset_name=asset_name,
                asset_type="Hardware",
                status="IN_USE",
                cost_estimate=spec["cost"],
                asset_ownership_type="COMPANY_OWNED",
                business_justification="Infrastructure"
            ))
            session.add(PurchaseOrder(
                id=uuid.uuid4(),
                asset_request_id=req_id,
                uploaded_by=user.id,
                po_pdf_path=f"uploads/procurement/po_{uuid.uuid4().hex[:8]}.pdf",
                vendor_name=spec["vendor"],
                total_cost=spec["cost"],
                status="RECEIVED",
                created_at=purchase_date
            ))
            print(f"  [OK] Seeded historical PO for '{spec['vendor']}'.")

        await session.commit()
        print("Seed complete.")


if __name__ == "__main__":
    asyncio.run(seed_data())
