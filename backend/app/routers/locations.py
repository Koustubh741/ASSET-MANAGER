from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
from uuid import UUID
from ..database.database import get_db
from ..schemas.location_schema import LocationCreate, LocationUpdate, LocationResponse
from ..services import location_service
from ..utils import auth_utils

router = APIRouter(
    prefix="/locations",
    tags=["locations"]
)

@router.get("", response_model=List[LocationResponse])
async def get_locations(
    db: AsyncSession = Depends(get_db),
    user = Depends(auth_utils.get_current_user)
):
    return await location_service.get_locations(db)

@router.get("/{location_id}", response_model=LocationResponse)
async def get_location(
    location_id: UUID, 
    db: AsyncSession = Depends(get_db),
    user = Depends(auth_utils.get_current_user)
):
    location = await location_service.get_location(db, location_id)
    if not location:
        raise HTTPException(status_code=404, detail="Location not found")
    return location

@router.post("", response_model=LocationResponse, status_code=201)
async def create_location(
    location: LocationCreate, 
    db: AsyncSession = Depends(get_db),
    admin = Depends(auth_utils.get_current_user)
):
    if admin.role not in ["ADMIN", "ADMIN"]:
        raise HTTPException(status_code=403, detail="Unauthorized")
    return await location_service.create_location(db, location)

@router.patch("/{location_id}", response_model=LocationResponse)
async def update_location(
    location_id: UUID, 
    location_update: LocationUpdate, 
    db: AsyncSession = Depends(get_db),
    admin = Depends(auth_utils.get_current_user)
):
    if admin.role not in ["ADMIN", "ADMIN"]:
        raise HTTPException(status_code=403, detail="Unauthorized")
    updated_location = await location_service.update_location(db, location_id, location_update)
    if not updated_location:
        raise HTTPException(status_code=404, detail="Location not found")
    return updated_location
