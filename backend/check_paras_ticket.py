import asyncio
import sys
import os
sys.path.insert(0, os.getcwd())
from app.database.database import AsyncSessionLocal
from sqlalchemy import text

async def check_ticket():
    async with AsyncSessionLocal() as db:
        r = await db.execute(text("""
            SELECT t.id, t.status, t.subject, u.full_name 
            FROM helpdesk.tickets t 
            JOIN auth.users u ON t.requestor_id = u.id 
            WHERE u.full_name ILIKE '%Paras Saini%'
        """))
        rows = r.fetchall()
        if not rows:
            print("No tickets found for Paras Saini.")
        for row in rows:
            print(f"Ticket ID: {row[0]}")
            print(f"Status: {row[1]}")
            print(f"Subject: {row[2]}")
            print(f"User: {row[3]}")

if __name__ == "__main__":
    asyncio.run(check_ticket())
