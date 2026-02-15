from pydantic import BaseModel, EmailStr, Field, ConfigDict
from typing import Optional, List, Union
from datetime import datetime
from uuid import UUID

# USER SCHEMAS
class UserBase(BaseModel):
    email: EmailStr
    full_name: Optional[str] = None
    role: str = "END_USER"
    status: str = "PENDING"  # PENDING | ACTIVE | EXITING | DISABLED
    position: Optional[str] = None  # MANAGER | TEAM_MEMBER
    domain: Optional[str] = None  # DATA_AI | CLOUD | SECURITY | DEVELOPMENT
    department: Optional[str] = None
    location: Optional[str] = None
    phone: Optional[str] = None
    company: Optional[str] = None

class UserCreate(UserBase):
    password: str

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    role: Optional[str] = None
    status: Optional[str] = None
    position: Optional[str] = None
    domain: Optional[str] = None
    department: Optional[str] = None
    location: Optional[str] = None
    company: Optional[str] = None
    password: Optional[str] = None # In real app, handle password change securely

class UserResponse(UserBase):
    id: Union[UUID, str]
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

# LOGIN SCHEMAS
class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class LoginResponse(BaseModel):
    access_token: str
    refresh_token: Optional[str] = None
    token_type: str = "bearer"
    user: UserResponse


class RefreshTokenRequest(BaseModel):
    refresh_token: str


class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str
