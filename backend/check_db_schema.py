import asyncio
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.future import select
import os

DATABASE_URL = "postgresql://postgres:Koustubh%40123@127.0.0.1:5432/ITSM"

async def check_schema():
    engine = create_engine(DATABASE_URL)
    inspector = inspect(engine)
    
    print("\n--- SCHEMA AUDIT ---")
    
    # Check assets table
    print("\n[asset.assets]")
    columns = inspector.get_columns('assets', schema='asset')
    column_names = [c['name'] for c in columns]
    print(f"Columns: {column_names}")
    if 'is_pilot' in column_names:
        print("  -> is_pilot: EXISTS")
    else:
        print("  -> is_pilot: MISSING")
        
    # Check system_patches table
    print("\n[asset.system_patches]")
    columns = inspector.get_columns('system_patches', schema='asset')
    column_names = [c['name'] for c in columns]
    print(f"Columns: {column_names}")
    for col in ['cve_ids', 'cvss_score', 'kb_article_url', 'vendor_advisory']:
        if col in column_names:
            print(f"  -> {col}: EXISTS")
        else:
            print(f"  -> {col}: MISSING")

    # Check for snapshots table
    print("\n[Tables in asset schema]")
    tables = inspector.get_table_names(schema='asset')
    print(f"Tables: {tables}")

    engine.dispose()

if __name__ == "__main__":
    asyncio.run(check_schema())
