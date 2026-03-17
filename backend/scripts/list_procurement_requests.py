import sys
import os

# Add project root to sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database.database import SessionLocal
from app.models.models import AssetRequest
from sqlalchemy import desc

def list_requests():
    db = SessionLocal()
    try:
        # Find requests that are finance approved (awaiting delivery)
        requests = db.query(AssetRequest).filter(
            AssetRequest.procurement_finance_status == 'APPROVED'
        ).all()
        
        print(f"Found {len(requests)} requests awaiting delivery confirmation:")
        for req in requests:
            print(f"ID: {req.id}")
            print(f"Asset Name: {req.asset_name}")
            print(f"Type: {req.asset_type}")
            print(f"Status: {req.status}")
            print(f"Procurement Status: {req.procurement_finance_status}")
            print(f"Created At: {req.created_at}")
            print("-" * 30)

    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    list_requests()
