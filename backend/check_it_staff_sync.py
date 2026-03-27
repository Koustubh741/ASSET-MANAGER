from sqlalchemy import text
from app.database.database import SessionLocal

def check_staff():
    db = SessionLocal()
    try:
        # Check users in the auth schema
        query = text("""
            SELECT full_name, role, status 
            FROM auth.users 
            WHERE role IN ('IT_SUPPORT', 'IT_MANAGEMENT', 'ADMIN', 'SUPPORT_SPECIALIST')
            AND status = 'ACTIVE'
        """)
        result = db.execute(query)
        users = result.fetchall()
        print(f"Total Active IT/Admin Staff: {len(users)}")
        for u in users:
            print(f"- {u.full_name} ({u.role})")
    finally:
        db.close()

if __name__ == "__main__":
    check_staff()
