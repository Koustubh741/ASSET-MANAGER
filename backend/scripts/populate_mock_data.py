import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select, delete
from app.database.database import AsyncSessionLocal
from app.models.models import User, Asset
import random
from datetime import datetime, timedelta

async def populate_mock_assets():
    async with AsyncSessionLocal() as db:
        print("[INFO] Populating mock assets...")
        
        # 1. Clear existing assets
        try:
            await db.execute(delete(Asset))
            await db.commit()
            print("[OK] Cleared existing assets")
        except Exception as e:
            print(f"Note: {e}")
            await db.rollback()
        
        # 2. Get new users
        res = await db.execute(select(User).where(User.status == "ACTIVE"))
        users = res.scalars().all()
        
        if not users:
            print("[WARNING] No users found, assets will be unassigned")
        
        # 3. Create mock assets
        segments = ["IT", "IT", "IT", "NON-IT", "NON-IT"]
        it_types = ["Laptop", "Desktop", "Server", "Monitor", "Printer", "Router", "Tablet"]
        non_it_types = ["Chair", "Desk", "Cabinet", "Projector", "Whiteboard"]
        statuses = ["Active", "Active", "Active", "In Stock", "Repair", "Retired"]
        vendors = ["Dell", "HP", "Lenovo", "Apple", "Samsung", "Cisco", "Wipro Furniture", "Godrej"]
        locations = ["Mumbai Office", "Delhi Office", "Bangalore Office", "Pune Office", "Hyderabad Office", "Warehouse"]
        
        mock_assets = []
        for i in range(1, 101):  # Create 100 assets
            segment = random.choice(segments)
            if segment == "IT":
                asset_type = random.choice(it_types)
                models_list = ["HP EliteBook", "Dell Latitude", "ThinkPad X1", "MacBook Pro", "OptiPlex", "PowerEdge"]
            else:
                asset_type = random.choice(non_it_types)
                models_list = ["Executive", "Standard", "Premium", "Deluxe", "Basic"]
            
            purchase_date = datetime.now().date() - timedelta(days=random.randint(30, 730))
            warranty_expiry = purchase_date + timedelta(days=random.randint(365, 1095))
            
            # Chance to assign to a user
            user = random.choice(users) if users and random.random() > 0.3 else None
            
            asset = Asset(
                name=f"{asset_type} {i:03d}",
                segment=segment,
                type=asset_type,
                model=random.choice(models_list),
                serial_number=f"SN{i:05d}",
                status="Active" if user else random.choice(statuses),
                purchase_date=purchase_date,
                warranty_expiry=warranty_expiry,
                cost=random.randint(5000, 150000),
                vendor=random.choice(vendors),
                location=random.choice(locations),
                assigned_to=user.full_name if user else None,
                assigned_to_id=user.id if user else None,
                assigned_to_name=user.full_name if user else None
            )
            mock_assets.append(asset)
            
        db.add_all(mock_assets)
        await db.commit()
        print(f"[SUCCESS] Successfully inserted {len(mock_assets)} mock assets!")

if __name__ == "__main__":
    asyncio.run(populate_mock_assets())
