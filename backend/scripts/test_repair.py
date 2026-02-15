from sqlalchemy.orm import Session
from app.database.database import SessionLocal
from app.models.models import Asset
from datetime import datetime

data = {
  "serial_number": "211334710009390",
  "hostname": "LAPTOP-JHTTQ3PC",
  "timestamp": "2026-01-09T17:06:38.110576",
  "asset_metadata": {
    "type": "Server",
    "segment": "Infrastructure",
    "location": "Windows Environment"
  },
  "hardware": {
    "hostname": "LAPTOP-JHTTQ3PC",
    "os": {
      "name": "Windows",
      "version": "10.0.26100",
      "release": "10",
      "architecture": "AMD64"
    },
    "uptime_seconds": 267951,
    "boot_time": "2026-01-06T14:40:46.427401",
    "cpu": {
      "cores_logical": 12,
      "cores_physical": 8,
      "usage_percent": 32.6
    },
    "memory": {
      "total": 16873545728,
      "available": 2451173376,
      "percent": 85.5
    },
    "disk": [
      {
        "device": "C:\\",
        "mountpoint": "C:\\",
        "fstype": "NTFS",
        "total": 509722226688,
        "used": 316616278016,
        "free": 193105948672,
        "percent": 62.1
      }
    ]
  },
  "network": {
    "interfaces": [
      {
        "name": "Local Area Connection* 1",
        "ipv4": "169.254.227.89",
        "ipv6": "fe80::7023:dd5f:889d:7455",
        "mac": "C2-35-32-51-9E-2D"
      }
    ]
  }
}

db = SessionLocal()

try:
    serial_number = data.get("serial_number")
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
        "hardware": hardware,
        "os": data.get("os", {}),
        "network": data.get("network", {})
    }

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
    print("Successfully created asset")
except Exception as e:
    print(f"FAILED: {e}")
    import traceback
    traceback.print_exc()
    db.rollback()
finally:
    db.close()
