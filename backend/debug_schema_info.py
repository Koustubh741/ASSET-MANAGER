import sqlite3
import os

db_path = 'd:/ASSET-MANAGER/backend/asset_management.db'

if not os.path.exists(db_path):
    print(f"Error: Database not found at {db_path}")
    exit(1)

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

try:
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
    tables = cursor.fetchall()
    print("Tables in database:")
    for table in tables:
        print(f" - {table[0]}")
        
    # Check for category_configs
    for table in tables:
        if 'category_configs' in table[0]:
            print(f"\nSchema for {table[0]}:")
            cursor.execute(f"PRAGMA table_info('{table[0]}')")
            for col in cursor.fetchall():
                print(f"  - {col}")
                
except Exception as e:
    print(f"Error: {e}")
finally:
    conn.close()
