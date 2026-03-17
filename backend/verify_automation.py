import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text, select
import os
import uuid
from dotenv import load_dotenv

# Import models to ensure base knows them
from app.models.models import User, Ticket
from app.models.automation import WorkflowRule, SLAPolicy, TicketSLA

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
if DATABASE_URL and DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://", 1)

engine = create_async_engine(DATABASE_URL)
async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

async def verify_automation():
    async with async_session() as session:
        print("--- Verification Stage 1: Seed Rules and Policies ---")
        
        # 1. Create a Routing Rule
        rule = WorkflowRule(
            name="Test Routing Rule",
            conditions={"category": "Technical Support", "priority": "High"},
            actions={"set_status": "URGENT_TICKET", "set_priority": "Critical"},
            priority_order=1
        )
        session.add(rule)
        
        # 2. Create an SLA Policy
        policy = SLAPolicy(
            name="High Priority SLA",
            priority="Critical",
            response_time_limit=15,
            resolution_time_limit=120
        )
        session.add(policy)
        await session.commit()
        print(f"Created Rule and SLA Policy.")

        print("\n--- Verification Stage 2: Trigger Automation ---")
        from app.services.automation_service import automation_service
        
        # 3. Create a Test Ticket
        # Find an admin/user to be the requestor
        user_res = await session.execute(select(User).limit(1))
        user = user_res.scalars().first()
        
        test_ticket = Ticket(
            subject="Automation Test Incident",
            description="Testing automatic routing and SLA.",
            category="Technical Support",
            priority="High",
            requestor_id=user.id
        )
        session.add(test_ticket)
        await session.flush()
        ticket_id = test_ticket.id
        print(f"Created Ticket {ticket_id}")

        # 4. Apply Routing
        await automation_service.apply_routing_rules(session, ticket_id)
        await session.refresh(test_ticket)
        print(f"Post-Routing - Status: {test_ticket.status}, Priority: {test_ticket.priority}")

        # 5. Initialize SLA
        await automation_service.initialize_ticket_sla(session, ticket_id)
        
        # 6. Verify SLA Record
        sla_res = await session.execute(select(TicketSLA).where(TicketSLA.ticket_id == ticket_id))
        sla = sla_res.scalars().first()
        if sla:
            print(f"SLA Record Created! Deadline: {sla.resolution_deadline}")
        else:
            print("FAILED: SLA Record not created.")

        print("\n--- Cleanup Verification Data ---")
        await session.execute(text(f"DELETE FROM support.ticket_slas WHERE ticket_id = '{ticket_id}'"))
        await session.execute(text(f"DELETE FROM support.tickets WHERE id = '{ticket_id}'"))
        await session.execute(text(f"DELETE FROM support.workflow_rules WHERE name = 'Test Routing Rule'"))
        await session.execute(text(f"DELETE FROM support.sla_policies WHERE name = 'High Priority SLA'"))
        await session.commit()
        print("Verification entries cleaned up.")

if __name__ == "__main__":
    asyncio.run(verify_automation())
