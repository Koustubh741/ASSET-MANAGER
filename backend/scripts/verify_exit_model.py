
import sys
import os

# Add backend directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database.database import SessionLocal
from app.models.models import ExitRequest, User
from sqlalchemy import text

def verify_exit_model():
    print("Verifying ExitRequest model mapping...")
    db = SessionLocal()
    try:
        # 1. Test raw SQL access
        print("Testing raw SQL access to exit.exit_requests...")
        result = db.execute(text("SELECT count(*) FROM exit.exit_requests"))
        count = result.scalar()
        print(f"Row count: {count}")
        
        # 2. Test SQLAlchemy access
        print("Testing SQLAlchemy model access...")
        requests = db.query(ExitRequest).all()
        print(f"Successfully queried {len(requests)} ExitRequest objects via ORM")
        
        # 3. Test creating a dummy request (rollback after)
        print("Testing creation of ExitRequest object...")
        new_req = ExitRequest(
            user_id="test_user",
            status="OPEN",
            assets_snapshot=[],
            byod_snapshot=[]
        )
        db.add(new_req)
        db.flush()
        print("Successfully flushed new object")
        db.rollback()
        print("Rollback successful")
        
        print("\n[SUCCESS] Model verification passed!")
        
    except Exception as e:
        print(f"\n[ERROR] Verification failed: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    verify_exit_model()
