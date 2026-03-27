from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import delete
from typing import List
from uuid import UUID
from datetime import datetime, timezone

from ..database.database import get_db
from ..models.models import Task, Ticket, User, AssignmentGroup
from ..schemas.ticket_schema import TaskCreate, TaskResponse, TaskBase
from ..utils.auth_utils import get_current_user

router = APIRouter(
    prefix="/tasks",
    tags=["tasks"]
)

@router.get("/ticket/{ticket_id}", response_model=List[TaskResponse])
async def get_ticket_tasks(ticket_id: UUID, db: AsyncSession = Depends(get_db), current_user = Depends(get_current_user)):
    # Enrich with user and group names
    query = (
        select(Task, User.full_name, AssignmentGroup.name)
        .outerjoin(User, Task.assigned_to_id == User.id)
        .outerjoin(AssignmentGroup, Task.group_id == AssignmentGroup.id)
        .where(Task.ticket_id == ticket_id)
    )
    result = await db.execute(query)
    tasks = []
    for row, user_name, group_name in result.all():
        task_data = TaskResponse.model_validate(row)
        task_data.assigned_to_name = user_name
        task_data.group_name = group_name
        tasks.append(task_data)
    return tasks

@router.post("/", response_model=TaskResponse)
async def create_task(task: TaskCreate, db: AsyncSession = Depends(get_db), current_user = Depends(get_current_user)):
    db_task = Task(**task.model_dump())
    db.add(db_task)
    await db.commit()
    await db.refresh(db_task)
    return db_task

@router.patch("/{task_id}", response_model=TaskResponse)
async def update_task(
    task_id: UUID, 
    task_update: TaskBase, 
    db: AsyncSession = Depends(get_db), 
    current_user = Depends(get_current_user)
):
    result = await db.execute(select(Task).where(Task.id == task_id))
    db_task = result.scalars().first()
    if not db_task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    update_data = task_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_task, key, value)
    
    if db_task.status == "Completed" and not db_task.completed_at:
        db_task.completed_at = datetime.now(timezone.utc)
        
    await db.commit()
    await db.refresh(db_task)
    return db_task

@router.delete("/{task_id}")
async def delete_task(task_id: UUID, db: AsyncSession = Depends(get_db), current_user = Depends(get_current_user)):
    await db.execute(delete(Task).where(Task.id == task_id))
    await db.commit()
    return {"status": "deleted"}
