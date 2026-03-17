import sys
import os
from datetime import datetime, timedelta
import random

# Add backend to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database.database import SessionLocal
from app.models.models import Asset

def seed_renewals():
    db = SessionLocal()
    try:
        # Get some existing assets or create new ones
        assets = db.query(Asset).all()
        
        if not assets:
            print("No assets found. Please run seed_stock.py first.")
            return

        print(f"Updating {len(assets)} assets with renewal dates...")
        
        today = datetime.now().date()
        
        for asset in assets:
            # Set a random warranty expiry date within the next 3 months
            days_to_expiry = random.randint(-15, 90)
            asset.warranty_expiry = today + timedelta(days=days_to_expiry)
            
            # Set contract and license expiry
            asset.contract_expiry = today + timedelta(days=random.randint(10, 180))
            asset.license_expiry = today + timedelta(days=random.randint(30, 365))
            
            # Occasionally set a renewal status
            if random.random() > 0.7:
                asset.renewal_status = "Pending"
                asset.renewal_urgency = "Medium" if days_to_expiry > 30 else "High"
            else:
                asset.renewal_status = None
            
        db.commit()
        print("Successfully seeded renewal dates for assets.")
        
    except Exception as e:
        print(f"Error seeding renewals: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_renewals()
