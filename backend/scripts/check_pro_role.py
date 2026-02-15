import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from app.database.database import SessionLocal
from app.models.models import User

from app.models.models import AssetRequest
from sqlalchemy import desc

def check_user_role():
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == 'pro@test.com').first()
        if user:
            print(f"User: {user.email}")
            print(f"Role: {user.role}")
        
        # Check latest request
        latest_req = db.query(AssetRequest).order_by(desc(AssetRequest.created_at)).first()
        if latest_req:
            print(f"\nLatest Request ID: {latest_req.id}")
            print(f"Status: {latest_req.status}")
            print(f"Procurement Status: {latest_req.procurement_finance_status}")
            print(f"Requester ID: {latest_req.requester_id}")
        else:
            print("\nNo asset requests found.")

    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    check_user_role()
