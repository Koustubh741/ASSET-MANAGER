from app.database.database import SessionLocal
from app.models.models import Asset

db = SessionLocal()

# Count total assets
total = db.query(Asset).count()
print(f"\nTotal assets in database: {total}")

# Show latest 5 assets
assets = db.query(Asset).order_by(Asset.created_at.desc()).limit(5).all()

print("\nLatest 5 assets:")
print("-" * 80)
for asset in assets:
    print(f"Name: {asset.name}")
    print(f"  Serial: {asset.serial_number}")
    print(f"  Type: {asset.type} | Vendor: {asset.vendor} | Model: {asset.model}")
    print(f"  Location: {asset.location} | Status: {asset.status}")
    print(f"  Created: {asset.created_at}")
    print()

db.close()
