import asyncio
import os
import sys
import httpx
from datetime import datetime, timezone

# Add project root to sys.path
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from app.database.database import AsyncSessionLocal as async_session
from app.models.models import User
from sqlalchemy import select

async def verify_executive_integration():
    print("\n" + "="*60)
    print("STRATEGIC INTELLIGENCE HUD - INTEGRATION ROOT FIX VERIFIER")
    print("="*60)
    
    # 1. Database Integrity Check
    print("\n[SECTION 1: DATABASE INTEGRITY]")
    async with async_session() as db:
        cxo_emails = ["ceo@itsm.com", "cfo@itsm.com", "ciso@itsm.com"]
        for email in cxo_emails:
            res = await db.execute(select(User).filter(User.email == email))
            user = res.scalars().first()
            if user:
                print(f"  [OK] Found {user.persona}: {user.full_name}")
                if user.department and user.domain:
                    print(f"       Metadata: Dept={user.department}, Domain={user.domain}, Role={user.role}")
                else:
                    print(f"       [CRITICAL] Missing metadata for {user.persona}! (Dept/Domain empty)")
            else:
                print(f"  [ALARM] User {email} NOT FOUND in database.")

    # 2. API Connectivity Check (Requires backend running on localhost:8000)
    print("\n[SECTION 2: API CONNECTIVITY]")
    API_BASE = "http://localhost:8000/api"
    
    async with httpx.AsyncClient() as client:
        # We simulate a CEO login or just check the endpoint if we have an bypass or just use the service directly.
        # For this verification, we'll check the service logic directly to avoid auth overhead in a script.
        from app.services import ticket_service
        async with async_session() as db:
            try:
                print("  Testing ticket_service.get_ticket_executive_summary...")
                # Test for a CEO (Admin role, no specific department scoping)
                summary = await ticket_service.get_ticket_executive_summary(db, user_id=None, department=None)
                print(f"  [OK] Executive Summary retrieved successfully.")
                print(f"       Global Compliance: {summary.get('compliance_rate')}%")
                print(f"       Major Incidents: {len(summary.get('major_incidents', []))}")
                print(f"       Risk Dimensions: {[d['subject'] for d in summary.get('risk_dimensions', [])]}")
            except Exception as e:
                print(f"  [FAILED] Service layer failure: {str(e)}")

    print("\n" + "="*60)
    print("VERIFICATION COMPLETE - PROCEED TO FRONTEND SYNC")
    print("="*60 + "\n")

if __name__ == "__main__":
    asyncio.run(verify_executive_integration())
