from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List, Optional
from uuid import UUID
from pydantic import BaseModel
from ..database.database import get_db
from ..models.models import CategoryConfig
from ..utils.auth_utils import get_current_user

router = APIRouter(
    prefix="/categories",
    tags=["categories"]
)

class CategoryConfigSchema(BaseModel):
    name: str
    icon_name: str
    color: str
    bg_color: Optional[str] = None
    border_color: Optional[str] = None
    is_active: bool = True

class CategoryConfigResponse(CategoryConfigSchema):
    id: UUID

@router.get("/configs", response_model=List[CategoryConfigResponse])
async def get_all_category_configs(db: AsyncSession = Depends(get_db)):
    """
    Get all category styling configurations.
    """
    result = await db.execute(select(CategoryConfig).order_by(CategoryConfig.name))
    return result.scalars().all()

@router.post("/configs", response_model=CategoryConfigResponse)
async def create_or_update_category_config(
    config: CategoryConfigSchema,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Create or update a category configuration. Admin only.
    """
    if current_user.role not in ["ADMIN", "IT_MANAGEMENT"]:
        raise HTTPException(status_code=403, detail="Unauthorized")

    # Check if exists
    result = await db.execute(select(CategoryConfig).filter(CategoryConfig.name == config.name))
    existing = result.scalars().first()

    if existing:
        for key, value in config.dict().items():
            setattr(existing, key, value)
        db_item = existing
    else:
        db_item = CategoryConfig(**config.dict())
        db.add(db_item)
    
    await db.commit()
    await db.refresh(db_item)
    return db_item

@router.get("/suggest-icon/{name}")
async def suggest_icon(name: str):
    """
    Basic keyword-based icon suggestion for new categories.
    """
    name_lower = name.lower()
    mapping = {
        "cloud": "Cloud",
        "aws": "Cloud",
        "azure": "Cloud",
        "server": "Server",
        "database": "Database",
        "sql": "Database",
        "storage": "HardDrive",
        "disk": "HardDrive",
        "security": "Shield",
        "auth": "Lock",
        "permission": "Lock",
        "network": "Wifi",
        "internet": "Wifi",
        "bug": "Bug",
        "error": "Bug",
        "mobile": "Smartphone",
        "ios": "Smartphone",
        "android": "Smartphone",
        "mail": "Mail",
        "outlook": "Mail",
        "printer": "Printer"
    }
    
    for kw, icon in mapping.items():
        if kw in name_lower:
            return {"suggested_icon": icon}
            
    return {"suggested_icon": "HelpCircle"}
