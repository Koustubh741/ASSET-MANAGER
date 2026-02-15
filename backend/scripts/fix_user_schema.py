import os
import sys

# Add backend to path to import database config
sys.path.append(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))

from app.database.database import engine
from sqlalchemy import text

def fix_user_schema():
    print("Starting schema fix for 'auth.users' table (Synchronous)...")
    try:
        with engine.begin() as conn:
            # Add sso_provider column
            print("Checking/Adding 'sso_provider' column...")
            conn.execute(text("ALTER TABLE auth.users ADD COLUMN IF NOT EXISTS sso_provider VARCHAR(50);"))
            
            # Add sso_id column
            print("Checking/Adding 'sso_id' column...")
            conn.execute(text("ALTER TABLE auth.users ADD COLUMN IF NOT EXISTS sso_id VARCHAR(255);"))
            
            # Add index for sso_id
            print("Creating index for 'sso_id'...")
            conn.execute(text("CREATE INDEX IF NOT EXISTS ix_users_sso_id ON auth.users (sso_id);"))
            
        print("Schema fix completed successfully.")
    except Exception as e:
        print(f"Error executing schema fix: {e}")

if __name__ == "__main__":
    fix_user_schema()
