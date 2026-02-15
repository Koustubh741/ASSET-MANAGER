import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from app.database.database import SessionLocal
from app.models.models import AssetRequest
from sqlalchemy import desc

def check_proc_requests():
    db = SessionLocal()
    try:
        requests = db.query(AssetRequest).filter(
            AssetRequest.status == 'PROCUREMENT_REQUESTED'
        ).order_by(desc(AssetRequest.updated_at)).limit(5).all()
        
        print(f"Found {len(requests)} requests in PROCUREMENT_REQUESTED status:")
        for req in requests:
            print(f"ID: {req.id}")
            print(f"Asset Name: {req.asset_name}")
            print(f"Updated At: {req.updated_at}")
            print(f"Requester ID: {req.requester_id}")
            print("-" * 30)

    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    check_proc_requests()
