from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from ..database.database import get_db
from ..models.models import Department
from ..services.department_service import department_service
from pydantic import BaseModel
from uuid import UUID

router = APIRouter(
    prefix="/departments",
    tags=["departments"]
)

class DepartmentResponse(BaseModel):
    id: UUID
    slug: str
    name: str
    description: str | None = None
    dept_metadata: dict | None = {}

    class Config:
        from_attributes = True

@router.get("/", response_model=list[DepartmentResponse])
async def get_departments(db: AsyncSession = Depends(get_db)):
    """
    Get all departments including metadata for frontend branding.
    """
    result = await db.execute(select(Department).order_by(Department.name))
    return result.scalars().all()

@router.get("/stats")
async def get_dept_stats(
    department_id: UUID = None,
    db: AsyncSession = Depends(get_db)
):
    """
    Get statistics for a specific department or global ops stats.
    """
    return await department_service.get_department_stats(db, department_id)

@router.get("/hierarchy")
async def get_department_hierarchy(db: AsyncSession = Depends(get_db)):
    """
    Get the deep departmental hierarchy tree.
    """
    return await department_service.get_department_hierarchy(db)

@router.get("/{slug}", response_model=DepartmentResponse)
async def get_department_by_slug(slug: str, db: AsyncSession = Depends(get_db)):
    """
    Get a specific department by its URL-friendly slug.
    """
    result = await db.execute(select(Department).where(Department.slug == slug))
    dept = result.scalar_one_or_none()
    if not dept:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Department with slug '{slug}' not found"
        )
    return dept
