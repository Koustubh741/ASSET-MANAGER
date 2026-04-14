from typing import Optional, List, Union
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func
from sqlalchemy.orm import joinedload
from ..models.models import User
from ..schemas.user_schema import UserCreate, UserUpdate
import uuid
from uuid import UUID
from ..utils.uuid_gen import get_uuid

from passlib.context import CryptContext
import bcrypt

# Password hashing configuration
# pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def get_password_hash(password):
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(plain_password, hashed_password):
    try:
        # Check if hashed_password is a bcrypt hash (starts with $2b$, $2a$, etc)
        # Note: bcrypt.checkpw requires bytes
        if hashed_password.startswith("$2"):
            return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))
        else:
             # Fallback to plain text comparison for dev seeds if they are not hashed
             return plain_password == hashed_password
    except Exception:
        # Fallback to plain text comparison
        return plain_password == hashed_password

async def get_user_by_email(db: AsyncSession, email: str):
    normalized_email = email.strip().lower()
    result = await db.execute(select(User).options(joinedload(User.dept_obj)).filter(func.lower(User.email) == normalized_email))
    return result.scalars().first()

async def get_user(db: AsyncSession, user_id: UUID):
    result = await db.execute(select(User).options(joinedload(User.dept_obj)).filter(User.id == user_id))
    return result.scalars().first()

async def create_user(db: AsyncSession, user: UserCreate):
    hashed_password = get_password_hash(user.password)
    # Check if this is the first user
    result = await db.execute(select(func.count(User.id)))
    count = result.scalar()
    
    is_first_user = count == 0
    # Root fix: Unified slugs. First user is always ADMIN.
    normalized_email = user.email.strip().lower()
    raw_role = (user.role or "END_USER").strip().upper()
    role_value = "ADMIN" if is_first_user else raw_role

        # Resolve Department ID if name provided but ID missing
    dept_id = user.department_id
    if not dept_id and user.department:
        from ..models.models import Department as DeptModel
        # Case-insensitive match for the department name
        dept_result = await db.execute(
            select(DeptModel).filter(func.lower(DeptModel.name) == user.department.lower())
        )
        matched_dept = dept_result.scalars().first()
        if matched_dept:
            dept_id = matched_dept.id

    db_user = User(
        id=get_uuid(),
        email=normalized_email,
        full_name=user.full_name,
        password_hash=hashed_password,
        role=role_value,
        status="ACTIVE", # Auto-approve all new accounts
        position=user.position,
        domain=user.domain,
        department_id=dept_id,
        location=user.location,
        phone=user.phone,
        company=user.company,
        manager_id=user.manager_id,
        persona=user.persona,
        loc_type=user.loc_type,
        sub_dept=user.sub_dept,
        designation=user.designation,
        protocol_id=user.protocol_id
    )
    db.add(db_user)
    await db.commit()
    await db.refresh(db_user)
    return db_user

async def get_user_hierarchy(db: AsyncSession):
    """
    Build and return the complete organization hierarchy.
    """
    # Fetch all active users
    result = await db.execute(select(User).filter(User.status == "ACTIVE"))
    users = result.scalars().all()
    
    # Map users by ID for quick lookup
    user_map = {str(u.id): {
        "id": str(u.id),
        "name": u.full_name,
        "role": u.role,
        "position": u.position,
        "department": u.dept_obj.name if u.dept_obj else "N/A",
        "manager_id": str(u.manager_id) if u.manager_id else None,
        "children": []
    } for u in users}
    
    roots = []
    for user_id, user_data in user_map.items():
        manager_id = user_data["manager_id"]
        if manager_id and manager_id in user_map:
            user_map[manager_id]["children"].append(user_data)
        else:
            # If no manager or manager not found/not active, it's a root
            roots.append(user_data)
            
    return roots

async def authenticate_user(db: AsyncSession, email: str, password: str):
    user = await get_user_by_email(db, email)
    if not user:
        return None
    if not verify_password(password, user.password_hash):
        return None
    # Check if user is active
    if user.status != "ACTIVE":
        return None
    return user

async def activate_user(db: AsyncSession, user_id: UUID) -> User:
    """
    Activate a user by setting their status to ACTIVE.
    Only PENDING accounts can be activated. Returns the updated user or None if not found.
    """
    user = await get_user(db, user_id)
    if not user:
        return None
    if user.status != "PENDING":
        return None
    user.status = "ACTIVE"
    await db.commit()
    await db.refresh(user)
    return user

async def get_users(
    db: AsyncSession, 
    status: Optional[str] = None, 
    role: Optional[str] = None,
    department: Optional[str] = None,
    skip: int = 0,
    limit: int = 100
) -> tuple[List[User], int]:
    """
    Get all users with pagination and total count (Asynchronous).
    Root Fix: Supports 100k user scalability.
    """
    query = select(User)
    
    # 1. Filters
    filter_clauses = []
    if status is not None:
        filter_clauses.append(User.status == status)
        
    if role is not None:
        filter_clauses.append(User.role == role)
        
    if department is not None:
        from sqlalchemy import or_
        from ..models.models import Department as DeptModel
        filter_clauses.append(
            or_(
                User.department_id.in_(
                    select(DeptModel.id).filter(DeptModel.name.ilike(f"%{department}%"))
                ),
                User.domain.ilike(f"%{department}%")
            )
        )
        
    if filter_clauses:
        query = query.filter(*filter_clauses)

    # 2. Total Count
    count_query = select(func.count(User.id))
    if filter_clauses:
        count_query = count_query.filter(*filter_clauses)
        
    total = (await db.execute(count_query)).scalar() or 0

    # 3. Pagination & Execution
    query = query.offset(skip)
    if limit > 0:
        query = query.limit(limit)
    query = query.order_by(User.full_name)
    result = await db.execute(query)
    return result.scalars().all(), total


async def get_role_counts(db: AsyncSession, status: str = None):
    """
    Return counts of users by role, optionally filtered by status (e.g. ACTIVE).
    Returns dict like {"FINANCE": 2, "PROCUREMENT": 3, "END_USER": 50, ...}.
    """
    query = select(User.role, func.count(User.id)).group_by(User.role)
    if status:
        query = query.filter(User.status == status)
    result = await db.execute(query)
    return {row[0]: row[1] for row in result.all()}

async def sync_sso_user(db: AsyncSession, sso_provider: str, sso_id: str, email: str, full_name: str):
    """
    Sync a user from an SSO provider.
    1. Check if user exists with sso_id.
    2. Check if user exists with email.
    3. Update or create user.
    """
    # 1. Try to find by SSO ID
    normalized_email = email.strip().lower()
    result = await db.execute(select(User).filter(User.sso_provider == sso_provider, User.sso_id == sso_id))
    user = result.scalars().first()
    
    if not user:
        # 2. Try to find by email
        result = await db.execute(select(User).filter(User.email == normalized_email))
        user = result.scalars().first()
        
        if user:
            # Link existing user to SSO
            user.sso_provider = sso_provider
            user.sso_id = sso_id
        else:
            # 3. Create new user
            user = User(
                id=get_uuid(),
                email=normalized_email,
                full_name=full_name,
                password_hash="SSO_MANAGED_" + str(get_uuid()), # Placeholder
                sso_provider=sso_provider,
                sso_id=sso_id,
                status="ACTIVE", # SSO users are usually pre-authenticated
                role="END_USER",
                persona="STANDARD_USER" # Default persona for SSO newcomers
            )
            db.add(user)
    
    await db.commit()
    await db.refresh(user)
    return user

async def update_user_password(db: AsyncSession, user_id: UUID, new_password: str):
    """
    Update a user's password with hashing (Asynchronous).
    """
    user = await get_user(db, user_id)
    if not user:
        return None
    user.password_hash = get_password_hash(new_password)
    await db.commit()
    await db.refresh(user)
    return user

async def update_user(db: AsyncSession, user_id: UUID, user_update: UserUpdate) -> Optional[User]:
    """
    Update user data dynamically.
    """
    user = await get_user(db, user_id)
    if not user:
        return None
    
    update_data = user_update.model_dump(exclude_unset=True)
    
    if "password" in update_data:
        update_data["password_hash"] = get_password_hash(update_data.pop("password"))
        
    for field, value in update_data.items():
        setattr(user, field, value)
        
    await db.commit()
    await db.refresh(user)
    return user
