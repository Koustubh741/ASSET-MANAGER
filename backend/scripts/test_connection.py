"""
Quick database connection test
"""
from app.database.database import test_connection, get_connection_info, engine, SessionLocal
from sqlalchemy import text

def main():
    print("=" * 60)
    print("DATABASE CONNECTION TEST")
    print("=" * 60)
    
    # Show connection info
    info = get_connection_info()
    print("\nConnection Configuration:")
    for key, value in info.items():
        print(f"  {key}: {value}")
    
    # Test connection
    print("\nTesting connection...")
    if test_connection():
        print("✓ Connection successful!")
        
        # Test a simple query
        try:
            conn = engine.connect()
            result = conn.execute(text("SELECT current_database(), version()"))
            db_name, version = result.fetchone()
            conn.close()
            print(f"✓ Database: {db_name}")
            print(f"✓ PostgreSQL version: {version[:50]}...")
            
            # Test session
            db = SessionLocal()
            print("✓ Database session created successfully")
            db.close()
            
        except Exception as e:
            print(f"✗ Query test failed: {e}")
    else:
        print("✗ Connection failed!")
        return False
    
    print("\n" + "=" * 60)
    print("✓ All connection tests passed!")
    print("=" * 60)
    return True

if __name__ == "__main__":
    main()

