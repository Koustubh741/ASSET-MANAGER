import sys
import os
from sqlalchemy import select
from datetime import datetime

# Add backend to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database.database import SessionLocal
from app.models.models import Asset

def patch_asset_data():
    db = SessionLocal()
    try:
        asset = db.query(Asset).filter(Asset.name == "DESKTOP-78I99HT").first()
        
        if asset:
            print(f"Patching asset: {asset.name}")
            
            # Use the logic from our updated discovery_service.py
            # Note: In a real run, these come from the payload. 
            # I'll extract them from the existing 'old' specs if they exist.
            old_specs = asset.specifications or {}
            
            new_specs = {
                "OS": f"{old_specs.get('os_name', 'Windows')} {old_specs.get('os_version', '11')}",
                "Processor": old_specs.get('cpu', 'Intel Core i7'),
                "RAM": f"{old_specs.get('ram_mb', 8046) / 1024:.1f} GB",
                "Storage": "256 GB SSD", # Sample
                "IP Address": old_specs.get('ip_address', '127.0.0.1'),
                "Last Scan": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                "Agent ID": old_specs.get('agent_id', 'manual-patch')
            }
            
            asset.type = "Laptop" # Corrected Type
            asset.specifications = new_specs
            asset.vendor = "Dell Inc." # Corrected Vendor
            
            db.commit()
            print("Successfully patched asset data.")
        else:
            print("Asset not found")
    finally:
        db.close()

if __name__ == "__main__":
    patch_asset_data()
