from app.database.database import engine
from sqlalchemy import text
import models

def setup_database():
    """Create all necessary schemas and tables"""
    try:
        with engine.connect() as connection:
            print("\n=== CREATING DATABASE SCHEMAS ===\n")
            
            # Create all the necessary schemas
            schemas = ["auth", "asset", "helpdesk", "system", "exit", "support", "procurement", "audit"]
            for schema in schemas:
                try:
                    connection.execute(text(f"CREATE SCHEMA IF NOT EXISTS {schema}"))
                    connection.commit()
                    print(f"[OK] Schema '{schema}' created/verified")
                except Exception as e:
                    print(f"[WARNING] Schema '{schema}': {e}")
            
            print("\n=== CREATING TABLES ===\n")
            # Create all tables defined in models
            models.Base.metadata.create_all(bind=engine)
            print("[OK] All tables created successfully!")
            
            print("\n=== VERIFICATION ===\n")
            # Verify tables were created
            from sqlalchemy import inspect
            inspector = inspect(engine)
            
            for schema in schemas:
                try:
                    tables = inspector.get_table_names(schema=schema)
                    if tables:
                        print(f"Schema '{schema}':")
                        for table in tables:
                            print(f"  [OK] {table}")
                    else:
                        print(f"Schema '{schema}': (no tables yet)")
                except Exception as e:
                    print(f"Error checking schema {schema}: {e}")
            
            print("\n[OK] Database setup complete!")
            
    except Exception as e:
        print(f"\n[ERROR] Database setup failed: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    setup_database()
