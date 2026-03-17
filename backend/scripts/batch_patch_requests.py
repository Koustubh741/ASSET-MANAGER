import sys
import os

# Add project root to sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database.database import SessionLocal
from app.models.models import AssetRequest
from sqlalchemy import or_

def batch_patch():
    db = SessionLocal()
    try:
        # Find all requests that are QC_PENDING but not marked as DELIVERED in procurement status
        requests = db.query(AssetRequest).filter(
            AssetRequest.status == 'QC_PENDING',
            or_(
                AssetRequest.procurement_finance_status != 'DELIVERED',
                AssetRequest.procurement_finance_status.is_(None)
            )
        ).all()
        
        print(f"Found {len(requests)} inconsistent requests (QC_PENDING but not DELIVERED).")
        
        for req in requests:
            print(f"Patching Request ID: {req.id}")
            print(f"  - Old Procurement Status: {req.procurement_finance_status}")
            req.procurement_finance_status = 'DELIVERED'
            print(f"  - New Procurement Status: DELIVERED")
        
        if requests:
            db.commit()
            print(f"Successfully patched {len(requests)} requests.")
        else:
            print("No patch needed.")

    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    batch_patch()
