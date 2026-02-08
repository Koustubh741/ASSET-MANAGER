from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
from uuid import UUID
from ..database.database import get_db
from ..schemas.maintenance_schema import MaintenanceRecordCreate, MaintenanceRecordUpdate, MaintenanceRecordResponse
from ..services import maintenance_service
from ..utils import auth_utils

router = APIRouter(
    prefix="/maintenance",
    tags=["maintenance"]
)

@router.get("/asset/{asset_id}", response_model=List[MaintenanceRecordResponse])
async def get_asset_maintenance(asset_id: UUID, db: AsyncSession = Depends(get_db)):
    return await maintenance_service.get_maintenance_by_asset(db, asset_id)

@router.post("", response_model=MaintenanceRecordResponse, status_code=201)
async def create_maintenance_record(
    record: MaintenanceRecordCreate, 
    db: AsyncSession = Depends(get_db),
    it_user = Depends(auth_utils.get_current_user)
):
    if it_user.role not in ["IT_USER", "IT_MANAGEMENT", "ADMIN", "SYSTEM_ADMIN"]:
        raise HTTPException(status_code=403, detail="Unauthorized")
    return await maintenance_service.create_maintenance_record(db, record)

@router.patch("/{record_id}", response_model=MaintenanceRecordResponse)
async def update_maintenance_record(
    record_id: UUID, 
    record_update: MaintenanceRecordUpdate, 
    db: AsyncSession = Depends(get_db),
    it_user = Depends(auth_utils.get_current_user)
):
    updated = await maintenance_service.update_maintenance_record(db, record_id, record_update)
    if not updated:
        raise HTTPException(status_code=404, detail="Maintenance record not found")
    return updated
