"""
Reference data endpoints for departments, locations, and other lookup data (Asynchronous)
"""
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import distinct, func
from typing import List, Optional
from pydantic import BaseModel
from ..database.database import get_db
from ..models.models import User, Asset
from ..utils.auth_utils import get_current_user

router = APIRouter(
    prefix="/reference",
    tags=["reference"]
)



class DepartmentResponse(BaseModel):
    name: str
    count: Optional[int] = None


class LocationResponse(BaseModel):
    name: str
    count: Optional[int] = None


# Static location list (can be replaced with database table later)
LOCATIONS = [
    "Head Office",
    "Regional Office",
    "Warehouse A",
    "Warehouse B",
    "Store - Standard",
    "Store - Flagship",
    "IT Hub",
    "Remote",
]


@router.get("/departments", response_model=List[DepartmentResponse])
async def get_departments(
    include_counts: bool = False,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Get list of available departments.
    Optionally include user counts per department.
    """
    from ..models.models import Department
    result = await db.execute(
        select(Department).filter(~Department.name.like('[DEPRECATED]%'))
    )
    db_depts = result.scalars().all()
    
    if include_counts:
        # Optimized: Get counts via join in a single query
        counts_res = await db.execute(
            select(Department.name, func.count(User.id))
            .outerjoin(User, User.department_id == Department.id)
            .where(~Department.name.like('[DEPRECATED]%'))
            .group_by(Department.name)
        )
        counts_dict = {row[0]: row[1] for row in counts_res.all()}
        return [DepartmentResponse(name=d.name, count=counts_dict.get(d.name, 0)) for d in db_depts]
    
    return [DepartmentResponse(name=d.name) for d in db_depts]
    


@router.get("/locations", response_model=List[LocationResponse])
async def get_locations(
    include_counts: bool = False,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Get list of available locations.
    Optionally include asset counts per location.
    """
    if include_counts:
        # Optimized: Get all counts in a single query
        result = await db.execute(
            select(Asset.location, func.count(Asset.id))
            .group_by(Asset.location)
            .filter(Asset.location.isnot(None))
        )
        counts_dict = {row[0]: row[1] for row in result.all()}
        
        locations = []
        for loc in LOCATIONS:
            locations.append(LocationResponse(
                name=loc, 
                count=counts_dict.get(loc, 0)
            ))
        return locations
    
    return [LocationResponse(name=loc) for loc in LOCATIONS]


@router.get("/departments/from-db", response_model=List[str])
async def get_departments_from_db(
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Get unique departments from actual user data.
    """
    from ..models.models import Department
    result = await db.execute(select(Department.name).order_by(Department.name))
    return [row[0] for row in result.all()]


@router.get("/locations/from-db", response_model=List[str])
async def get_locations_from_db(
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Get unique locations from actual asset data.
    """
    result = await db.execute(
        select(distinct(Asset.location)).filter(Asset.location.isnot(None))
    )
    locations = [row[0] for row in result.fetchall()]
    return sorted(locations)


@router.get("/domains", response_model=List[str])
async def get_domains(current_user = Depends(get_current_user)):
    """
    Get list of available domains for END_USER role.
    """
    return [
        "DATA_AI",
        "CLOUD",
        "SECURITY",
        "DEVELOPMENT",
    ]


@router.get("/roles", response_model=List[dict])
async def get_roles(current_user = Depends(get_current_user)):
    """
    Get list of available user roles.
    """
    return [
        {"slug": "END_USER", "label": "End User", "description": "Regular employee"},
        {"slug": "IT_MANAGEMENT", "label": "IT Management", "description": "IT department management"},
        {"slug": "ASSET_MANAGER", "label": "Asset Manager", "description": "Asset inventory management"},
        {"slug": "ASSET_MANAGER", "label": "Inventory Manager", "description": "Stock and inventory control"},
        {"slug": "PROCUREMENT", "label": "Procurement Manager", "description": "Procurement operations"},
        {"slug": "FINANCE", "label": "Finance", "description": "Finance approvals and governance"},
        {"slug": "FINANCE", "label": "Finance", "description": "Finance department"},
        {"slug": "ADMIN", "label": "Administrator", "description": "System administrator"},
        {"slug": "ADMIN", "label": "System Admin", "description": "Full system access"},
    ]


@router.get("/asset-types", response_model=List[str])
async def get_asset_types(current_user = Depends(get_current_user)):
    """
    Get list of available asset types.
    """
    return [
        "Laptop",
        "Desktop",
        "Server",
        "Monitor",
        "Printer",
        "Network Equipment",
        "Mobile Device",
        "Tablet",
        "Software License",
        "Virtual Machine",
        "Storage Device",
        "Peripheral",
        "Other",
    ]


@router.get("/asset-statuses", response_model=List[str])
async def get_asset_statuses(current_user = Depends(get_current_user)):
    """
    Get list of available asset statuses.
    """
    return [
        "In Stock",
        "In Use",
        "Active",
        "Maintenance",
        "Repair",
        "Retired",
        "Disposed",
        "Lost",
        "Scrap",
    ]

