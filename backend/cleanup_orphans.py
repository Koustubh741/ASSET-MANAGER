import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
if DATABASE_URL and DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://", 1)

engine = create_async_engine(DATABASE_URL, echo=True)
async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

async def cleanup_orphans():
    async with async_session() as session:
        # 1. Cleanup asset_assignments
        print("Checking for orphaned asset_assignments...")
        query1 = text("""
            DELETE FROM asset.asset_assignments 
            WHERE user_id NOT IN (SELECT id FROM auth.users)
        """)
        res1 = await session.execute(query1)
        print(f"Deleted {res1.rowcount} orphaned asset_assignments.")
        
        # 2. Cleanup asset_requests and their dependencies
        print("Checking for orphaned asset_requests and linked records...")
        
        # Dependencies first: Finance Records
        query_f = text("""
            DELETE FROM finance.finance_records 
            WHERE asset_request_id IN (SELECT id FROM asset.asset_requests WHERE requester_id NOT IN (SELECT id FROM auth.users))
        """)
        res_f = await session.execute(query_f)
        print(f"Deleted {res_f.rowcount} finance records linked to orphaned requests.")

        # Dependencies: Purchase Orders
        query_po = text("""
            DELETE FROM procurement.purchase_orders 
            WHERE asset_request_id IN (SELECT id FROM asset.asset_requests WHERE requester_id NOT IN (SELECT id FROM auth.users))
        """)
        res_po = await session.execute(query_po)
        print(f"Deleted {res_po.rowcount} purchase orders linked to orphaned requests.")

        # Finally: Asset Requests
        query2 = text("""
            DELETE FROM asset.asset_requests 
            WHERE requester_id NOT IN (SELECT id FROM auth.users)
        """)
        res2 = await session.execute(query2)
        print(f"Deleted {res2.rowcount} orphaned asset_requests.")

        # 3. Cleanup tickets (requestor_id and assigned_to_id)
        print("Checking for orphaned tickets...")
        query3 = text("""
            DELETE FROM support.tickets 
            WHERE requestor_id NOT IN (SELECT id FROM auth.users)
        """)
        res3 = await session.execute(query3)
        print(f"Deleted {res3.rowcount} tickets with orphaned requestors.")

        query4 = text("""
            UPDATE support.tickets 
            SET assigned_to_id = NULL 
            WHERE assigned_to_id IS NOT NULL AND assigned_to_id NOT IN (SELECT id FROM auth.users)
        """)
        res4 = await session.execute(query4)
        print(f"Unassigned {res4.rowcount} tickets from non-existent users.")

        await session.commit()
        print("Cleanup complete.")

if __name__ == "__main__":
    asyncio.run(cleanup_orphans())
