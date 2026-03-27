from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from ..database.database import get_db
from ..models.models import AiAgentConfig
from ..schemas.ai_configs_schema import AiAgentConfigResponse

router = APIRouter(prefix="/ai-configs", tags=["ai"])

@router.get("", response_model=list[AiAgentConfigResponse])
async def get_ai_configs(db: AsyncSession = Depends(get_db)):
    """Fetch all active AI agent configurations from the database."""
    result = await db.execute(select(AiAgentConfig).filter(AiAgentConfig.status == "ACTIVE"))
    return result.scalars().all()
