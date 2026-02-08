from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func
from ..models.models import SoftwareLicense, DiscoveredSoftware
from ..schemas.software_schema import SoftwareLicenseCreate, SoftwareLicenseUpdate
from uuid import UUID
import uuid

async def get_all_licenses(db: AsyncSession):
    result = await db.execute(select(SoftwareLicense))
    return result.scalars().all()

async def get_license(db: AsyncSession, license_id: UUID):
    result = await db.execute(select(SoftwareLicense).filter(SoftwareLicense.id == license_id))
    return result.scalars().first()

async def create_license(db: AsyncSession, license: SoftwareLicenseCreate):
    db_license = SoftwareLicense(
        id=uuid.uuid4(),
        **license.model_dump()
    )
    db.add(db_license)
    await db.commit()
    await db.refresh(db_license)
    return db_license

async def update_license(db: AsyncSession, license_id: UUID, license_update: SoftwareLicenseUpdate):
    db_license = await get_license(db, license_id)
    if not db_license:
        return None
    
    update_data = license_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_license, key, value)
    
    await db.commit()
    await db.refresh(db_license)
    return db_license

async def get_discovered_software_summary(db: AsyncSession):
    """
    Returns aggregated counts of discovered software.
    """
    # Group by name, version, and vendor and count assets
    query = select(
        DiscoveredSoftware.name,
        DiscoveredSoftware.version,
        DiscoveredSoftware.vendor,
        func.count(DiscoveredSoftware.id).label("install_count"),
        func.min(DiscoveredSoftware.first_seen).label("first_seen"),
        func.max(DiscoveredSoftware.last_seen).label("last_seen")
    ).group_by(
        DiscoveredSoftware.name,
        DiscoveredSoftware.version,
        DiscoveredSoftware.vendor
    ).order_by(func.count(DiscoveredSoftware.id).desc())
    
    result = await db.execute(query)
    # Convert to list of dicts for schema validation
    rows = result.all()
    return [
        {
            "name": r.name,
            "version": r.version,
            "vendor": r.vendor,
            "install_count": r.install_count,
            "first_seen": r.first_seen,
            "last_seen": r.last_seen
        } for r in rows
    ]
