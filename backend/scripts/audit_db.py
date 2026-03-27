import os
import sys
from sqlalchemy import text
# Add backend to path
sys.path.append(os.path.join(os.getcwd(), 'backend'))
from app.database.database import SessionLocal

def audit():
    session = SessionLocal()
    try:
        # Check Schemas
        res = session.execute(text("SELECT schema_name FROM information_schema.schemata"))
        schemas = [r[0] for r in res]
        print(f"Schemas: {schemas}")
        
        # Check Tables
        res = session.execute(text("SELECT schemaname, tablename FROM pg_catalog.pg_tables WHERE schemaname NOT IN ('pg_catalog', 'information_schema')"))
        tables = [f"{r[0]}.{r[1]}" for r in res]
        print(f"Tables: {tables}")
    finally:
        session.close()

if __name__ == "__main__":
    audit()
