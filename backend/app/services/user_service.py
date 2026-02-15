from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func
from ..models.models import User
from ..schemas.user_schema import UserCreate, UserUpdate
import uuid
from uuid import UUID

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
    result = await db.execute(select(User).filter(User.email == email))
    return result.scalars().first()

async def get_user(db: AsyncSession, user_id: UUID):
    result = await db.execute(select(User).filter(User.id == user_id))
    return result.scalars().first()

async def create_user(db: AsyncSession, user: UserCreate):
    hashed_password = get_password_hash(user.password)
    # Check if this is the first user
    result = await db.execute(select(func.count(User.id)))
    count = result.scalar()
    
    is_first_user = count == 0
    
    db_user = User(
        id=uuid.uuid4(),
        email=user.email,
        full_name=user.full_name,
        password_hash=hashed_password,
        role="SYSTEM_ADMIN" if is_first_user else (user.role or "END_USER"),
        status="ACTIVE" if is_first_user else (user.status if user.status else "PENDING"),
        position=user.position,
        domain=user.domain,
        department=user.department,
        location=user.location,
        phone=user.phone,
        company=user.company
    )
    db.add(db_user)
    await db.commit()
    await db.refresh(db_user)
    return db_user

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
    Returns the updated user or None if not found.
    """
    user = await get_user(db, user_id)
    if not user:
        return None
    user.status = "ACTIVE"
    await db.commit()
    await db.refresh(user)
    return user

async def get_users(db: AsyncSession, status: str = None, department: str = None):
    query = select(User)
    if status:
        query = query.filter(User.status == status)
    
    if department:
        from sqlalchemy import or_
        query = query.filter(
            or_(
                User.department.ilike(f"%{department}%"),
                User.domain.ilike(f"%{department}%")
            )
        )
        
    result = await db.execute(query)
    return result.scalars().all()

async def sync_sso_user(db: AsyncSession, sso_provider: str, sso_id: str, email: str, full_name: str):
    """
    Sync a user from an SSO provider.
    1. Check if user exists with sso_id.
    2. Check if user exists with email.
    3. Update or create user.
    """
    # 1. Try to find by SSO ID
    result = await db.execute(select(User).filter(User.sso_provider == sso_provider, User.sso_id == sso_id))
    user = result.scalars().first()
    
    if not user:
        # 2. Try to find by email
        result = await db.execute(select(User).filter(User.email == email))
        user = result.scalars().first()
        
        if user:
            # Link existing user to SSO
            user.sso_provider = sso_provider
            user.sso_id = sso_id
        else:
            # 3. Create new user
            user = User(
                id=uuid.uuid4(),
                email=email,
                full_name=full_name,
                password_hash="SSO_MANAGED_" + str(uuid.uuid4()), # Placeholder
                sso_provider=sso_provider,
                sso_id=sso_id,
                status="ACTIVE", # SSO users are usually pre-authenticated
                role="END_USER"
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
