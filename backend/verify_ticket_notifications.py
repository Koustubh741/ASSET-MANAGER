import asyncio
import uuid
from unittest.mock import AsyncMock, MagicMock
from uuid import UUID
import sys
from types import ModuleType

# 1. Create PRECISE mock modules to satisfy all imports in notification_service.py
def create_mock_module(name, members):
    m = ModuleType(name)
    for k, v in members.items():
        setattr(m, k, v)
    sys.modules[name] = m
    return m

# Mock Models
class MockUser:
    id = MagicMock() # SQLAlchemy filter checks class attribute
    def __init__(self, **kwargs):
        for k, v in kwargs.items(): setattr(self, k, v)
        self.email = kwargs.get("email", "user@example.com")
        self.full_name = kwargs.get("full_name", "John Doe")
        self.id = kwargs.get("id", uuid.uuid4())

class MockTicket:
    id = MagicMock() # SQLAlchemy filter checks class attribute
    def __init__(self, **kwargs):
        for k, v in kwargs.items(): setattr(self, k, v)
        self.subject = kwargs.get("subject", "Test Issue")
        self.id = kwargs.get("id", uuid.uuid4())

class MockAssetRequest:
    def __init__(self, **kwargs):
        for k, v in kwargs.items(): setattr(self, k, v)

create_mock_module("app.models", {"User": MockUser, "Ticket": MockTicket, "AssetRequest": MockAssetRequest})
create_mock_module("app.models.models", {"User": MockUser, "Ticket": MockTicket, "AssetRequest": MockAssetRequest})

# Mock SQLAlchemy
mock_sql = create_mock_module("sqlalchemy", {
    "select": MagicMock(return_value=MagicMock()),
    "desc": MagicMock(),
    "DateTime": MagicMock(),
    "Column": MagicMock(),
    "String": MagicMock(),
    "func": MagicMock()
})
create_mock_module("sqlalchemy.future", {"select": mock_sql.select})
create_mock_module("sqlalchemy.orm", {"declarative_base": MagicMock(), "relationship": MagicMock()})
create_mock_module("sqlalchemy.ext.asyncio", {"AsyncSession": MagicMock()})
create_mock_module("sqlalchemy.dialects.postgresql", {"UUID": MagicMock(), "JSONB": MagicMock()})

# 2. Mock result object behavior
class MockResult:
    def __init__(self, data): self.data = data
    def scalars(self): return self
    def first(self): return self.data[0] if self.data else None
    def all(self): return self.data

async def test_ticket_notifications():
    print("--- Starting Ticket Notification Verification ---")
    db = AsyncMock()
    
    # Import the service AFTER mocks are set
    from app.services.notification_service import NotificationService
    service = NotificationService(db)
    
    # Mock helpers to avoid complex recursive mocks
    service._simulate_email = AsyncMock(side_effect=lambda to, subject, body: print(f"\n[EMAIL SENT] To: {to}\nSubject: {subject}\nBody: {body[:100]}..."))
    service._get_users_by_role = AsyncMock(return_value=["it@example.com"])
    service._get_user_email = AsyncMock(return_value="requester@example.com")
    
    # Prepare ticket and user data
    ticket_id = uuid.uuid4()
    ticket = MockTicket(subject="Screen flickering", description="My laptop screen flickers constantly.", priority="High", requestor_id=uuid.uuid4())
    requester = MockUser(full_name="Alice Smith")

    # Order of DB hits:
    # 1. Ticket lookup (in notify_ticket_created)
    # 2. User lookup (in notify_ticket_created)
    # 3. Ticket lookup (in notify_ticket_updated)
    # 4. Ticket lookup (in notify_ticket_resolved)
    db.execute.side_effect = [
        MockResult([ticket]), MockResult([requester]),
        MockResult([ticket]), MockResult([ticket])
    ]

    print("\n[SCENARIO 1] New Ticket Created")
    await service.notify_ticket_created(ticket_id)
    
    print("\n[SCENARIO 2] Ticket Acknowledged")
    await service.notify_ticket_updated(ticket_id, status="IN_PROGRESS", updated_by="IT Admin", comment="On my way to check.")
    
    print("\n[SCENARIO 3] Ticket Resolved")
    await service.notify_ticket_resolved(ticket_id, resolution_notes="Replaced HDMI cable.")

    print("\n--- Verification Complete ---")

if __name__ == "__main__":
    import os
    sys.path.append(os.getcwd())
    asyncio.run(test_ticket_notifications())
