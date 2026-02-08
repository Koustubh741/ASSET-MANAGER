from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from ..models.models import MaintenanceRecord
from ..schemas.maintenance_schema import MaintenanceRecordCreate, MaintenanceRecordUpdate
from uuid import UUID
import uuid

async def get_maintenance_by_asset(db: AsyncSession, asset_id: UUID):
    result = await db.execute(select(MaintenanceRecord).filter(MaintenanceRecord.asset_id == asset_id))
    return result.scalars().all()

async def create_maintenance_record(db: AsyncSession, record: MaintenanceRecordCreate):
    db_record = MaintenanceRecord(
        id=uuid.uuid4(),
        **record.model_dump()
    )
    db.add(db_record)
    await db.commit()
    await db.refresh(db_record)
    return db_record

async def update_maintenance_record(db: AsyncSession, record_id: UUID, record_update: MaintenanceRecordUpdate):
    result = await db.execute(select(MaintenanceRecord).filter(MaintenanceRecord.id == record_id))
    db_record = result.scalars().first()
    if not db_record:
        return None
    
    update_data = record_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_record, key, value)
    
    await db.commit()
    await db.refresh(db_record)
    return db_record
