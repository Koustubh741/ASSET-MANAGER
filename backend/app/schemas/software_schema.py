from pydantic import BaseModel
from typing import Optional
from uuid import UUID
from datetime import date, datetime

class SoftwareLicenseBase(BaseModel):
    name: str
    vendor: str
    license_key: Optional[str] = None
    seat_count: float = 1.0
    purchase_date: Optional[date] = None
    expiry_date: Optional[date] = None
    cost: float = 0.0
    status: str = "Active"

class SoftwareLicenseCreate(SoftwareLicenseBase):
    pass

class SoftwareLicenseUpdate(BaseModel):
    name: Optional[str] = None
    vendor: Optional[str] = None
    license_key: Optional[str] = None
    seat_count: Optional[float] = None
    status: Optional[str] = None

class SoftwareLicenseResponse(SoftwareLicenseBase):
    id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class DiscoveredSoftwareSummary(BaseModel):
    name: str
    vendor: Optional[str] = "Unknown"
    version: Optional[str] = "Unknown"
    install_count: int
    first_seen: datetime
    last_seen: datetime

    class Config:
        from_attributes = True
