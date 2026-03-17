import sys
import os
from sqlalchemy import text

# Add project root to sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), 'backend')))

from backend.app.database.database import engine

def migrate():
    print("Migrating database: adding 'persona' column to 'auth.users'...")
    try:
        with engine.connect() as conn:
            # Check if column exists first
            check_sql = text("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_schema = 'auth' AND table_name = 'users' AND column_name = 'persona';
            """)
            result = conn.execute(check_sql).fetchone()
            
            if not result:
                alter_sql = text("ALTER TABLE auth.users ADD COLUMN persona VARCHAR(100);")
                conn.execute(alter_sql)
                conn.commit()
                print("Column 'persona' added successfully.")
            else:
                print("Column 'persona' already exists.")
    except Exception as e:
        print(f"Migration failed: {e}")

if __name__ == "__main__":
    migrate()
