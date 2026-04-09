
import asyncio
import uuid
from sqlalchemy.future import select
from app.database.database import AsyncSessionLocal
from app.models.models import Department, User, Ticket

async def seed_hr():
    print("--- STARTING HR DEPARTMENT SEEDING ---")
    async with AsyncSessionLocal() as db:
        # 1. Ensure "Human Resources" exists
        hr_dept_res = await db.execute(select(Department).where(Department.name == "Human Resources"))
        hr_dept = hr_dept_res.scalar_one_or_none()
        
        if not hr_dept:
            print("Adding 'Human Resources' department...")
            hr_dept = Department(
                id=uuid.uuid4(),
                name="Human Resources",
                slug="human-resources",
                dept_metadata={"icon": "UsersIcon", "theme": "rose"}
            )
            db.add(hr_dept)
            await db.flush()
        else:
            print(f"Found existing HR department: {hr_dept.id}")

        # 2. Update users with HR legacy strings
        user_stmt = select(User).where(
            (User.department.ilike("%HR%")) | (User.department.ilike("%Human%"))
        )
        users_res = await db.execute(user_stmt)
        users = users_res.scalars().all()
        print(f"Linking {len(users)} users to HR department...")
        for u in users:
            u.department_id = hr_dept.id
            u.department = "Human Resources" # Normalize legacy string

        # 3. Update tickets related to HR
        # We join with User to find tickets by requestor's department string
        ticket_stmt = select(Ticket).join(User, Ticket.requestor_id == User.id).where(
            (Ticket.subject.ilike("%HR%")) | 
            (Ticket.subject.ilike("%Human Resources%")) |
            (Ticket.subject.ilike("%PAY SLIP%")) |
            (Ticket.subcategory.ilike("%Payroll%")) |
            (User.department.ilike("%Human Resources%")) |
            (User.department.ilike("%HR%"))
        )
        tickets_res = await db.execute(ticket_stmt)
        tickets = tickets_res.scalars().all()
        print(f"Linking {len(tickets)} tickets to HR department...")
        for t in tickets:
            t.target_department_id = hr_dept.id
            # Note: target_department_name is typically a property or schema-only field
            
        await db.commit()
        print("--- HR DEPARTMENT SEEDING COMPLETE ---")

if __name__ == "__main__":
    asyncio.run(seed_hr())
