from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Dict, Any

from ..database.database import get_db
from ..services.executive_service import ExecutiveService
from ..utils.auth_utils import get_current_user
from ..schemas.user_schema import UserResponse

router = APIRouter(
    prefix="/analytics/executive",
    tags=["executive-analytics"]
)

@router.get("/summary")
async def get_executive_summary(
    db: AsyncSession = Depends(get_db),
    current_user: UserResponse = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Strategic summary for CXOs.
    Requires ADMIN or IT_MANAGEMENT roles for strategic access.
    """
    authorized_roles = ["ADMIN", "IT_MANAGEMENT", "FINANCE", "CEO", "CXO"] # CEO/CXO would be custom roles
    if current_user.role.upper() not in authorized_roles and current_user.position != "MANAGER":
        raise HTTPException(
            status_code=403,
            detail="Unauthorized: Strategic dashboard access restricted to Executive and Management roles."
        )
    
    return await ExecutiveService.get_executive_summary(db)
