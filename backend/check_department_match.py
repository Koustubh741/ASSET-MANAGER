import asyncio
from app.database.database import AsyncSessionLocal
from app.models.models import AssetRequest, User
from sqlalchemy import select

async def check_requester_details():
    async with AsyncSessionLocal() as db:
        print("=" * 60)
        print("CHECKING MANAGER_APPROVED REQUEST REQUESTER DETAILS")
        print("=" * 60)
        
        # Get the MANAGER_APPROVED request
        res = await db.execute(
            select(AssetRequest)
            .filter(AssetRequest.status == 'MANAGER_APPROVED')
        )
        req = res.scalars().first()
        
        if req:
            print(f"\nRequest ID: {req.id}")
            print(f"Requester ID: {req.requester_id}")
            
            # Get requester details
            res = await db.execute(
                select(User).filter(User.id == req.requester_id)
            )
            requester = res.scalars().first()
            
            if requester:
                print(f"\nRequester Details:")
                print(f"  Name: {requester.full_name}")
                print(f"  Email: {requester.email}")
                print(f"  Department: {requester.department}")
                print(f"  Domain: {requester.domain}")
                print(f"  Position: {requester.position}")
                print(f"  Role: {requester.role}")
            
            # Get IT manager details
            res = await db.execute(
                select(User).filter(User.email == 'it_manager@itsm.com')
            )
            it_manager = res.scalars().first()
            
            if it_manager:
                print(f"\nIT Manager Details:")
                print(f"  Name: {it_manager.full_name}")
                print(f"  Email: {it_manager.email}")
                print(f"  Department: {it_manager.department}")
                print(f"  Domain: {it_manager.domain}")
                print(f"  Position: {it_manager.position}")
                print(f"  Role: {it_manager.role}")
                
                print(f"\n{'='*60}")
                print("DEPARTMENT MATCH CHECK")
                print("=" * 60)
                if requester and it_manager:
                    print(f"Requester Department: '{requester.department}'")
                    print(f"IT Manager Department: '{it_manager.department}'")
                    print(f"Match: {requester.department == it_manager.department}")
                    print(f"\nRequester Domain: '{requester.domain}'")
                    print(f"IT Manager Domain: '{it_manager.domain}'")
                    print(f"Match: {requester.domain == it_manager.domain}")
        else:
            print("No MANAGER_APPROVED request found")

if __name__ == "__main__":
    asyncio.run(check_requester_details())
