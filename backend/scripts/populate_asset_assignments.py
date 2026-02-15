
"""
Script to populate asset_assignments table from existing assets
"""
import sys
import os

# Add backend directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database.database import SessionLocal, engine
from app.models.models import Asset, AssetAssignment, User
from sqlalchemy import func

def populate_assignments():
    print("=== POPULATING ASSET ASSIGNMENTS TABLE ===")
    session = SessionLocal()
    try:
        # Get all assets that are currently assigned
        assigned_assets = session.query(Asset).filter(Asset.assigned_to.isnot(None)).all()
        print(f"Found {len(assigned_assets)} assigned assets in 'assets' table.")
        
        count = 0
        skipped = 0
        
        for asset in assigned_assets:
            # Try to resolve User
            # asset.assigned_to could be a Name or an ID
            user = None
            
            # 1. Try by ID (only if it looks like a UUID or handle error)
            try:
                # Basic check if it looks roughly like a UUID (len 36 or 32)
                if len(str(asset.assigned_to)) in [32, 36]:
                    user = session.query(User).filter(User.id == asset.assigned_to).first()
            except Exception:
                pass 
                
            # 2. Try by Full Name (case insensitive)
            if not user:
                user = session.query(User).filter(func.lower(User.full_name) == func.lower(asset.assigned_to)).first()
            
            # 3. Try by Email
            if not user:
                user = session.query(User).filter(func.lower(User.email) == func.lower(asset.assigned_to)).first()

            if user:
                # Check if assignment already exists
                exists = session.query(AssetAssignment).filter(
                    AssetAssignment.asset_id == asset.id,
                    AssetAssignment.user_id == user.id
                ).first()
                
                if not exists:
                    new_assignment = AssetAssignment(
                        asset_id=asset.id,
                        user_id=user.id,
                        assigned_by=asset.assigned_by,
                        location=asset.location,
                        assigned_at=asset.assignment_date or func.now()
                    )
                    session.add(new_assignment)
                    count += 1
                    print(f"[Create] Linked Asset '{asset.name}' to User '{user.full_name}'")
                else:
                    print(f"[Skip] Assignment already exists for Asset '{asset.name}'")
            else:
                print(f"[Warning] Could not find User record for assigned_to='{asset.assigned_to}' (Asset: {asset.name})")
                skipped += 1
        
        session.commit()
        print(f"\nMigration Complete.")
        print(f"Created {count} new assignment records.")
        print(f"Skipped {skipped} assets (user not found).")
        
    except Exception as e:
        print(f"Error: {e}")
        session.rollback()
    finally:
        session.close()

if __name__ == "__main__":
    populate_assignments()
