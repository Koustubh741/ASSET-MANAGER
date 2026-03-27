"""
Department-scoped endpoints
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Dict, Any
from ..database.database import get_db
from ..services import department_service
from ..utils.auth_utils import get_current_user
from ..models.models import Department
from sqlalchemy import select

router = APIRouter(
    prefix="/departments",
    tags=["departments"]
)

@router.get("/")
async def list_departments(
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    List all standardized departments
    """
    query = select(Department)
    result = await db.execute(query)
    return result.scalars().all()

@router.get("/stats")
async def get_department_stats(
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Get stats for the current user's department by ID
    """
    if not current_user.department_id:
        # Fallback to IT if no department is linked
        # This shouldn't happen after migration
        return {
            "error": "No department linked to user",
            "department": "Unassigned"
        }
        
    return await department_service.get_department_stats(db, current_user.department_id)

@router.get("/members")
async def get_department_members(
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Get members of the current user's department by ID
    """
    if not current_user.department_id:
        return [current_user]
        
    return await department_service.get_department_members(db, current_user.department_id)

