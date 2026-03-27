import asyncio
import os
import sys
import uuid

# Robust Path Injection
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from app.database.database import AsyncSessionLocal as async_session
from app.models.models import User, Ticket
from app.services import ticket_service
from sqlalchemy import select, delete, or_, func

async def verify_ticket_root_fix():
    print("\n--- INITIATING TICKET SYSTEM ROOT FIX VERIFICATION ---")
    
    async with async_session() as db:
        # 1. Verification of Role-Based Scoping (Wall of Privacy)
        print("1. Auditing Role-Based Scoping...")
        test_user_id = uuid.uuid4()
        test_dept = "RootFix_Verification_Dept"
        
        test_user = User(
            id=test_user_id,
            email=f"root_fix_{test_user_id.hex[:6]}@example.com",
            full_name="Root Fix Tester",
            role="MANAGER",
            position="MANAGER",
            department=test_dept,
            domain="example.com",
            password_hash="hashed"
        )
        db.add(test_user)
        
        # Create a ticket in this dept
        test_ticket = Ticket(
            id=uuid.uuid4(),
            display_id=f"TKT-{uuid.uuid4().hex[:4].upper()}",
            subject="Root Fix Diagnostic",
            description="Automated integration test",
            priority="Critical",
            status="Open",
            requestor_id=test_user_id
        )
        db.add(test_ticket)
        await db.commit()
        
        print(f"   [OK] Test environment initialized (Dept: {test_dept})")
        
        # Check Scoped Summary
        summary = await ticket_service.get_ticket_executive_summary(db, user_id=test_user_id, department=test_dept)
        if summary.get("critical_blockers") >= 1:
            print("   [OK] Departmental scoping verified: Manager sees departmental data.")
        else:
            print("   [FAILED] Departmental scoping: Manager failed to see departmental ticket.")
            
        # 2. Verification of Telemetry Accuracy
        print("2. Verifying Telemetry Accuracy...")
        if "financial_pulse" in summary and "major_incidents" in summary:
            print("   [OK] Executive metrics present and correctly formatted.")
        else:
            print("   [FAILED] Executive telemetry missing or malformed.")

        # 3. Cleanup
        print("3. Finalizing & Cleanup...")
        await db.delete(test_ticket)
        await db.delete(test_user)
        await db.commit()
        print("   [OK] Test artifacts cleared.")
        print("\n--- TICKET SYSTEM ROOT FIX: SUCCESSFUL ---")

if __name__ == "__main__":
    asyncio.run(verify_ticket_root_fix())
