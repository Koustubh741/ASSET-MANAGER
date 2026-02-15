import os
import sys
from dotenv import load_dotenv

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from app.database.database import engine
from sqlalchemy import text

def verify_columns():
    load_dotenv('backend/.env')
    print("Verifying 'auth.users' columns...")
    try:
        with engine.connect() as conn:
            query = text("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_schema = 'auth' AND table_name = 'users'
            """)
            result = conn.execute(query)
            columns = [row[0] for row in result.fetchall()]
            print(f"Columns found: {columns}")
            
            # Check for specific success
            required = ['sso_provider', 'sso_id']
            missing = [c for c in required if c not in columns]
            if not missing:
                print("SUCCESS: All required SSO columns are present.")
            else:
                print(f"FAILURE: Missing columns: {missing}")
                
    except Exception as e:
        print(f"Error during verification: {e}")

if __name__ == "__main__":
    verify_columns()
