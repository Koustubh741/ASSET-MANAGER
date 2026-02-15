from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
from uuid import UUID
from ..database.database import get_db
from ..schemas.software_schema import (
    SoftwareLicenseCreate, SoftwareLicenseUpdate, SoftwareLicenseResponse, 
    DiscoveredSoftwareSummary, SoftwareComplianceReport, SoftwareMatchRequest
)
from ..services import software_service
from ..utils import auth_utils

router = APIRouter(
    prefix="/software",
    tags=["software"]
)

@router.get("", response_model=List[SoftwareLicenseResponse])
async def get_all_licenses(
    db: AsyncSession = Depends(get_db),
    user = Depends(auth_utils.get_current_user)
):
    return await software_service.get_all_licenses(db)

@router.get("/discovered", response_model=List[DiscoveredSoftwareSummary])
async def get_discovered_software(
    db: AsyncSession = Depends(get_db),
    user = Depends(auth_utils.get_current_user)
):
    """
    Get aggregated counts of discovered software.
    """
    return await software_service.get_discovered_software_summary(db)

@router.post("", response_model=SoftwareLicenseResponse, status_code=201)
async def create_license(
    license: SoftwareLicenseCreate, 
    db: AsyncSession = Depends(get_db),
    admin = Depends(auth_utils.get_current_user)
):
    if admin.role not in ["ADMIN", "SYSTEM_ADMIN", "ASSET_MANAGER"]:
        raise HTTPException(status_code=403, detail="Unauthorized")
    return await software_service.create_license(db, license)

@router.patch("/{license_id}", response_model=SoftwareLicenseResponse)
async def update_license(
    license_id: UUID, 
    license_update: SoftwareLicenseUpdate, 
    db: AsyncSession = Depends(get_db),
    admin = Depends(auth_utils.get_current_user)
):
    updated = await software_service.update_license(db, license_id, license_update)
    if not updated:
        raise HTTPException(status_code=404, detail="License not found")
    return updated

@router.get("/reconciliation", response_model=List[SoftwareComplianceReport])
async def get_reconciliation_report(
    db: AsyncSession = Depends(get_db),
    admin = Depends(auth_utils.get_current_user)
):
    """
    Get license compliance and reconciliation report.
    """
    if admin.role not in ["ADMIN", "SYSTEM_ADMIN", "ASSET_MANAGER"]:
        raise HTTPException(status_code=403, detail="Unauthorized")
    return await software_service.get_compliance_report(db)

@router.post("/match", response_model=SoftwareLicenseResponse)
async def match_software(
    request: SoftwareMatchRequest,
    db: AsyncSession = Depends(get_db),
    admin = Depends(auth_utils.get_current_user)
):
    """
    Manually match a discovered software name to a managed license.
    """
    if admin.role not in ["ADMIN", "SYSTEM_ADMIN", "ASSET_MANAGER"]:
        raise HTTPException(status_code=403, detail="Unauthorized")
    
    result = await software_service.match_discovered_to_license(
        db, 
        discovered_name=request.discovered_name, 
        license_id=request.license_id
    )
    if not result:
        raise HTTPException(status_code=404, detail="License not found")
    return result
