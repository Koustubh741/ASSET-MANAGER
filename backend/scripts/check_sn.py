from app.database.database import SessionLocal
from app.models.models import AuditLog, Asset
import json

db = SessionLocal()
target = '211334710009390'

print(f"Checking for serial_number: {target}")

# Check AuditLog
logs = db.query(AuditLog).all()
found_log = None
for l in logs:
    if l.details and isinstance(l.details, dict) and l.details.get('serial_number') == target:
        found_log = l
        break

if found_log:
    print(f"Log Found: ID={found_log.id}, Timestamp={found_log.timestamp}")
    # print(json.dumps(found_log.details, indent=2))
else:
    print("Log NOT Found")

# Check Asset
asset = db.query(Asset).filter(Asset.serial_number == target).first()
if asset:
    print(f"Asset Found: ID={asset.id}, Name={asset.name}")
else:
    print("Asset NOT Found")

db.close()
