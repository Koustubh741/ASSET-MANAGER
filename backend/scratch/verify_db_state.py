import asyncio
import sys
import os
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

# Add current directory to path
sys.path.append(os.getcwd())

from app.database.database import engine

async def check_db():
    try:
        # Note: If 'engine' is an AsyncEngine, it doesn't support 'async with engine.connect()' 
        # unless it's the newer SQLAlchemy 2.0 style and handled correctly.
        # We will use a raw connection approach for simplicity in this diagnostic.
        async with engine.begin() as conn:
            print("--- DATABASE CONNECTION ---")
            res = await conn.execute(text("SELECT current_database()"))
            print(f"Connected to: {res.scalar()}")
            
            # Check tables
            res = await conn.execute(text("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'"))
            tables = [r[0] for r in res.all()]
            print(f"\nPublic Tables: {len(tables)}")
            
            res = await conn.execute(text("SELECT table_name FROM information_schema.tables WHERE table_schema = 'auth'"))
            auth_tables = [r[0] for r in res.all()]
            print(f"Auth Tables: {len(auth_tables)}")
            
            if 'departments' in auth_tables:
                res = await conn.execute(text("SELECT name FROM auth.departments"))
                depts = res.all()
                print(f"Departments: {len(depts)}")
    except Exception as e:
        print(f"ERROR: {str(e)}")

if __name__ == "__main__":
    asyncio.run(check_db())
