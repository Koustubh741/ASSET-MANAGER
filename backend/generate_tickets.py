import asyncio
from backend.app.database.database import AsyncSessionLocal
from backend.app.models.models import Ticket, User, TicketComment, Asset
import uuid
from datetime import datetime, timezone

async def generate_mock_data():
    async with AsyncSessionLocal() as session:
        # Find some users
        from sqlalchemy import select
        res = await session.execute(select(User))
        users = res.scalars().all()
        support_user = next((u for u in users if u.role == "SUPPORT"), None)
        end_user = next((u for u in users if u.role == "END_USER"), None)
        
        if not support_user or not end_user:
            print("Could not find required users")
            return
            
        print(f"Adding tickets for support user: {support_user.email} and end user: {end_user.email}")
        
        # Unassigned ticket for Shared Queue
        t1 = Ticket(
            id=uuid.uuid4(),
            display_id="INC-1001",
            subject="Cannot access intranet portal",
            description="The ERP and intranet portal are returning 404 for the whole IT department.",
            priority="High",
            category="Network",
            status="OPEN",
            requestor_id=end_user.id,
            created_at=datetime.now(timezone.utc)
        )
        
        # Assigned ticket to Support Queue
        t2 = Ticket(
            id=uuid.uuid4(),
            display_id="INC-1002",
            subject="Laptop screen flickering",
            description="My display keeps restarting under heavy load.",
            priority="Medium",
            category="Hardware",
            status="OPEN",
            requestor_id=end_user.id,
            assigned_to_id=support_user.id,
            created_at=datetime.now(timezone.utc)
        )
        
        # Resolved ticket for Support Queue
        t3 = Ticket(
            id=uuid.uuid4(),
            display_id="INC-1003",
            subject="Need access to GitHub repo",
            description="Please grant me write access to the frontend repo.",
            priority="Low",
            category="Access",
            status="RESOLVED",
            resolution_notes="Access granted via Okta.",
            requestor_id=end_user.id,
            assigned_to_id=support_user.id,
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc)
        )
        
        session.add_all([t1, t2, t3])
        await session.commit()
        print("Mock tickets added successfully.")

asyncio.run(generate_mock_data())
