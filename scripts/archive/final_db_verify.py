import psycopg2
import os
from dotenv import load_dotenv

load_dotenv('backend/.env')

DB_URL = os.environ.get("DATABASE_URL")
if DB_URL and "postgresql+asyncpg://" in DB_URL:
    DB_URL = DB_URL.replace("postgresql+asyncpg://", "postgresql://")

def verify_integration():
    try:
        conn = psycopg2.connect(DB_URL)
        cur = conn.cursor()
        
        print("--- Integrated Assignment Groups ---")
        cur.execute("""
            SELECT g.name, g.department as legacy_label, d.name as linked_dept_name
            FROM support.assignment_groups g
            LEFT JOIN auth.departments d ON g.department_id = d.id
            ORDER BY g.name;
        """)
        groups = cur.fetchall()
        for name, legacy, linked in groups:
            print(f"Group: {name} | Legacy Label: {legacy} | Linked Dept: {linked}")
        
        cur.close()
        conn.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    verify_integration()
