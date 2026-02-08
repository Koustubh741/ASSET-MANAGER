import sys
import os

# Add backend to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database.database import SessionLocal
from app.models.models import Asset

def verify_asset():
    db = SessionLocal()
    try:
        asset = db.query(Asset).filter(Asset.name == "DESKTOP-78I99HT").first()
        
        if asset:
            print(f"Name: {asset.name}")
            print(f"Type: {asset.type}")
            print(f"Vendor: {asset.vendor}")
            print(f"Model: {asset.model}")
            print(f"Specs: {asset.specifications}")
        else:
            print("Asset not found")
    finally:
        db.close()

if __name__ == "__main__":
    verify_asset()
