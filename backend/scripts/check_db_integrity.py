import sys
import os

# Add the backend directory to sys.path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from app.database.database import SessionLocal
from app.models.models import Asset
import traceback

db = SessionLocal()
try:
    assets = db.query(Asset).all()
    required_fields = ['name', 'type', 'model', 'vendor', 'serial_number', 'status']
    found_invalid = False
    for asset in assets:
        for field in required_fields:
            if getattr(asset, field) is None:
                print(f"Asset {asset.id} has NULL in {field}")
                found_invalid = True
    if not found_invalid:
        print("All standard assets have required fields.")
except Exception as e:
    traceback.print_exc()
finally:
    db.close()
