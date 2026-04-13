from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from ..models.models import Location
from ..schemas.location_schema import LocationCreate, LocationUpdate
from uuid import UUID
import uuid
from ..utils.uuid_gen import get_uuid

async def get_locations(db: AsyncSession):
    result = await db.execute(select(Location))
    return result.scalars().all()

async def get_location(db: AsyncSession, location_id: UUID):
    result = await db.execute(select(Location).filter(Location.id == location_id))
    return result.scalars().first()

async def create_location(db: AsyncSession, location: LocationCreate):
    db_location = Location(
        id=get_uuid(),
        **location.model_dump()
    )
    db.add(db_location)
    await db.commit()
    await db.refresh(db_location)
    return db_location

async def update_location(db: AsyncSession, location_id: UUID, location_update: LocationUpdate):
    db_location = await get_location(db, location_id)
    if not db_location:
        return None
    
    update_data = location_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_location, key, value)
    
    await db.commit()
    await db.refresh(db_location)
    return db_location

async def delete_location(db: AsyncSession, location_id: UUID):
    db_location = await get_location(db, location_id)
    if not db_location:
        return False
    await db.delete(db_location)
    await db.commit()
    return True
