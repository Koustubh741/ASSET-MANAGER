from app.database.database import SessionLocal
from app.models.models import AuditLog
import json

db = SessionLocal()
target = '211334710009390'

log = None
for l in db.query(AuditLog).all():
    if l.details and isinstance(l.details, dict) and l.details.get('serial_number') == target:
        log = l
        break

if log:
    print(json.dumps(log.details, indent=2))
else:
    print("Not found")
db.close()
