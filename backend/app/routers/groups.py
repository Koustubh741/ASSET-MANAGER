from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import delete
from typing import List
from uuid import UUID

from ..database.database import get_db
from ..models.models import AssignmentGroup, AssignmentGroupMember, User
from ..schemas.ticket_schema import AssignmentGroupCreate, AssignmentGroupResponse
from ..utils.auth_utils import get_current_user
from ..schemas.user_schema import UserResponse

from sqlalchemy.orm import selectinload

router = APIRouter(
    prefix="/groups",
    tags=["groups"]
)

async def verify_admin(user: UserResponse) -> UserResponse:
    if user.role != "ADMIN":
        raise HTTPException(status_code=403, detail="Unauthorized: Admin access required")
    return user

@router.get("/", response_model=List[AssignmentGroupResponse])
async def get_groups(db: AsyncSession = Depends(get_db), current_user = Depends(get_current_user)):
    """
    ROOT FIX: Retrieve all assignment groups with their linked department names.
    Prioritizes official Department.name with a legacy string fallback.
    """
    result = await db.execute(
        select(AssignmentGroup)
        .options(selectinload(AssignmentGroup.dept_obj))
        .order_by(AssignmentGroup.name)
    )
    groups = result.scalars().all()
    
    # Map the department name for the schema
    for g in groups:
        if g.dept_obj:
            g.department_name = g.dept_obj.name
        elif g.department:
            g.department_name = g.department # Fallback
        else:
            g.department_name = "General" # Ultimate fallback
            
    return groups



@router.post("/", response_model=AssignmentGroupResponse)
async def create_group(
    group: AssignmentGroupCreate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    await verify_admin(current_user)
    db_group = AssignmentGroup(**group.model_dump())
    db.add(db_group)
    await db.commit()
    await db.refresh(db_group)
    return db_group

@router.get("/{group_id}", response_model=AssignmentGroupResponse)
async def get_group(group_id: UUID, db: AsyncSession = Depends(get_db), current_user = Depends(get_current_user)):
    result = await db.execute(select(AssignmentGroup).where(AssignmentGroup.id == group_id))
    db_group = result.scalars().first()
    if not db_group:
        raise HTTPException(status_code=404, detail="Group not found")
    return db_group

@router.delete("/{group_id}")
async def delete_group(group_id: UUID, db: AsyncSession = Depends(get_db), current_user = Depends(get_current_user)):
    await verify_admin(current_user)
    await db.execute(delete(AssignmentGroup).where(AssignmentGroup.id == group_id))
    await db.commit()
    return {"status": "deleted"}

@router.post("/{group_id}/members/{user_id}")
async def add_group_member(
    group_id: UUID, 
    user_id: UUID, 
    db: AsyncSession = Depends(get_db), 
    current_user = Depends(get_current_user)
):
    await verify_admin(current_user)
    member = AssignmentGroupMember(group_id=group_id, user_id=user_id)
    db.add(member)
    await db.commit()
    return {"status": "member added"}

@router.delete("/{group_id}/members/{user_id}")
async def remove_group_member(
    group_id: UUID, 
    user_id: UUID, 
    db: AsyncSession = Depends(get_db), 
    current_user = Depends(get_current_user)
):
    await verify_admin(current_user)
    await db.execute(
        delete(AssignmentGroupMember)
        .where(AssignmentGroupMember.group_id == group_id, AssignmentGroupMember.user_id == user_id)
    )
    await db.commit()
    return {"status": "member removed"}
