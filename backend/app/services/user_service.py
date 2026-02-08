from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from ..models.models import User
from ..schemas.user_schema import UserCreate, UserUpdate
import uuid
from uuid import UUID

from passlib.context import CryptContext

# Password hashing configuration
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def get_password_hash(password):
    return pwd_context.hash(password)

def verify_password(plain_password, hashed_password):
    try:
        return pwd_context.verify(plain_password, hashed_password)
    except Exception:
        # Fallback to plain text comparison for dev seeds if they are not hashed
        return plain_password == hashed_password

async def get_user_by_email(db: AsyncSession, email: str):
    result = await db.execute(select(User).filter(User.email == email))
    return result.scalars().first()

async def get_user(db: AsyncSession, user_id: UUID):
    result = await db.execute(select(User).filter(User.id == user_id))
    return result.scalars().first()

async def create_user(db: AsyncSession, user: UserCreate):
    hashed_password = get_password_hash(user.password)
    db_user = User(
        id=uuid.uuid4(),
        email=user.email,
        full_name=user.full_name,
        password_hash=hashed_password,
        role=user.role or "END_USER",
        status=user.status if user.status else "PENDING",
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

async def get_users(db: AsyncSession, status: str = None):
    query = select(User)
    if status:
        query = query.filter(User.status == status)
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
