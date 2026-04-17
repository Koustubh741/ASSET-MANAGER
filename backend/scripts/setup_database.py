import sys
import os

# Add root directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database.database import engine, Base
from sqlalchemy import text
from app import models  # Importing the package triggers registration of all models

def setup_database():
    """Create all necessary schemas and tables"""
    try:
        with engine.connect() as connection:
            print("\n=== CREATING DATABASE SCHEMAS ===\n")
            
            # Create all the necessary schemas
            # helpdesk is replaced by support in modern models
            schemas = [
                "auth", "asset", "support", "system", 
                "exit", "procurement", "finance", "audit", "security"
            ]
            for schema in schemas:
                try:
                    connection.execute(text(f"CREATE SCHEMA IF NOT EXISTS {schema}"))
                    connection.commit()
                    print(f"[OK] Schema '{schema}' created/verified")
                except Exception as e:
                    print(f"[WARNING] Schema '{schema}': {e}")
            
            print("\n=== CREATING TABLES ===\n")
            # Create all tables defined in models
            Base.metadata.create_all(bind=engine)
            print("[OK] All tables created successfully!")
            
            # Create Materialized Views (Root Fix)
            print("\n=== CREATING MATERIALIZED VIEWS ===\n")
            try:
                # Dashboard Stats MV
                connection.execute(text("DROP MATERIALIZED VIEW IF EXISTS asset.dashboard_stats_mv CASCADE"))
                connection.execute(text("""
                    CREATE MATERIALIZED VIEW asset.dashboard_stats_mv AS
                    SELECT 
                        'status'::text as grouping_type, 
                        status as grouping_name, 
                        count(*)::int as count 
                    FROM asset.assets 
                    GROUP BY status
                    UNION ALL
                    SELECT 
                        'segment'::text as grouping_type, 
                        segment as grouping_name, 
                        count(*)::int as count 
                    FROM asset.assets 
                    GROUP BY segment;
                """))
                connection.execute(text("""
                    CREATE UNIQUE INDEX IF NOT EXISTS ix_dashboard_stats_mv_unique 
                    ON asset.dashboard_stats_mv (grouping_type, grouping_name);
                """))
                connection.commit()
                print("[OK] Dashboard stats materialized view created.")
            except Exception as e:
                print(f"[WARNING] MV Creation failed: {e}")
                connection.rollback()
            
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
