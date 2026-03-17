import asyncio, sys
sys.path.insert(0, '.')
from dotenv import load_dotenv
load_dotenv()
from app.database.database import AsyncSessionLocal
from sqlalchemy import text

async def check():
    async with AsyncSessionLocal() as db:
        # Check all tables
        r = await db.execute(text("""
            SELECT table_schema, table_name
            FROM information_schema.tables
            WHERE table_schema IN ('finance','procurement','asset','auth','system','public','support','exit')
            AND table_type = 'BASE TABLE'
            ORDER BY table_schema, table_name
        """))
        rows = r.fetchall()
        print("All tables:")
        for row in rows:
            print(f"  {row[0]}.{row[1]}")

        # Check relevant columns on asset_requests
        r2 = await db.execute(text("""
            SELECT column_name, data_type
            FROM information_schema.columns
            WHERE table_schema='asset' AND table_name='asset_requests'
            ORDER BY ordinal_position
        """))
        rows2 = r2.fetchall()
        print("\nasset.asset_requests columns:")
        for row in rows2:
            print(f"  {row[0]} ({row[1]})")

        # Check purchase_orders columns
        r3 = await db.execute(text("""
            SELECT column_name, data_type
            FROM information_schema.columns
            WHERE table_schema='procurement' AND table_name='purchase_orders'
            ORDER BY ordinal_position
        """))
        rows3 = r3.fetchall()
        print("\nprocurement.purchase_orders columns:")
        for row in rows3:
            print(f"  {row[0]} ({row[1]})")

        # Check purchase_invoices columns
        r4 = await db.execute(text("""
            SELECT column_name, data_type
            FROM information_schema.columns
            WHERE table_schema='procurement' AND table_name='purchase_invoices'
            ORDER BY ordinal_position
        """))
        rows4 = r4.fetchall()
        print("\nprocurement.purchase_invoices columns:")
        for row in rows4:
            print(f"  {row[0]} ({row[1]})")

        # Check finance.finance_records
        r5 = await db.execute(text("""
            SELECT column_name, data_type
            FROM information_schema.columns
            WHERE table_schema='finance' AND table_name='finance_records'
            ORDER BY ordinal_position
        """))
        rows5 = r5.fetchall()
        print("\nfinance.finance_records columns:")
        if rows5:
            for row in rows5:
                print(f"  {row[0]} ({row[1]})")
        else:
            print("  *** TABLE DOES NOT EXIST ***")

asyncio.run(check())
