"""
User management endpoints for admin operations (Asynchronous)
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from ..database.database import get_db
from ..schemas.user_schema import UserCreate, UserResponse, UserUpdate
from ..schemas.common_schema import PaginatedResponse
from ..services import user_service
from typing import List, Optional
from ..utils import auth_utils
from ..utils.auth_utils import STAFF_ROLES

router = APIRouter(
    prefix="/users",
    tags=["users"]
)


async def check_admin_access(
    current_user = Depends(auth_utils.get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Verify user has admin privileges for user management.
    """
    allowed_roles = ["ADMIN"]
    if current_user.role not in allowed_roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only ADMIN can manage user accounts"
        )
    return current_user


async def check_staff_access(
    current_user = Depends(auth_utils.get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Allow IT staff and management to view organization data (read-only).
    """
    if current_user.role not in STAFF_ROLES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Staff credentials required to access organization data"
        )
    return current_user


@router.post("", response_model=UserResponse, status_code=201)
async def create_user(
    user: UserCreate,
    db: AsyncSession = Depends(get_db),
    admin_user = Depends(check_admin_access)
):
    """
    Create a new user (Admin only).
    Unlike registration, this allows admins to create users with any role and status.
    """
    # Check if email already exists
    existing_user = await user_service.get_user_by_email(db, email=user.email)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Set default status to ACTIVE when admin creates user (skip PENDING)
    if not user.status:
        user.status = "ACTIVE"
    
    return await user_service.create_user(db=db, user=user)


@router.get("", response_model=PaginatedResponse[UserResponse])
async def list_users(
    page: int = Query(1, ge=1),
    size: int = Query(50, ge=1, le=100),
    status: Optional[str] = None,
    role: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    admin_user = Depends(check_admin_access)
):
    """
    List all users with pagination and filters (Admin only).
    Root Fix: Implemented SQL-level pagination and filtering.
    """
    skip = (page - 1) * size
    
    users, total = await user_service.get_users(
        db, status=status, role=role, skip=skip, limit=size
    )
    
    return PaginatedResponse(
        total=total,
        page=page,
        size=size,
        data=users
    )


@router.get("/hierarchy")
async def get_hierarchy(
    db: AsyncSession = Depends(get_db),
    staff_user = Depends(check_staff_access)
):
    """
    Get the complete organization hierarchy (Staff access authorized).
    """
    return await user_service.get_user_hierarchy(db)


@router.get("/role-counts")
async def get_role_counts(
    status: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    staff_user = Depends(check_staff_access)
):
    """
    Get count of users per role (Admin only).
    Optional query: status=ACTIVE to count only active users.
    Returns e.g. {"FINANCE": 2, "PROCUREMENT": 3, "END_USER": 50, ...}.
    """
    counts = await user_service.get_role_counts(db, status=status)
    return counts


@router.get("/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: UUID,
    db: AsyncSession = Depends(get_db),
    admin_user = Depends(check_admin_access)
):
    """
    Get a specific user by ID (Admin only).
    """
    user = await user_service.get_user(db, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    return user


@router.patch("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: UUID,
    user_update: UserUpdate,
    db: AsyncSession = Depends(get_db),
    admin_user = Depends(check_admin_access)
):
    """
    Update a user (Admin only).
    """
    user = await user_service.get_user(db, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Update user fields
    update_data = user_update.model_dump(exclude_unset=True)
    # Root fix: no combined PROCUREMENT_FINANCE role; normalize to FINANCE
    if update_data.get("role") and str(update_data.get("role")).strip().upper() == "PROCUREMENT_FINANCE":
        update_data["role"] = "FINANCE"
    for field, value in update_data.items():
        if field == "password" and value:
            # Hash the password if being updated
            from passlib.context import CryptContext
            pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
            setattr(user, "password_hash", pwd_context.hash(value))
        elif hasattr(user, field):
            setattr(user, field, value)
    
    await db.commit()
    await db.refresh(user)
    return user


@router.delete("/{user_id}")
async def delete_user(
    user_id: UUID,
    db: AsyncSession = Depends(get_db),
    admin_user = Depends(check_admin_access)
):
    """
    Delete a user (Admin only). This is a soft-delete that sets status to DISABLED.
    """
    user = await user_service.get_user(db, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Soft delete - set status to DISABLED
    user.status = "DISABLED"
    await db.commit()
    
    return {"status": "success", "message": f"User {user_id} has been disabled"}

