import os
import sys
from sqlalchemy import text
sys.path.append(os.path.join(os.getcwd(), 'backend'))
from app.database.database import SessionLocal

def verify():
    session = SessionLocal()
    try:
        # Check users with dept_id
        res = session.execute(text("SELECT count(id) FROM auth.users WHERE department_id IS NOT NULL"))
        users_with_id = res.scalar()
        print(f"Users with Department ID: {users_with_id}")
        
        # Check departments created
        res = session.execute(text("SELECT count(id) FROM auth.departments"))
        total_depts = res.scalar()
        print(f"Total Departments: {total_depts}")
        
        # Check top departments
        res = session.execute(text("""
            SELECT d.slug, count(u.id) 
            FROM auth.departments d 
            LEFT JOIN auth.users u ON d.id = u.department_id 
            GROUP BY d.slug 
            ORDER BY count(u.id) DESC
        """))
        for slug, count in res:
            print(f"- {slug}: {count} users")
            
    finally:
        session.close()

if __name__ == "__main__":
    verify()
