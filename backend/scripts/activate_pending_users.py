import os
import sys
from sqlalchemy import text

sys.path.append(os.path.join(os.getcwd(), 'backend'))
from app.database.database import SessionLocal

def run():
    session = SessionLocal()
    try:
        # Check how many are pending
        res = session.execute(text("SELECT count(id) FROM auth.users WHERE status = 'PENDING'"))
        pending_count = res.scalar()
        print(f"Found {pending_count} PENDING users.")
        
        if pending_count > 0:
            # Update them to ACTIVE
            session.execute(text("UPDATE auth.users SET status = 'ACTIVE' WHERE status = 'PENDING'"))
            session.commit()
            print(f"Successfully activated {pending_count} users.")
        else:
            print("No pending users to activate.")
            
    except Exception as e:
        session.rollback()
        print(f"Error: {e}")
    finally:
        session.close()

if __name__ == "__main__":
    run()
