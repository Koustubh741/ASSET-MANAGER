
import sys
import os
from sqlalchemy import text, create_engine

# Try to get DATABASE_URL from environment
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    # Try to import from app config
    sys.path.append(os.getcwd())
    sys.path.append(os.path.join(os.getcwd(), 'backend'))
    try:
        from backend.app.database.database import engine
        print("Imported engine from app.")
    except Exception as e:
        print(f"Failed to import engine: {e}")
        # Last resort fallback if we know the user/pass from earlier logs
        DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/asset_manager"
        engine = create_engine(DATABASE_URL)

def quick_check():
    print("Testing connection...")
    try:
        with engine.connect() as conn:
            result = conn.execute(text("SELECT 1")).fetchone()
            print(f"Connection result: {result[0]}")
            
            # Check for one FK as a proxy
            fk_check = conn.execute(text("SELECT conname FROM pg_constraint WHERE conname = 'asset_assignments_asset_id_fkey'")).fetchone()
            if fk_check:
                print(f"FK Found: {fk_check[0]}")
            else:
                print("FK MISSING.")
    except Exception as e:
        print(f"Connection failed: {e}")

if __name__ == "__main__":
    quick_check()
