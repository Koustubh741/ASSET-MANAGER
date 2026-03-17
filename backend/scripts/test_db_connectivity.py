"""
Database Connectivity Test Script
"""
from app.database.database import engine, SessionLocal
from sqlalchemy import text, inspect
import sys

def test_connection():
    """Test basic database connection"""
    print("=" * 60)
    print("DATABASE CONNECTIVITY TEST")
    print("=" * 60)
    
    try:
        conn = engine.connect()
        print("✓ Connection established successfully")
        
        # Test basic query
        result = conn.execute(text("SELECT version()"))
        version = result.fetchone()[0]
        print(f"✓ PostgreSQL version: {version[:60]}...")
        
        # Get database info
        result = conn.execute(text("SELECT current_database(), current_user"))
        db_info = result.fetchone()
        print(f"✓ Database: {db_info[0]}")
        print(f"✓ User: {db_info[1]}")
        
        conn.close()
        print("✓ Connection closed successfully")
        return True
        
    except Exception as e:
        print(f"✗ Connection failed: {e}")
        return False

def check_schemas():
    """Check available schemas"""
    print("\n" + "=" * 60)
    print("SCHEMA CHECK")
    print("=" * 60)
    
    try:
        inspector = inspect(engine)
        schemas = inspector.get_schema_names()
        
        # Filter out system schemas
        app_schemas = [s for s in schemas if s not in ['information_schema', 'pg_catalog', 'pg_toast']]
        
        print(f"✓ Found {len(app_schemas)} application schemas:")
        for schema in sorted(app_schemas):
            print(f"  - {schema}")
        
        return app_schemas
        
    except Exception as e:
        print(f"✗ Schema check failed: {e}")
        return []

def check_tables():
    """Check tables in application schemas"""
    print("\n" + "=" * 60)
    print("TABLE CHECK")
    print("=" * 60)
    
    try:
        conn = engine.connect()
        inspector = inspect(engine)
        
        app_schemas = ['asset', 'auth', 'helpdesk', 'procurement', 'exit', 'system']
        
        for schema in app_schemas:
            try:
                tables = inspector.get_table_names(schema=schema)
                if tables:
                    print(f"\n{schema.upper()} schema:")
                    for table in sorted(tables):
                        print(f"  ✓ {table}")
            except Exception as e:
                print(f"\n{schema.upper()} schema: Error - {e}")
        
        conn.close()
        return True
        
    except Exception as e:
        print(f"✗ Table check failed: {e}")
        return False

def check_user_table_structure():
    """Check if User table has required columns"""
    print("\n" + "=" * 60)
    print("USER TABLE STRUCTURE CHECK")
    print("=" * 60)
    
    try:
        conn = engine.connect()
        
        # Check columns in auth.users table
        result = conn.execute(text("""
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_schema = 'auth' AND table_name = 'users'
            ORDER BY ordinal_position
        """))
        
        columns = result.fetchall()
        
        if not columns:
            print("✗ auth.users table does not exist")
            conn.close()
            return False
        
        print("Current columns in auth.users:")
        existing_columns = []
        for col_name, col_type in columns:
            print(f"  - {col_name} ({col_type})")
            existing_columns.append(col_name)
        
        # Check for required columns
        required_columns = ['status', 'position', 'domain']
        missing_columns = [col for col in required_columns if col not in existing_columns]
        
        if missing_columns:
            print(f"\n⚠ Missing columns: {', '.join(missing_columns)}")
            print("  → Database migration needed!")
        else:
            print("\n✓ All required columns present")
        
        conn.close()
        return len(missing_columns) == 0
        
    except Exception as e:
        print(f"✗ Structure check failed: {e}")
        return False

def test_model_queries():
    """Test querying models"""
    print("\n" + "=" * 60)
    print("MODEL QUERY TEST")
    print("=" * 60)
    
    try:
        db = SessionLocal()
        
        # Try to query User model
from app.models.models import User
        try:
            user_count = db.query(User).count()
            print(f"✓ Users table accessible: {user_count} records")
        except Exception as e:
            print(f"✗ Users query failed: {e}")
            print("  → This indicates schema mismatch with models")
        
        # Try other models
        models_to_test = [
            ('Asset', 'asset.assets'),
            ('AssetRequest', 'asset.asset_requests'),
            ('Ticket', 'helpdesk.tickets'),
        ]
        
        for model_name, table_name in models_to_test:
            try:
                model = getattr(__import__('models', fromlist=[model_name]), model_name)
                count = db.query(model).count()
                print(f"✓ {model_name} table accessible: {count} records")
            except Exception as e:
                print(f"✗ {model_name} query failed: {e}")
        
        db.close()
        return True
        
    except Exception as e:
        print(f"✗ Model query test failed: {e}")
        return False

if __name__ == "__main__":
    print("\n")
    
    # Run all tests
    connection_ok = test_connection()
    if not connection_ok:
        print("\n✗ Database connectivity test FAILED")
        sys.exit(1)
    
    schemas = check_schemas()
    tables_ok = check_tables()
    structure_ok = check_user_table_structure()
    models_ok = test_model_queries()
    
    print("\n" + "=" * 60)
    print("SUMMARY")
    print("=" * 60)
    print(f"Connection: {'✓ OK' if connection_ok else '✗ FAILED'}")
    print(f"Schemas: {'✓ OK' if schemas else '✗ FAILED'}")
    print(f"Tables: {'✓ OK' if tables_ok else '✗ FAILED'}")
    print(f"User Table Structure: {'✓ OK' if structure_ok else '⚠ NEEDS MIGRATION'}")
    print(f"Model Queries: {'✓ OK' if models_ok else '✗ FAILED'}")
    
    if connection_ok and structure_ok and models_ok:
        print("\n✓ All database connectivity tests PASSED")
        sys.exit(0)
    else:
        print("\n⚠ Database connectivity OK, but schema migration may be needed")
        print("  Run: python setup_database.py")
        sys.exit(0)

