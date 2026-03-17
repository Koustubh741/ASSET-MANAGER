"""
Create test asset requests from cyber domain users for manager visibility testing.
"""
import asyncio
from app.database.database import get_db
from app.models.models import User
from app.services import asset_request_service
from app.schemas.asset_request_schema import AssetRequestCreate
from sqlalchemy.future import select

async def create_test_requests():
    print("=== Creating Test Requests for Cyber Domain ===\n")
    
    async for db in get_db():
        # Get cyber domain users
        result = await db.execute(
            select(User)
            .filter(User.domain == 'cyber')
            .filter(User.role == 'END_USER')
            .limit(3)
        )
        cyber_users = result.scalars().all()
        
        if not cyber_users:
            print("ERROR: No END_USER found in cyber domain")
            break
        
        print(f"Found {len(cyber_users)} users in cyber domain:")
        for u in cyber_users:
            print(f"  - {u.email}")
        print()
        
        # Create 3 test requests
        test_requests = [
            {
                "asset_name": "Cyber Security Laptop",
                "asset_type": "Laptop",
                "asset_ownership_type": "COMPANY_OWNED",
                "business_justification": "Required for security analysis and penetration testing",
                "asset_model": "Dell Latitude 7420",
                "asset_vendor": "Dell",
                "cost_estimate": 1500.00
            },
            {
                "asset_name": "Network Analyzer Tool",
                "asset_type": "Software",
                "asset_ownership_type": "COMPANY_OWNED",
                "business_justification": "Essential for network security monitoring",
                "asset_model": "Wireshark Enterprise",
                "asset_vendor": "Wireshark",
                "cost_estimate": 500.00
            },
            {
                "asset_name": "Security Workstation",
                "asset_type": "Desktop",
                "asset_ownership_type": "COMPANY_OWNED",
                "business_justification": "High-performance workstation for threat analysis",
                "asset_model": "HP Z2 Tower",
                "asset_vendor": "HP",
                "cost_estimate": 2000.00
            }
        ]
        
        created_count = 0
        for i, req_data in enumerate(test_requests):
            if i >= len(cyber_users):
                break
            
            user = cyber_users[i]
            req_data["requester_id"] = user.id
            
            try:
                request_obj = AssetRequestCreate(**req_data)
                created = await asset_request_service.create_asset_request(
                    db,
                    request_obj,
                    initial_status="SUBMITTED"
                )
                
                if created:
                    print(f"[CREATED] {created.asset_name}")
                    print(f"  Requester: {user.email}")
                    print(f"  Status: {created.status}")
                    print(f"  ID: {created.id}")
                    print()
                    created_count += 1
            except Exception as e:
                print(f"[ERROR] Failed to create request: {e}")
        
        print(f"\n=== Summary ===")
        print(f"Created {created_count} test requests from cyber domain users")
        print(f"Manager (manager@gmail.com) should now see these requests in their dashboard")
        
        break

if __name__ == "__main__":
    asyncio.run(create_test_requests())
