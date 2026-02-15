import sys
import os
import uuid

sys.path.append(os.path.join(os.getcwd(), "app"))

from app.database.database import SessionLocal
from app.models.models import User, AssetRequest

db = SessionLocal()

try:
    # Get an existing user
    user = db.query(User).first()
    print(f"User ID type: {type(user.id)}")
    print(f"User ID: {user.id}")
    
    # Create minimal request
    req = AssetRequest(
        id=str(uuid.uuid4()),
        requester_id=str(user.id),  # Convert to string
        asset_name="Laptop Test",
        asset_type="Laptop",
        asset_ownership_type="COMPANY_OWNED",
        business_justification="Test",
        status="PROCUREMENT_REQUIRED"
    )
    
    db.add(req)
    db.commit()
    print(f"✅ Created: {req.id}")
    
    # Now update the procurement stage
    req.procurement_finance_status = "PROCUREMENT_REQUESTED"
    db.commit()
    print(f"✅ Updated stage to: PROCUREMENT_REQUESTED")
    
except Exception as e:
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()
    db.rollback()
finally:
    db.close()
