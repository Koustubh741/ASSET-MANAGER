
"""
Script to fix data for the user 'exit' so they have assets to return.
"""
import sys
import os
import uuid
from datetime import datetime

# Add backend directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database.database import SessionLocal
from app.models.models import User, Asset, AssetAssignment, ExitRequest

def fix_data():
    session = SessionLocal()
    try:
        user_id = 'fc5d9abf-7482-4c05-bdd5-8cf6ae9a1612'
        user = session.query(User).filter(User.id == user_id).first()
        
        if not user:
            print("User not found!")
            return

        print(f"Fixing data for user: {user.full_name}")
        
        # 1. Reset User Status (so we can init exit again)
        user.status = "Active"
        
        # 2. Check for existing assignments
        existing_assign = session.query(AssetAssignment).filter(AssetAssignment.user_id == user_id).first()
        
        if not existing_assign:
            # 3. Create a dummy asset
            asset_id = str(uuid.uuid4())
            new_asset = Asset(
                id=asset_id,
                name="MacBook Pro M3 (Exit Test)",
                type="Laptop",
                model="MacBook Pro 16",
                vendor="Apple",
                serial_number=f"SN-{uuid.uuid4().hex[:8]}",
                segment="IT",
                status="Active",
                assigned_to=user.full_name,
                location="Office HQ"
            )
            session.add(new_asset)
            
            # 4. Create assignment record
            new_assign = AssetAssignment(
                asset_id=asset_id,
                user_id=user_id,
                assigned_by=user_id,
                location="Office HQ",
                assigned_at=datetime.now()
            )
            session.add(new_assign)
            print("Created new asset and assignment.")
        else:
            print("User already has assignments.")

        # 5. Clean up old empty exit requests for this user to avoid confusion
        old_exits = session.query(ExitRequest).filter(ExitRequest.user_id == user_id).all()
        for e in old_exits:
            session.delete(e)
        print(f"Deleted {len(old_exits)} old exit requests.")
            
        session.commit()
        print("Data fixed successfully. You can now initiate a new exit request.")
        
    except Exception as e:
        print(f"Error: {e}")
        session.rollback()
    finally:
        session.close()

if __name__ == "__main__":
    fix_data()
