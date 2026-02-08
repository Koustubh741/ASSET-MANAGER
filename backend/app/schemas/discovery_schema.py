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
    hostname: str
    ip_address: Optional[str] = None
    hardware: DiscoveryHardware
    os: DiscoveryOS
    software: Optional[List[DiscoverySoftware]] = []
    metadata: Optional[Dict[str, Any]] = {}
