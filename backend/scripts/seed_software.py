import sys
import os
import uuid
from datetime import datetime, timedelta
import random

# Add backend to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import SessionLocal
import models

def seed_software():
    db = SessionLocal()
    try:
        # Clear existing licenses
        db.query(models.SoftwareLicense).delete()
        db.commit()
        print("[OK] Cleared existing software licenses")

        software_data = [
            {"name": "Adobe Creative Cloud", "vendor": "Adobe", "seat_count": 50, "cost": 1200, "status": "Active"},
            {"name": "Microsoft 365 Business", "vendor": "Microsoft", "seat_count": 200, "cost": 4500, "status": "Active"},
            {"name": "Slack Enterprise", "vendor": "Slack", "seat_count": 150, "cost": 3200, "status": "Expiring"},
            {"name": "Zoom Pro", "vendor": "Zoom", "seat_count": 30, "cost": 800, "status": "Active"},
            {"name": "Acrobat DC", "vendor": "Adobe", "seat_count": 25, "cost": 650, "status": "Active"},
            {"name": "AutoCAD Enterprise", "vendor": "Autodesk", "seat_count": 10, "cost": 15000, "status": "Active"},
            {"name": "GitHub Enterprise", "vendor": "GitHub", "seat_count": 100, "cost": 2100, "status": "Active"},
            {"name": "Intercom Pro", "vendor": "Intercom", "seat_count": 15, "cost": 1800, "status": "Expiring"},
            {"name": "Miro Business", "vendor": "Miro", "seat_count": 45, "cost": 540, "status": "Active"},
            {"name": "Notion Plus", "vendor": "Notion", "seat_count": 80, "cost": 960, "status": "Active"}
        ]

        today = datetime.now().date()
        mock_licenses = []

        for data in software_data:
            expiry_days = 15 if data["status"] == "Expiring" else random.randint(30,365)
            expiry_date = today + timedelta(days=expiry_days)
            purchase_date = today - timedelta(days=random.randint(30, 300))

            license = models.SoftwareLicense(
                id=uuid.uuid4(),
                name=data["name"],
                vendor=data["vendor"],
                seat_count=float(data["seat_count"]),
                purchase_date=purchase_date,
                expiry_date=expiry_date,
                cost=float(data["cost"]),
                status=data["status"],
                license_key=f"KEY-{uuid.uuid4().hex[:8].upper()}"
            )
            mock_licenses.append(license)

        db.bulk_save_objects(mock_licenses)
        db.commit()
        print(f"[OK] Successfully inserted {len(mock_licenses)} software licenses")

    except Exception as e:
        print(f"[ERROR] Seeding failed: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_software()
