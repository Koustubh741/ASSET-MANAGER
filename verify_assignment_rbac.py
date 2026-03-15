import sys
import os
import asyncio
from uuid import uuid4
from sqlalchemy.future import select
from sqlalchemy.ext.asyncio import AsyncSession


# Add project root to sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), 'backend')))

from backend.app.database.database import SessionLocal
from backend.app.models.models import User, Ticket
from backend.app.routers.tickets import verify_it_allocation, verify_it_management
from fastapi import HTTPException
from pydantic import BaseModel

class UserMock:
    def __init__(self, id, role, position, status="ACTIVE"):
        self.id = id
        self.role = role
        self.position = position
        self.status = status

async def test_rbac():
    print("--- Testing Ticket Allocation RBAC ---")
    
    # 1. Test Manager Allocation (Should PASS)
    mgr = UserMock(uuid4(), "IT_MANAGEMENT", "MANAGER")
    print(f"Testing Manager (Role: {mgr.role}, Pos: {mgr.position})...", end=" ")
    try:
        await verify_it_allocation(mgr)
        print("PASSED")
    except HTTPException as e:
        print(f"FAILED: {e.detail}")

    # 2. Test Team Member Allocation (Should FAIL)
    staff = UserMock(uuid4(), "IT_MANAGEMENT", "TEAM_MEMBER")
    print(f"Testing Staff (Role: {staff.role}, Pos: {staff.position})...", end=" ")
    try:
        await verify_it_allocation(staff)
        print("FAILED (Should not allow)")
    except HTTPException as e:
        print(f"PASSED (Caught: {e.detail})")

    # 3. Test Admin Allocation (Should PASS)
    admin = UserMock(uuid4(), "ADMIN", "TEAM_MEMBER")
    print(f"Testing Admin (Role: {admin.role})...", end=" ")
    try:
        await verify_it_allocation(admin)
        print("PASSED")
    except HTTPException as e:
        print(f"FAILED: {e.detail}")

    # 4. Test Staff Self-Assignment (Management Check)
    print(f"Testing Staff Self-Assign Permission...", end=" ")
    try:
        await verify_it_management(staff)
        print("PASSED")
    except HTTPException as e:
        print(f"FAILED: {e.detail}")

if __name__ == "__main__":
    asyncio.run(test_rbac())
