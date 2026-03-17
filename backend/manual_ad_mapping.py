import sys
import os
from sqlalchemy import select
from datetime import datetime

# Add backend to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database.database import SessionLocal
from app.models.models import Asset, User

def manual_ad_mapping():
    db = SessionLocal()
    try:
        # 1. Target asset
        asset = db.query(Asset).filter(Asset.name == "DESKTOP-78I99HT").first()
        if not asset:
            print("Asset DESKTOP-78I99HT not found")
            return

        # 2. Simulate discovery logic
        ad_user = "desktop-78i99ht\\koustubh"
        clean_user = ad_user.split('\\')[-1].lower()
        print(f"Simulating mapping for: {ad_user} -> clean_user={clean_user}")

        matched_user = db.query(User).filter(
            (User.email.ilike(f"{clean_user}%")) | 
            (User.full_name.ilike(f"%{clean_user}%"))
        ).first()

        if matched_user:
            print(f"Found Match: {matched_user.email} (ID: {matched_user.id})")
            
            # Apply mapping to asset
            asset.assigned_to_id = matched_user.id
            asset.assigned_to_name = matched_user.full_name # Denormalized for display
            
            # Update specs to include AD info
            specs = asset.specifications or {}
            specs["AD User"] = ad_user
            specs["AD Domain"] = "LOCAL"
            asset.specifications = specs
            
            db.commit()
            print("Successfully patched asset with AD mapping and user assignment.")
        else:
            print(f"FAILED: No user found matching '{clean_user}'")
            # List some users to see why
            all_users = db.query(User).limit(5).all()
            print("Recently checked users:")
            for u in all_users:
                print(f"- {u.email} ({u.full_name})")
    finally:
        db.close()

if __name__ == "__main__":
    manual_ad_mapping()
