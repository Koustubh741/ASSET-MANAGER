from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import Optional, List
from sqlalchemy.ext.asyncio import AsyncSession

from ..database.database import get_db
from ..utils import auth_utils
from ..schemas.company_schema import CompanyCreate, CompanyResponse
from ..services import company_service
from .auth import check_ADMIN

router = APIRouter(
    prefix="/setup",
    tags=["setup"],
)


class SetupStatusResponse(BaseModel):
    setup_completed: bool
    company: Optional[CompanyResponse] = None


class LocationInput(BaseModel):
    name: str
    address: Optional[str] = None
    timezone: str = "UTC"


class SetupCompletePayload(BaseModel):
    company: CompanyCreate
    locations: List[LocationInput] = []


@router.get("/status", response_model=SetupStatusResponse)
async def get_setup_status(
    db: AsyncSession = Depends(get_db),
):
    """
    Return setup completion status. Any authenticated user can call this.
    """
    result = await company_service.get_setup_status(db)
    return SetupStatusResponse(
        setup_completed=result["setup_completed"],
        company=CompanyResponse.model_validate(result["company"]) if result["company"] else None,
    )


@router.post("/complete")
async def complete_setup(
    payload: SetupCompletePayload,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(check_ADMIN),
):
    """
    Complete the setup wizard. ADMIN only.
    Creates/updates company and locations, marks setup as complete.
    """
    locations_data = [loc.model_dump() for loc in payload.locations]
    company, locations = await company_service.complete_setup(
        db, payload.company, locations_data
    )
    return {
        "company": CompanyResponse.model_validate(company),
        "locations_created": len(locations),
    }


@router.get("/company", response_model=CompanyResponse)
async def get_company(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(check_ADMIN),
):
    """
    Get current company. ADMIN only.
    """
    company = await company_service.get_company(db)
    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Company not configured yet",
        )
    return CompanyResponse.model_validate(company)
