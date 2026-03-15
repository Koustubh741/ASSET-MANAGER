import asyncio
import uuid
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from app.models.models import SystemPatch, PatchDeployment, Asset
from app.database.database import DATABASE_URL

async def seed_patches():
    engine = create_async_engine(DATABASE_URL)
    AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with AsyncSessionLocal() as db:
        # 1. Create patches
        patches = [
            SystemPatch(
                id=uuid.uuid4(),
                patch_id="KB5031354",
                title="2023-10 Cumulative Update for Windows 11 Version 22H2",
                description="Addresses security issues for your Windows operating system.",
                severity="Critical",
                patch_type="Security",
                platform="Windows",
                release_date=datetime.now() - timedelta(days=120)
            ),
            SystemPatch(
                id=uuid.uuid4(),
                patch_id="KB5031445",
                title="Windows 11 Version 23H2 Enablement Package",
                description="Features for Windows 11 23H2.",
                severity="Moderate",
                patch_type="Feature Pack",
                platform="Windows",
                release_date=datetime.now() - timedelta(days=90)
            ),
            SystemPatch(
                id=uuid.uuid4(),
                patch_id="RHSA-2024:1234",
                title="Moderate: kernel security and bug fix update",
                description="The kernel packages contain the Linux kernel.",
                severity="Important",
                patch_type="Security",
                platform="Linux",
                release_date=datetime.now() - timedelta(days=10)
            )
        ]
        
        for p in patches:
            db.add(p)
        
        await db.commit()
        print(f"Seeded {len(patches)} patches.")
        
        # 2. Get some assets to link
        from sqlalchemy.future import select
        asset_result = await db.execute(select(Asset).limit(5))
        assets = asset_result.scalars().all()
        
        # 3. Create some deployments
        deployments = []
        for i, asset in enumerate(assets):
            # One installed, one missing for each
            deployments.append(PatchDeployment(
                id=uuid.uuid4(),
                patch_id=patches[0].id,
                asset_id=asset.id,
                status="INSTALLED",
                installed_at=datetime.now() - timedelta(days=30)
            ))
            
            if i % 2 == 0:
                deployments.append(PatchDeployment(
                    id=uuid.uuid4(),
                    patch_id=patches[2].id,
                    asset_id=asset.id,
                    status="FAILED",
                    error_message="Dependency check failed: libc6 version mismatch"
                ))
            else:
                deployments.append(PatchDeployment(
                    id=uuid.uuid4(),
                    patch_id=patches[1].id,
                    asset_id=asset.id,
                    status="MISSING"
                ))
        
        for d in deployments:
            db.add(d)
        
        await db.commit()
        print(f"Seeded {len(deployments)} deployments.")

if __name__ == "__main__":
    asyncio.run(seed_patches())
