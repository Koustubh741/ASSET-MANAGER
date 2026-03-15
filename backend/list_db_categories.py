import sys
import os

# Add the app directory to sys.path to import models
sys.path.append(os.path.join(os.getcwd(), 'app'))

try:
    from app.database.database import SessionLocal, engine
    from app.models.models import CategoryConfig
    from sqlalchemy import text
except ImportError as e:
    print(f"Import Error: {e}")
    # Fallback to direct path search if needed
    sys.path.append(os.getcwd())
    from app.database.database import SessionLocal, engine
    from app.models.models import CategoryConfig
    from sqlalchemy import text

def list_categories():
    session = SessionLocal()
    try:
        # Check if table exists
        with engine.connect() as conn:
            result = conn.execute(text("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'support' AND table_name = 'category_configs')"))
            if not result.scalar():
                print("Table 'support.category_configs' does not exist yet.")
                return

        categories = session.query(CategoryConfig).all()
        print(f"Found {len(categories)} categories:")
        for cat in categories:
            print(f" - {cat.name} (Icon: {cat.icon_name}, Color: {cat.color})")
    except Exception as e:
        print(f"Error: {e}")
    finally:
        session.close()

if __name__ == "__main__":
    list_categories()
