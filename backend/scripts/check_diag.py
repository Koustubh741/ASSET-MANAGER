import asyncio
from sqlalchemy import text
from app.database.database import AsyncSessionLocal

async def check_data():
    async with AsyncSessionLocal() as db:
        # Check SLA Policies
        print("--- SLA Policies ---")
        res = await db.execute(text("SELECT id, name, priority, category, response_time_limit, resolution_time_limit, is_active FROM support.sla_policies"))
        for row in res.all():
            print(row)

        # Check Ticket SLAs
        print("\n--- Ticket SLAs ---")
        res = await db.execute(text("SELECT id, ticket_id, sla_policy_id, resolution_deadline, response_status FROM support.ticket_slas LIMIT 5"))
        for row in res.all():
            print(row)
            
        # Check Recently created tickets and their SLAs
        print("\n--- Recent Tickets and SLAs ---")
        res = await db.execute(text("SELECT id, subject, priority, created_at FROM support.tickets ORDER BY created_at DESC LIMIT 5"))
        recent_tickets = res.all()
        for row in recent_tickets:
            print(f"Ticket: {row}")
            sla_res = await db.execute(text(f"SELECT * FROM support.ticket_slas WHERE ticket_id = '{row.id}'"))
            sla = sla_res.fetchone()
            print(f"  SLA: {sla}")

if __name__ == "__main__":
    asyncio.run(check_data())
