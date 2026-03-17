import asyncio
from app.database.database import get_db
from app.models.models import User, AssetRequest
from sqlalchemy.future import select

async def diagnose():
    print("=== MANAGER VISIBILITY DIAGNOSTIC ===\n")
    
    async for db in get_db():
        # Get manager details
        result = await db.execute(select(User).filter(User.email == 'manager@gmail.com'))
        manager = result.scalars().first()
        
        if not manager:
            print("ERROR: manager@gmail.com not found")
            break
        
        print(f"Manager: {manager.email}")
        print(f"  Role: {manager.role}")
        print(f"  Position: {manager.position}")
        print(f"  Domain: [{manager.domain}]")
        print()
        
        # Get recent end user who raised requests
        result = await db.execute(
            select(User)
            .filter(User.role == 'END_USER')
            .filter(User.email.like('%enduser%') | User.email.like('%test%'))
            .limit(5)
        )
        end_users = result.scalars().all()
        
        print("Recent End Users:")
        for u in end_users:
            print(f"  {u.email} | Domain: [{u.domain}] | Position: {u.position}")
        print()
        
        # Get recent SUBMITTED requests
        result = await db.execute(
            select(AssetRequest)
            .filter(AssetRequest.status == 'SUBMITTED')
            .order_by(AssetRequest.created_at.desc())
            .limit(10)
        )
        requests = result.scalars().all()
        
        print(f"Recent SUBMITTED Requests: {len(requests)}")
        for r in requests:
            # Get requester
            req_result = await db.execute(select(User).filter(User.id == r.requester_id))
            requester = req_result.scalars().first()
            
            domain_match = "[MATCH]" if requester and requester.domain == manager.domain else "[MISMATCH]"
            
            print(f"  {r.asset_name} | Status: {r.status}")
            print(f"    Requester: {requester.email if requester else 'Unknown'} | Domain: [{requester.domain if requester else 'N/A'}] {domain_match}")
        
        print("\n=== DIAGNOSIS ===")
        print(f"Manager domain: [{manager.domain}]")
        
        # Count matching requests
        matching = sum(1 for r in requests if r.requester_id in [u.id for u in end_users if u.domain == manager.domain])
        print(f"Requests from users in manager's domain: {matching}/{len(requests)}")
        
        if matching == 0:
            print("\n[WARNING] ROOT CAUSE: Domain mismatch - no requests from users in the manager's domain")
            print(f"   Solution: Either change manager's domain or create test requests from users in '{manager.domain}' domain")
        
        break

if __name__ == "__main__":
    asyncio.run(diagnose())
