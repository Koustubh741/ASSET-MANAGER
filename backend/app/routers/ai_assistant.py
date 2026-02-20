"""
AI Assistant endpoints - OpenAI-powered chat over asset data
"""
import os
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import update

from ..database.database import get_db
from ..services import asset_service
from ..utils.auth_utils import get_current_user
from ..models.models import User

router = APIRouter(
    prefix="/ai",
    tags=["ai-assistant"]
)

PROFESSIONAL_QUERY_LIMIT = 3000


class ChatRequest(BaseModel):
    message: str


class ChatResponse(BaseModel):
    response: str


class AIUsageResponse(BaseModel):
    plan: str
    queriesUsed: int
    queriesLimit: int | None  # None = unlimited


def _get_plan(user: User) -> str:
    return getattr(user, "plan", None) or "STARTER"


def _next_month_reset() -> datetime:
    now = datetime.now(timezone.utc)
    if now.month == 12:
        return now.replace(year=now.year + 1, month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
    return now.replace(month=now.month + 1, day=1, hour=0, minute=0, second=0, microsecond=0)


@router.get("/usage", response_model=AIUsageResponse)
async def get_ai_usage(
    current_user: User = Depends(get_current_user),
):
    """Return AI usage stats for the current user (plan, queries used, limit)."""
    plan = _get_plan(current_user)
    queries_used = getattr(current_user, "ai_queries_this_month", 0) or 0
    limit = PROFESSIONAL_QUERY_LIMIT if plan == "PROFESSIONAL" else None
    return AIUsageResponse(plan=plan, queriesUsed=queries_used, queriesLimit=limit)


def _build_asset_context(assets: list) -> str:
    """Build a concise text summary of assets for LLM context."""
    if not assets:
        return "The asset inventory is empty."
    lines = []
    for a in assets[:200]:  # Cap to avoid token limits
        parts = [
            f"- {a.name} ({a.type}, {a.model})",
            f"  status: {a.status}",
            f"  assigned_to: {a.assigned_to or 'Unassigned'}",
            f"  cost: {a.cost or 0}",
        ]
        if a.warranty_expiry:
            parts.append(f"  warranty_expiry: {a.warranty_expiry}")
        if a.location:
            parts.append(f"  location: {a.location}")
        lines.append("\n".join(parts))
    return "\n\n".join(lines)


@router.post("/chat", response_model=ChatResponse)
async def chat(
    body: ChatRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Send a message to the AI Assistant. Uses OpenAI to answer questions about assets.
    Requires OPENAI_API_KEY. Restricted to Professional, Business, Enterprise plans.
    """
    # Security Root Fix: Plan-based access - STARTER blocked
    plan = _get_plan(current_user)
    if plan == "STARTER":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Upgrade to Professional or higher to use AI Assistant.",
        )

    if plan == "PROFESSIONAL":
        now = datetime.now(timezone.utc)
        reset_at = getattr(current_user, "ai_queries_reset_at", None)
        queries = getattr(current_user, "ai_queries_this_month", 0) or 0
        if reset_at is None or (reset_at and reset_at <= now):
            queries = 0
            reset_at = _next_month_reset()
            await db.execute(
                update(User)
                .where(User.id == current_user.id)
                .values(ai_queries_this_month=0, ai_queries_reset_at=reset_at)
            )
            await db.commit()
        if queries >= PROFESSIONAL_QUERY_LIMIT:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"AI Assistant quota exceeded ({PROFESSIONAL_QUERY_LIMIT} queries/month). Upgrade to Business for unlimited access.",
            )
        await db.execute(
            update(User)
            .where(User.id == current_user.id)
            .values(ai_queries_this_month=queries + 1)
        )
        await db.commit()

    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="AI Assistant is temporarily unavailable. OPENAI_API_KEY is not configured.",
        )

    try:
        from openai import OpenAI
    except ImportError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="AI Assistant is temporarily unavailable. OpenAI client not installed.",
        )

    # Root Fix: Asset context scoped by user role (same logic as assets router)
    privileged_roles = ["FINANCE", "PROCUREMENT", "ASSET_MANAGER", "IT_MANAGEMENT", "ADMIN", "SYSTEM_ADMIN"]
    is_manager = getattr(current_user, "position", None) == "MANAGER"

    if current_user.role in privileged_roles:
        assets = await asset_service.get_all_assets(db)
    elif is_manager:
        department = current_user.department or current_user.domain
        assets = await asset_service.get_all_assets_scoped(db, department=department or "")
    else:
        # END_USER and others: only their assigned assets
        assets = await asset_service.get_assets_by_assigned_to(db, current_user.full_name or "")

    # Build context (AssetResponse has model_dump for JSON)
    asset_context = _build_asset_context(assets)
    total_count = len(assets)
    total_value = sum(float(a.cost or 0) for a in assets)

    system_prompt = f"""You are an AI Asset Assistant for an IT Asset Management system.
You help users query and understand their asset inventory.

## Asset Inventory Summary
- Total assets: {total_count}
- Total value: {total_value}

## Asset List (abbreviated)
{asset_context}

## Instructions
- Answer questions about asset count, types, warranties, spending, assignments, and status.
- Be concise and helpful. Use the data above to give accurate answers.
- If the user asks something you cannot answer from the data, say so politely.
- Do not make up asset details. Stick to the provided data."""

    try:
        client = OpenAI(api_key=api_key)
        completion = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": body.message},
            ],
            max_tokens=512,
        )
        response_text = completion.choices[0].message.content or "I couldn't generate a response."
        return ChatResponse(response=response_text)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"AI service error: {str(e)}",
        )
