
"""
Script to populate asset_inventory table from existing 'In Stock' assets
"""
import sys
import os
import uuid

# Add backend directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database.database import SessionLocal
from app.models.models import Asset, AssetInventory
from sqlalchemy import func

def populate_inventory():
    print("=== POPULATING ASSET INVENTORY TABLE ===")
    session = SessionLocal()
    try:
        # Get all assets that are 'In Stock'
        stock_assets = session.query(Asset).filter(Asset.status == "In Stock").all()
        print(f"Found {len(stock_assets)} 'In Stock' assets in 'assets' table.")
        
        count = 0
        
        for asset in stock_assets:
            # Check if already exists in inventory
            exists = session.query(AssetInventory).filter(AssetInventory.asset_id == asset.id).first()
            
            if not exists:
                new_item = AssetInventory(
                    id=str(uuid.uuid4()),
                    asset_id=asset.id,
                    location=asset.location,
                    status="Available", # Default status in inventory
                    stocked_at=func.now()
                )
                session.add(new_item)
                count += 1
                print(f"[Create] Added Asset '{asset.name}' to Inventory")
            else:
                print(f"[Skip] Asset '{asset.name}' already in Inventory table")
        
        session.commit()
        print(f"\nMigration Complete.")
        print(f"Created {count} new inventory records.")
        
    except Exception as e:
        print(f"Error: {e}")
        session.rollback()
    finally:
        session.close()

if __name__ == "__main__":
    populate_inventory()
