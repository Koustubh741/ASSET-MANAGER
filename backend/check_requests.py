import sys
import os
sys.path.append(os.path.join(os.getcwd(), "app"))

from app.database.database import SessionLocal
from app.models.models import AssetRequest

db = SessionLocal()

print("\n=== All Asset Requests ===")
reqs = db.query(AssetRequest).all()
print(f"Total requests: {len(reqs)}")

print("\n=== Last 5 Requests ===")
for r in reqs[-5:]:
    print(f"ID: {r.id}")
    print(f"  Asset: {r.asset_name}")
    print(f"  Status: {r.status}")
    print(f"  Procurement Stage: {r.procurement_finance_status}")
    print()

print("\n=== PROCUREMENT_REQUIRED Requests ===")
proc_reqs = db.query(AssetRequest).filter(AssetRequest.status == 'PROCUREMENT_REQUIRED').all()
print(f"Found {len(proc_reqs)} requests")
for r in proc_reqs:
    print(f"ID: {r.id}")
    print(f"  Asset: {r.asset_name}")
    print(f"  Procurement Stage: {r.procurement_finance_status}")
    print()

db.close()
