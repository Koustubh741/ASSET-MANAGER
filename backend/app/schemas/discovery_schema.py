from pydantic import BaseModel
from typing import Dict, Any, Optional, List
from uuid import UUID

class DiscoveryHardware(BaseModel):
    cpu: str
    ram_mb: int
    serial: str
    model: str
    vendor: Optional[str] = "Unknown"
    type: Optional[str] = "Desktop"
    storage_gb: Optional[int] = 0
    condition: Optional[str] = "Excellent"
    ad_user: Optional[str] = "Unknown"
    primary_user: Optional[str] = None # Alternative to ad_user for non-AD systems
    ad_domain: Optional[str] = "LOCAL"

class DiscoveryOS(BaseModel):
    name: str
    version: str
    uptime_sec: int

class DiscoverySoftware(BaseModel):
    name: str
    version: Optional[str] = "Unknown"
    vendor: Optional[str] = "Unknown"

class DiscoveryPayload(BaseModel):
    agent_id: UUID
    scan_id: Optional[UUID] = None # For session tracking
    location_id: Optional[UUID] = None # Physical/Virtual location ID
    hostname: str
    ip_address: Optional[str] = None
    hardware: DiscoveryHardware
    os: DiscoveryOS
    software: Optional[List[DiscoverySoftware]] = []
    metadata: Optional[Dict[str, Any]] = {}

class SaaSDiscoveryItem(BaseModel):
    name: str
    vendor: str
    seat_count: float = 1.0
    cost: float = 0.0
    expiry_date: Optional[str] = None # ISO format date string
    is_discovered: bool = True

class SaaSDiscoveryPayload(BaseModel):
    agent_id: UUID
    scan_id: Optional[UUID] = None # For session tracking
    platform: str # e.g., "Google Workspace", "Microsoft 365"
    licenses: List[SaaSDiscoveryItem]
    metadata: Optional[Dict[str, Any]] = {}

class UserSyncItem(BaseModel):
    full_name: str
    email: str
    department: Optional[str] = None
    role: Optional[str] = "END_USER"
    position: Optional[str] = None
    location: Optional[str] = None
    status: Optional[str] = "ACTIVE"

class UserSyncPayload(BaseModel):
    agent_id: UUID
    scan_id: Optional[UUID] = None # For session tracking
    source_domain: str
    users: List[UserSyncItem]
    metadata: Optional[Dict[str, Any]] = {}

class BarcodeScanPayload(BaseModel):
    serial_number: str
    scan_type: str # VERIFY | REGISTER | CHECK_IN
    location: Optional[str] = None
    technician_id: Optional[UUID] = None
    metadata: Optional[Dict[str, Any]] = {}
