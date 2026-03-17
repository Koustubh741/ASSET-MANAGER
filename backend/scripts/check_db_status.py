import os
import sys
from sqlalchemy import create_engine, text
from sqlalchemy.exc import OperationalError
from dotenv import load_dotenv

# Load environment variables
load_dotenv('backend/.env')

DATABASE_URL = os.getenv("DATABASE_URL")
print(f"Testing connection to: {DATABASE_URL}")

try:
    # Try connecting to the specific database
    engine = create_engine(DATABASE_URL, connect_args={"connect_timeout": 5})
    with engine.connect() as connection:
        result = connection.execute(text("SELECT 1"))
        print("Successfully connected to the ITSM database!")
        
        # Check for tables in all schemas
        result = connection.execute(text("SELECT table_schema, table_name FROM information_schema.tables WHERE table_schema NOT IN ('information_schema', 'pg_catalog') AND table_schema NOT LIKE 'pg_toast%' ORDER BY table_schema, table_name"))
        tables = result.fetchall()
        print(f"Found {len(tables)} tables in database.")
        
        current_schema = None
        for schema, table in tables:
            if schema != current_schema:
                print(f"\nSchema: {schema}")
                current_schema = schema
            print(f" - {table}")

except OperationalError as e:
    print(f"Connection failed: {e}")
    # Try connecting to default 'postgres' database to check if server is up
    if "does not exist" in str(e):
        print("Database 'ITSM' does not exist. Attempting to connect to 'postgres' db to confirm server is up.")
        try:
            # Modify URL to connect to postgres db
            if "/ITSM" in DATABASE_URL:
                default_url = DATABASE_URL.replace("/ITSM", "/postgres")
            else:
                default_url = DATABASE_URL # Fallback
            
            engine_default = create_engine(default_url)
            with engine_default.connect() as conn:
                print("Successfully connected to 'postgres' database. Server is running.")
                print("Action needed: Create 'ITSM' database and restore data.")
        except Exception as e2:
            print(f"Could not connect to 'postgres' database either: {e2}")
    else:
        print("Ensure PostgreSQL is running on port 5432 and credentials are correct.")
except Exception as e:
    print(f"An unexpected error occurred: {e}")
