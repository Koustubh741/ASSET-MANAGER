import asyncio, sys, random
from datetime import datetime, timezone
sys.path.insert(0, '.')

async def seed():
    from app.database.database import AsyncSessionLocal
    from app.models.models import User, Department, Ticket
    from sqlalchemy.future import select
    from uuid import uuid4

    async with AsyncSessionLocal() as db:
        # 1. Get all departments
        r = await db.execute(select(Department))
        departments = r.scalars().all()
        
        # 2. Get all support staff
        r = await db.execute(select(User).where(User.role == 'SUPPORT'))
        support_users = r.scalars().all()
        
        # Map of department_id -> support_user
        dept_support_map = {u.department_id: u for u in support_users if u.department_id}
        
        # Generic CEO/Admin requester for these tickets
        r = await db.execute(select(User).where(User.email == 'ceo@itsm.com'))
        requester = r.scalar_one_or_none()
        
        if not requester:
            # Fallback to any admin
            r = await db.execute(select(User).where(User.role == 'ADMIN'))
            requester = r.scalars().first()

        print(f"Seeding tickets for {len(departments)} departments...")
        
        ticket_count = 0
        for d in departments:
            support_staff = dept_support_map.get(d.id)
            meta = d.dept_metadata or {}
            categories = meta.get('categories', ['General Support', 'Process Query', 'Operational Issue'])
            
            # Create 2 tickets per department
            for i in range(1, 4): # Increase to 3 for better density
                cat = random.choice(categories)
                status = random.choice(['OPEN', 'ACKNOWLEDGED', 'IN_PROGRESS', 'PENDING'])
                priority = random.choice(['Low', 'Medium', 'High', 'Critical'])
                
                # Subject mapping based on department
                subjects = {
                    'finance': [f"Budget Allocation for Q3 - {d.name}", "Invoice Discrepancy #FIN-992", "Expense Reimbursement Audit"],
                    'hr': ["Onboarding Documentation Missing", "Benefits Enrollment Window query", "Annual Leave Policy Clarification"],
                    'procurement': ["New Laptop Purchase Request", "Vendor Contract Review - Cisco", "Legacy Asset Disposal Authorization"],
                    'it': ["VPN Connection Latency", "Server Patching Phase 4", "Access Management Audit"],
                    'security': ["Unauthorized Access Attempt detected", "Firewall Rule Update Request", "Security Clearance Renewal"],
                }
                
                dept_subjects = subjects.get(d.slug, [
                    f"Operational System Check - {d.name}",
                    f"Process Optimization Request - {d.name}",
                    f"Regulatory Compliance Audit - {d.name}"
                ])
                
                subj = random.choice(dept_subjects)
                
                ticket = Ticket(
                    id=uuid4(),
                    display_id=f"TCK-{random.randint(1000, 9999)}",
                    subject=subj,
                    description=f"Automated operational check for the {d.name} support unit. Please verify unit readiness and handle accordingly.",
                    status=status,
                    priority=priority,
                    category=cat,
                    requestor_id=requester.id if requester else None,
                    assigned_to_id=support_staff.id if support_staff else None,
                    target_department_id=d.id
                    # created_at handled by DB default
                )
                db.add(ticket)
                ticket_count += 1
        
        await db.commit()
        print(f"Successfully seeded {ticket_count} tickets across all operational units.")

asyncio.run(seed())
