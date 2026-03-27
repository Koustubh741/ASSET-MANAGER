
import sys
import os
from sqlalchemy import text

# Add backend to path
sys.path.append(os.getcwd())
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from backend.app.database.database import engine

def check_schema():
    print("Connecting to database using app engine...")
    
    queries = [
        ("AssetAssignment FK (asset_id)", "SELECT conname FROM pg_constraint WHERE conname = 'asset_assignments_asset_id_fkey' OR conname LIKE '%asset_assignments_asset_id%'"),
        ("AssetInventory FK (asset_id)", "SELECT conname FROM pg_constraint WHERE conname = 'asset_inventory_asset_id_fkey' OR conname LIKE '%asset_inventory_asset_id%'"),
        ("Ticket Asset FK", "SELECT conname FROM pg_constraint WHERE conname = 'tickets_related_asset_id_fkey'"),
        ("ByodDevice Request FK", "SELECT conname FROM pg_constraint WHERE conname = 'byod_devices_request_id_fkey'"),
        ("SystemPatch Binary URL", "SELECT column_name FROM information_schema.columns WHERE table_schema = 'asset' AND table_name = 'system_patches' AND column_name = 'binary_url'")
    ]
    
    with engine.connect() as conn:
        for label, query in queries:
            try:
                result = conn.execute(text(query)).fetchone()
                if result:
                    print(f"[OK] {label}: Found {result[0]}")
                else:
                    print(f"[MISSING] {label}")
            except Exception as e:
                print(f"[ERROR] {label}: {e}")

if __name__ == "__main__":
    check_schema()
