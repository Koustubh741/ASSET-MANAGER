from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from ..database.database import get_db
from ..utils.auth_utils import get_current_user
from ..models.models import UserPreference
from ..schemas.user_preferences_schema import UserPreferenceResponse, UserPreferenceUpdate
import uuid

router = APIRouter(prefix="/preferences", tags=["preferences"])

@router.get("/me", response_model=UserPreferenceResponse)
async def get_my_preferences(
    current_user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get current user's persistent preferences or create default ones."""
    result = await db.execute(select(UserPreference).filter(UserPreference.user_id == current_user.id))
    prefs = result.scalars().first()
    if not prefs:
        prefs = UserPreference(
            id=uuid.uuid4(),
            user_id=current_user.id,
            saved_views={},
            notification_settings={},
            ui_theme="light"
        )
        db.add(prefs)
        await db.commit()
        await db.refresh(prefs)
    return prefs

@router.patch("/me", response_model=UserPreferenceResponse)
async def update_my_preferences(
    update_data: UserPreferenceUpdate,
    current_user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update user preferences (saved views, theme, etc.)."""
    result = await db.execute(select(UserPreference).filter(UserPreference.user_id == current_user.id))
    prefs = result.scalars().first()
    if not prefs:
        prefs = UserPreference(id=uuid.uuid4(), user_id=current_user.id)
        db.add(prefs)
    
    if update_data.saved_views is not None:
        prefs.saved_views = update_data.saved_views
    if update_data.notification_settings is not None:
        prefs.notification_settings = update_data.notification_settings
    if update_data.ui_theme is not None:
        prefs.ui_theme = update_data.ui_theme
    
    await db.commit()
    await db.refresh(prefs)
    return prefs
