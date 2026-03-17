from app.database.database import engine
from sqlalchemy import text, inspect

def verify_all_schemas():
    try:
        inspector = inspect(engine)
        
        print("\n=== COMPLETE DATABASE VERIFICATION ===\n")
        
        # Check each schema
        schemas = ["auth", "asset", "audit", "procurement", "helpdesk", "public"]
        
        for schema in schemas:
            print(f"\n📁 Schema: {schema}")
            try:
                tables = inspector.get_table_names(schema=schema if schema != "public" else None)
                if tables:
                    for table in tables:
                        # Count rows in each table
                        with engine.connect() as  conn:
                            if schema == "public":
                                result = conn.execute(text(f"SELECT COUNT(*) FROM {table}"))
                            else:
                                result = conn.execute(text(f"SELECT COUNT(*) FROM {schema}.{table}"))
                            count = result.scalar()
                            print(f"  ✅ {table} ({count} rows)")
                else:
                    print(f"  (no tables)")
            except Exception as e:
                print(f"  ❌ Error: {e}")
        
        # Specifically check asset.assets table
        print("\n=== CRITICAL: Checking asset.assets ===")
        with engine.connect() as conn:
            try:
                result = conn.execute(text("SELECT COUNT(*) FROM asset.assets"))
                count = result.scalar()
                print(f"✅ asset.assets table EXISTS with {count} rows")
            except Exception as e:
                print(f"❌ asset.assets table check failed: {e}")
                
    except Exception as e:
        print(f"\n❌ ERROR: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    verify_all_schemas()
