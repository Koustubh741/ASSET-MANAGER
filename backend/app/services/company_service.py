from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func
from datetime import datetime
from uuid import UUID
import uuid

from ..models.models import Company, Location
from ..schemas.company_schema import CompanyCreate, CompanyUpdate
from . import location_service


async def get_company(db: AsyncSession):
    """Get the single company record (one per deployment)."""
    result = await db.execute(select(Company).limit(1))
    return result.scalars().first()


async def get_company_by_id(db: AsyncSession, company_id: UUID):
    result = await db.execute(select(Company).filter(Company.id == company_id))
    return result.scalars().first()


async def create_company(db: AsyncSession, company: CompanyCreate, setup_completed: bool = False):
    db_company = Company(
        id=uuid.uuid4(),
        name=company.name,
        legal_name=company.legal_name,
        tax_id=company.tax_id,
        logo_url=company.logo_url,
        primary_color=company.primary_color,
        timezone=company.timezone or "UTC",
        currency=company.currency or "USD",
        locale=company.locale or "en",
        contact_email=company.contact_email,
        support_email=company.support_email,
        website=company.website,
        industry=company.industry,
        address=company.address,
        setup_completed_at=datetime.utcnow() if setup_completed else None,
    )
    db.add(db_company)
    await db.commit()
    await db.refresh(db_company)
    return db_company


async def update_company(db: AsyncSession, company_id: UUID, company_update: CompanyUpdate):
    db_company = await get_company_by_id(db, company_id)
    if not db_company:
        return None

    update_data = company_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_company, key, value)

    await db.commit()
    await db.refresh(db_company)
    return db_company


async def get_setup_status(db: AsyncSession) -> dict:
    """
    Return setup completion status.
    setup_completed=True if a company exists and setup_completed_at is set.
    """
    result = await db.execute(select(Company).limit(1))
    company = result.scalars().first()
    if not company:
        return {"setup_completed": False, "company": None}
    return {
        "setup_completed": company.setup_completed_at is not None,
        "company": company,
    }


async def complete_setup(
    db: AsyncSession,
    company_data: CompanyCreate,
    locations_data: list[dict],
) -> tuple[Company, list]:
    """
    Create/update company, create locations, and mark setup as complete.
    Returns (company, locations).
    """
    result = await db.execute(select(Company).limit(1))
    existing = result.scalars().first()

    if existing:
        # Update existing company
        update_data = company_data.model_dump()
        for key, value in update_data.items():
            setattr(existing, key, value)
        existing.setup_completed_at = datetime.utcnow()
        await db.commit()
        await db.refresh(existing)
        company = existing
    else:
        # Create new company with setup_completed=True
        company = await create_company(db, company_data, setup_completed=True)

    # Create locations directly to avoid LocationCreate metadata/Base.metadata conflict
    created_locations = []
    for loc in locations_data:
        db_loc = Location(
            id=uuid.uuid4(),
            name=loc.get("name", "Unnamed"),
            address=loc.get("address"),
            timezone=loc.get("timezone", "UTC"),
            parent_id=loc.get("parent_id"),
        )
        db.add(db_loc)
        created_locations.append(db_loc)
    await db.commit()
    for db_loc in created_locations:
        await db.refresh(db_loc)

    return company, created_locations
