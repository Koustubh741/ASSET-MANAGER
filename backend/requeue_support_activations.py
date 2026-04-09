import asyncio, sys, uuid
sys.path.insert(0, '.')

async def requeue():
    from app.database.database import AsyncSessionLocal
    from app.models.models import User
    from app.services.notification_service import NotificationService
    from sqlalchemy.future import select

    async with AsyncSessionLocal() as db:
        # Find all support users created for departments
        r = await db.execute(
            select(User).where(
                User.role == "SUPPORT", 
                User.email.like("%@itsm.com")
            )
        )
        support_users = r.scalars().all()
        
        if not support_users:
            print("No support units found to re-queue.")
            return

        notif_service = NotificationService(db)
        
        print(f"Re-queuing {len(support_users)} support accounts for Admin activation...")
        
        for u in support_users:
            print(f"  Setting {u.email} to PENDING...")
            u.status = "PENDING"
            
            # Trigger real-time notification for all Admins
            # In production, this would look like an 'Account Approval Requested' workflow step
            await notif_service._emit_realtime(
                title="🔐 Activation Required",
                message=f"New support unit account created for {u.department}. Manual activation required for {u.full_name}.",
                notif_type="system",
                link="/dashboard/system-admin/requests",
                source="AccountProvisioningSystem"
            )
        
        await db.commit()
        print("\nAll support accounts have been transitioned to PENDING.")
        print("Admin notifications have been dispatched to the Notification Center.")

if __name__ == "__main__":
    asyncio.run(requeue())
