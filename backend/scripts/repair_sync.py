from sqlalchemy.orm import Session
from app.database.database import SessionLocal
from app.models.models import AuditLog, Asset
from datetime import datetime
import json

def repair_assets():
    db = SessionLocal()
    try:
        # Find all DATA_COLLECT audit logs
        logs = db.query(AuditLog).filter(AuditLog.action == "DATA_COLLECT").all()
        print(f"Checking {len(logs)} collection logs...")
        
        repaired_count = 0
        total_logs = len(logs)
        
        for i, log in enumerate(logs):
            data = log.details
            if not data or not isinstance(data, dict):
                continue
            
            serial_number = data.get("serial_number")
            if not serial_number:
                continue
            
            # Check if asset exists
            existing_asset = db.query(Asset).filter(Asset.serial_number == serial_number).first()
            if existing_asset:
                continue
                
            # Need to create asset
            print(f"[{i+1}/{total_logs}] Repairing asset: {serial_number} from log {log.id}")
            
            try:
                hostname = data.get("hostname") or data.get("name", "Unknown")
                
                asset_metadata = data.get("asset_metadata", {})
                hardware = data.get("hardware", {})
                
                asset_type = data.get("type") or asset_metadata.get("type", "Unknown")
                asset_model = data.get("model") or hardware.get("model") or "Unknown"
                asset_vendor = data.get("vendor") or data.get("manufacturer") or hardware.get("manufacturer") or "Unknown"
                asset_segment = data.get("segment") or asset_metadata.get("segment", "IT")
                asset_location = data.get("location") or asset_metadata.get("location")
                asset_status = data.get("status", "Active")
                asset_assigned_to = data.get("assigned_to")
                
                specifications = {
                    "hardware": hardware if hardware else {k: v for k, v in data.items() if k in ["model", "manufacturer", "cpu", "ram", "storage"]},
                    "os": data.get("os", {}),
                    "network": data.get("network", {})
                }
                if not specifications["os"] and "os_version" in data:
                    specifications["os"] = {"version": data.get("os_version")}

                new_asset = Asset(
                    name=hostname,
                    type=asset_type,
                    model=asset_model,
                    vendor=asset_vendor,
                    serial_number=serial_number,
                    segment=asset_segment,
                    status=asset_status,
                    location=asset_location,
                    assigned_to=asset_assigned_to,
                    specifications=specifications,
                    cost=data.get("cost", 0.0)
                )
                
                db.add(new_asset)
                db.commit()
                repaired_count += 1
                print(f"  Successfully repaired {serial_number}")
            except Exception as e:
                print(f"  Failed to repair {serial_number}: {e}")
                db.rollback()
                
        print(f"\nRepair completed. Repaired {repaired_count} assets.")
        
    finally:
        db.close()

if __name__ == "__main__":
    repair_assets()
