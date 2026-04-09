"""
Executive Analytics Router — Phase 5.1 Cache Integration
=========================================================
GET /analytics/executive/summary  — CEO/CXO strategic dashboard (60s TTL cache)
GET /analytics/executive/cache/status — Cache health check (admin only)
DELETE /analytics/executive/cache — Force-invalidate executive cache (admin only)
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Dict, Any

from ..database.database import get_db
from ..services.executive_service import ExecutiveService
from ..utils.auth_utils import get_current_user
from ..schemas.user_schema import UserResponse
from ..utils.cache import cache_get, cache_set, cache_invalidate_prefix

router = APIRouter(
    prefix="/analytics/executive",
    tags=["executive-analytics"]
)

# Cache key constants
_EXEC_SUMMARY_KEY = "executive:summary"
_EXEC_CACHE_TTL = 60  # seconds — summary refreshes every minute


@router.get("/summary")
async def get_executive_summary(
    db: AsyncSession = Depends(get_db),
    current_user: UserResponse = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Strategic summary for CXOs — aggregates security, operations, and
    financial KPIs into a single Fleet Health Index.

    Response is cached for 60 seconds (Redis or in-process TTLCache fallback).
    Authorized roles: ADMIN, IT_MANAGEMENT, FINANCE, MANAGER position.
    """
    authorized_roles = ["ADMIN", "IT_MANAGEMENT", "FINANCE", "CEO", "CXO"]
    if current_user.role.upper() not in authorized_roles and current_user.position != "MANAGER":
        raise HTTPException(
            status_code=403,
            detail="Unauthorized: Strategic dashboard access restricted to Executive and Management roles."
        )

    # ── Cache read ────────────────────────────────────────────────────────────
    cached = await cache_get(_EXEC_SUMMARY_KEY)
    if cached is not None:
        cached["_cache"] = "HIT"
        return cached

    # ── DB aggregation ────────────────────────────────────────────────────────
    result = await ExecutiveService.get_executive_summary(db)

    # ── Cache write ───────────────────────────────────────────────────────────
    await cache_set(_EXEC_SUMMARY_KEY, result, ttl=_EXEC_CACHE_TTL)

    result["_cache"] = "MISS"
    return result


@router.get("/cache/status")
async def get_cache_status(
    current_user: UserResponse = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Check whether the executive cache is warm.
    Returns metadata about the cached summary without hitting the DB.
    Admin only.
    """
    if current_user.role.upper() != "ADMIN":
        raise HTTPException(status_code=403, detail="Admin access required.")

    cached = await cache_get(_EXEC_SUMMARY_KEY)
    return {
        "cache_key": _EXEC_SUMMARY_KEY,
        "ttl_seconds": _EXEC_CACHE_TTL,
        "is_warm": cached is not None,
        "cached_timestamp": cached.get("timestamp") if cached else None,
    }


@router.delete("/cache")
async def invalidate_executive_cache(
    current_user: UserResponse = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Force-invalidate all executive dashboard cache entries.
    Use after a major data change that should reflect immediately.
    Admin only.
    """
    if current_user.role.upper() != "ADMIN":
        raise HTTPException(status_code=403, detail="Admin access required.")

    deleted = await cache_invalidate_prefix("executive:")
    return {
        "status": "invalidated",
        "keys_deleted": deleted,
        "message": f"Cleared {deleted} executive cache key(s). Next request will re-compute."
    }
