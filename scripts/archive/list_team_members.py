import asyncio
import os
import sys
from sqlalchemy.future import select
from sqlalchemy.orm import joinedload

# Add backend to sys.path
base_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.append(os.path.join(base_dir, 'backend'))

from app.database.database import AsyncSessionLocal
from app.models.models import User, AssignmentGroup, AssignmentGroupMember

async def list_members():
    async with AsyncSessionLocal() as db:
        # Find the Cloud Operations Team group
        res_group = await db.execute(select(AssignmentGroup).where(AssignmentGroup.name == 'Cloud Operations Team'))
        group = res_group.scalars().first()
        
        if not group:
            print("Group 'Cloud Operations Team' not found.")
            return
            
        # Find members
        res_members = await db.execute(
            select(User)
            .join(AssignmentGroupMember)
            .where(AssignmentGroupMember.group_id == group.id)
        )
        members = res_members.scalars().all()
        
        if not members:
            print("No members found in this group.")
            return
            
        print(f"--- Members of {group.name} ---")
        for m in members:
            # Note: Passwords are hashed, but we can check if it's one of the test users we created
            print(f"Name: {m.full_name}")
            print(f"Email: {m.email}")
            print(f"Role: {m.role}")
            print("-" * 20)
            
        print("\nNote: Test accounts use the standard password set during creation (likely 'Koustubh@123' based on previous context).")

if __name__ == "__main__":
    asyncio.run(list_members())
