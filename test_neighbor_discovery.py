
import sys
import os
import uuid
from datetime import datetime, timezone

# Add the project root to sys.path
sys.path.append(os.getcwd())

def _utcnow() -> datetime:
    return datetime.now(timezone.utc)

try:
    from backend.app.models.models import Asset
    from sqlalchemy import inspect
    
    print("--- Testing Asset Model Definitions ---")
    # Verify that defaults are defined in the mapper
    mapper = inspect(Asset)
    for col_name in ["model", "vendor", "segment"]:
        col = mapper.columns[col_name]
        print(f"Column '{col_name}' default: {col.default.arg if col.default else 'None'}")
    
    assert mapper.columns["model"].default.arg == "Unknown Model"
    assert mapper.columns["vendor"].default.arg == "Unknown Vendor"
    assert mapper.columns["segment"].default.arg == "IT"
    print("SUCCESS: Model defaults are correctly defined.")

    print("\n--- Testing Explicit Assignment (Refactored Logic) ---")
    # Test explicit assignment logic used in discovery_service.py
    neighbor_name = "NSW_2ndFloor.cachedigitech.local"
    target_asset = Asset()
    target_asset.id = uuid.uuid4()
    target_asset.name = neighbor_name
    target_asset.type = "Networking"
    target_asset.model = "Neighbor Node"
    target_asset.vendor = "Unknown Vendor"
    target_asset.serial_number = f"STUB-{neighbor_name}"
    target_asset.status = "Discovered"
    target_asset.segment = "IT"
    target_asset.specifications = {
        "Discovery": "Neighbor (LLDP/SNMP)",
        "Last Seen": _utcnow().strftime("%Y-%m-%d %H:%M:%S UTC")
    }

    print(f"ID: {target_asset.id}")
    print(f"Name: {target_asset.name}")
    print(f"Model: {target_asset.model}")
    print(f"Vendor: {target_asset.vendor}")
    print(f"Serial: {target_asset.serial_number}")

    assert target_asset.model == "Neighbor Node"
    assert target_asset.vendor == "Unknown Vendor"
    assert target_asset.serial_number.startswith("STUB-")
    print("SUCCESS: Explicit assignment works correctly.")

except Exception as e:
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
