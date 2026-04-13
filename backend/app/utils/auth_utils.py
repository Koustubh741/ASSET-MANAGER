from datetime import datetime, timedelta, timezone
from typing import Optional
from jose import JWTError, jwt
import os
import uuid
from fastapi import Depends, HTTPException, status, Query, Cookie
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
from ..database.database import AsyncSessionLocal
from ..services import user_service

# Configuration from environment variables
SECRET_KEY = os.getenv("SECRET_KEY", "bc7Fz2VSGbGBPKb5lsLooQmSVY0f6rbYrfEtEWzP8L8")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 15)) # Default to 15 minutes (Security Hardening)
REFRESH_TOKEN_EXPIRE_DAYS = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", 7))  # Default to 7 days

# Centralized Role-Based Access Control Constants (ROOT FIX PHASE 2)
# We now use base roles. Contextual access (e.g. Finance) is handled via department filters.
STAFF_ROLES = {"ADMIN", "SUPPORT", "MANAGER"}
MANAGEMENT_ROLES = {"ADMIN", "MANAGER"}

# OAuth2 scheme for token extraction - auto_error=False to handle query params manually
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login", auto_error=False)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    # Ensure all values are JSON serializable (especially UUIDs)
    for key, value in to_encode.items():
        if isinstance(value, uuid.UUID):
            to_encode[key] = str(value)
            
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire, "type": "access"})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def create_refresh_token(data: dict) -> str:
    """
    Create a refresh token with longer expiry.
    """
    to_encode = data.copy()
    # Ensure all values are JSON serializable (especially UUIDs)
    for key, value in to_encode.items():
        if isinstance(value, uuid.UUID):
            to_encode[key] = str(value)
    
    expire = datetime.now(timezone.utc) + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire, "type": "refresh"})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def verify_refresh_token(token: str) -> Optional[dict]:
    """
    Verify a refresh token and return the payload if valid.
    """
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        if payload.get("type") != "refresh":
            return None
        return payload
    except JWTError:
        return None


def verify_token(token: str):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        return None

async def get_current_user(
    token: Optional[str] = Depends(oauth2_scheme),
    access_token: Optional[str] = Cookie(None),
    query_token: Optional[str] = Query(None, alias="token"),
):
    """
    Dependency to get current user from JWT token (Asynchronous).
    Supports Authorization header, 'access_token' cookie, and 'token' query parameter.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    # Priority: Header > Cookie > Query Param
    final_token = token or access_token or query_token
    
    if not final_token:
        raise credentials_exception
        
    payload = verify_token(final_token)
    if payload is None:
        raise credentials_exception
    
    user_id_raw = payload.get("user_id")
    if user_id_raw is None:
        raise credentials_exception
    try:
        user_id = uuid.UUID(str(user_id_raw)) if isinstance(user_id_raw, str) else user_id_raw
    except (ValueError, TypeError):
        raise credentials_exception

    # Use async session context manager
    async with AsyncSessionLocal() as db:
        user = await user_service.get_user(db, user_id)
        if user is None:
            raise credentials_exception
        return user
