import asyncio
import sys
import os
import uuid
from sqlalchemy import select, delete, or_

# Add parent directory to path for imports
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.database.database import get_db_context
from app.models.models import User, Ticket, Asset, AssetRequest

async def cleanup():
    async with get_db_context() as session:
        print("[INFO] Starting User Cleanup...")
        
        # 1. Identify users to keep (The "Real" IT Managers or admins)
        # Keep it_manager@itsm.com and any user not matches the test patterns
        keep_emails = ["admin@itsm.com", "it_manager@itsm.com", "ceo@enterprise.com", "cto@enterprise.com"]
        
        # Identify users to delete: emails with _HMMSS (test timestamp) or @auto.com
        test_pattern = "%@auto.com"
        timestamp_pattern = "%_%@%" # it_admin_123456@...
        
        query = select(User).filter(
            or_(
                User.email.like(test_pattern),
                User.email.like("%_@%"), # matches it_admin_...
                User.full_name.like("Test IT_MANAGEMENT%")
            )
        ).filter(~User.email.in_(keep_emails))
        
        result = await session.execute(query)
        users_to_delete = result.scalars().all()
        
        if not users_to_delete:
            print("[INFO] No duplicate/test users found to delete.")
            return

        print(f"[INFO] Found {len(users_to_delete)} users to delete.")
        
        # 2. Reassign tickets to it_manager@itsm.com before deleting users
        it_manager_res = await session.execute(select(User).filter(User.email == "it_manager@itsm.com"))
        it_manager = it_manager_res.scalars().first()
        
        if not it_manager:
            print("[ERROR] Could not find it_manager@itsm.com to reassign tickets. Aborting.")
            return

        delete_ids = [u.id for u in users_to_delete]
        
        # Update tickets
        ticket_query = select(Ticket).filter(Ticket.assigned_to_id.in_(delete_ids))
        t_res = await session.execute(ticket_query)
        tickets_to_move = t_res.scalars().all()
        
        if tickets_to_move:
            print(f"[INFO] Reassigning {len(tickets_to_move)} tickets to {it_manager.email}")
            for t in tickets_to_move:
                t.assigned_to_id = it_manager.id
                if t.requestor_id in delete_ids:
                    t.requestor_id = it_manager.id
            await session.commit()

        # 3. Handle Assets
        print("[INFO] Reassigning assets...")
        await session.execute(
            Asset.__table__.update()
            .where(Asset.assigned_to_id.in_(delete_ids))
            .values(assigned_to_id=it_manager.id, assigned_to_name=it_manager.full_name)
        )
        await session.commit()

        # 4. Handle AssetRequests
        print("[INFO] Reassigning asset requests...")
        await session.execute(
            AssetRequest.__table__.update()
            .where(AssetRequest.requester_id.in_(delete_ids))
            .values(requester_id=it_manager.id)
        )
        await session.commit()

        # 5. Delete users
        print("[INFO] Deleting user records...")
        await session.execute(delete(User).where(User.id.in_(delete_ids)))
        await session.commit()
        
        print(f"[SUCCESS] Deleted {len(users_to_delete)} duplicate/test users.")

if __name__ == "__main__":
    asyncio.run(cleanup())
