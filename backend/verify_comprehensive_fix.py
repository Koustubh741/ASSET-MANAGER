import asyncio
import uuid
from app.database.database import AsyncSessionLocal
from app.models.models import User, Asset, AuditLog, Ticket
from app.services import user_service, asset_service, ticket_service
from app.schemas.user_schema import UserCreate
from sqlalchemy import select

async def verify_root_fix():
    print("\n=== VERIFYING COMPREHENSIVE ROOT FIX ===")
    
    async with AsyncSessionLocal() as db:
        # 1. Create a "Cloud" Manager
        manager_email = f"cloud_mgr_{uuid.uuid4().hex[:4]}@example.com"
        manager_create = UserCreate(
            email=manager_email,
            full_name="Cloud Manager",
            password="password123",
            role="END_USER",
            position="MANAGER",
            department="Cloud",
            domain="Cloud Infrastructure"
        )
        manager = await user_service.create_user(db, manager_create)
        manager.status = "ACTIVE" # Ensure active
        await db.commit()
        print(f"Created Manager: {manager_email} (Dept: Cloud)")
        
        # 2. Create a "Cloud" Team Member
        member_email = f"cloud_member_{uuid.uuid4().hex[:4]}@example.com"
        member_create = UserCreate(
            email=member_email,
            full_name="Cloud Engineer",
            password="password123",
            role="END_USER",
            position="TEAM_MEMBER",
            department="Cloud",
            domain="Managed Services" # Different domain, same department
        )
        member = await user_service.create_user(db, member_create)
        member.status = "ACTIVE"
        await db.commit()
        print(f"Created Member: {member_email} (Dept: Cloud, Domain: Managed Services)")
        
        # 3. Create an Asset for the Member
        asset = Asset(
            id=uuid.uuid4(),
            name="Cloud Server X",
            type="Server",
            model="ProLiant",
            vendor="HP",
            serial_number=f"SN-{uuid.uuid4().hex[:6]}",
            status="Active",
            segment="IT",
            assigned_to_id=member.id
        )
        db.add(asset)
        await db.commit()
        print("Created Asset assigned to Member")
        
        # 4. Verify Scoped Asset Listing for Manager
        print("\nVerifying Scoped Asset Listing...")
        scoped_assets = await asset_service.get_all_assets_scoped(db, department="Cloud")
        found_asset = any(a.name == "Cloud Server X" for a in scoped_assets)
        print(f"Manager sees asset: {'YES' if found_asset else 'NO'}")
        
        # 5. Verify Scoped User Listing for Manager
        print("\nVerifying Scoped User Listing...")
        scoped_users = await user_service.get_users(db, department="Cloud")
        found_member = any(u.email == member_email for u in scoped_users)
        print(f"Manager sees member: {'YES' if found_member else 'NO'}")
        
        # 6. Verify Audit Log Scoping (Service layer logic)
        print("\nVerifying Audit Log Scoping...")
        # Create a dummy audit log for the member
        audit_log = AuditLog(
            id=uuid.uuid4(),
            entity_type="Asset",
            entity_id=str(uuid.uuid4()), # Added entity_id
            action="TEST_ACTION",
            performed_by=member.id
        )
        from datetime import datetime
        audit_log.timestamp = datetime.utcnow()
        db.add(audit_log)
        await db.commit()
        
        # Simulate manager's view in audit.py (joining with User)
        query = select(AuditLog).join(User, AuditLog.performed_by == User.id).filter(
            (User.department == "Cloud") | (User.domain == "Cloud")
        )
        res_audit = await db.execute(query)
        logs = res_audit.scalars().all()
        found_log = any(l.performed_by == member.id for l in logs)
        print(f"Manager sees team member's audit log: {'YES' if found_log else 'NO'}")
        
        # 7. Verify Ticket Scoping
        print("\nVerifying Ticket Scoping...")
        ticket = Ticket(
            id=uuid.uuid4(),
            requestor_id=member.id,
            subject="Cloud Outage",
            description="Service is down",
            status="OPEN"
        )
        db.add(ticket)
        await db.commit()
        
        scoped_tickets = await ticket_service.get_tickets(db, department="Cloud")
        found_ticket = any(t.requestor_id == member.id for t in scoped_tickets)
        print(f"Manager sees team member's ticket: {'YES' if found_ticket else 'NO'}")
        
        # Cleanup (Optional)
        # await db.delete(asset)
        # await db.delete(member)
        # await db.delete(manager)
        # await db.commit()
        
    print("=== VERIFICATION COMPLETE ===\n")

if __name__ == "__main__":
    asyncio.run(verify_root_fix())
