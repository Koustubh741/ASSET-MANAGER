import sys
import os

# Add project root to sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database.database import SessionLocal
from app.models.models import AssetRequest
from sqlalchemy import desc

def patch_request():
    db = SessionLocal()
    try:
        # Get latest request (the one we are working on)
        latest_req = db.query(AssetRequest).order_by(desc(AssetRequest.created_at)).first()
        if latest_req:
            print(f"Patching Request ID: {latest_req.id}")
            print(f"Current Procurement Status: {latest_req.procurement_finance_status}")
            
            latest_req.procurement_finance_status = "DELIVERED"
            db.commit()
            print("Updated Procurement Status to DELIVERED")
        else:
            print("No request found to patch.")

    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    patch_request()
