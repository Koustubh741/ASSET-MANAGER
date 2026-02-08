import sys
import os

# Add backend to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database.database import SessionLocal
from app.models.models import Asset, User

def verify_assignment():
    db = SessionLocal()
    try:
        asset = db.query(Asset).filter(Asset.name == "DESKTOP-78I99HT").first()
        
        if asset:
            print(f"Asset: {asset.name}")
            print(f"Assigned To ID: {asset.assigned_to_id}")
            if asset.assigned_to_id:
                user = db.query(User).filter(User.id == asset.assigned_to_id).first()
                if user:
                    print(f"Assigned To User: {user.email} ({user.full_name})")
                else:
                    print("Assigned User not found in database")
            else:
                print("Asset is not assigned to any user")
        else:
            print("Asset not found")
    finally:
        db.close()

if __name__ == "__main__":
    verify_assignment()
