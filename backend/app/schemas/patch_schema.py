from pydantic import BaseModel
from typing import Optional, List, Any
from uuid import UUID
from datetime import datetime


class SystemPatchBase(BaseModel):
    patch_id: str
    title: str
    description: Optional[str] = None
    severity: str = "Moderate"
    patch_type: str = "Security"
    platform: str
    release_date: Optional[datetime] = None


class SystemPatchCreate(SystemPatchBase):
    cve_ids: Optional[List[str]] = []
    cvss_score: Optional[float] = None
    kb_article_url: Optional[str] = None
    vendor_advisory: Optional[str] = None


class SystemPatchResponse(SystemPatchBase):
    id: UUID
    created_at: datetime
    cve_ids: Optional[List[Any]] = []
    cvss_score: Optional[float] = None
    kb_article_url: Optional[str] = None
    vendor_advisory: Optional[str] = None

    class Config:
        from_attributes = True


class PatchDeploymentBase(BaseModel):
    patch_id: UUID
    asset_id: UUID
    status: str = "MISSING"
    installed_at: Optional[datetime] = None
    error_message: Optional[str] = None


class PatchDeploymentCreate(PatchDeploymentBase):
    pass


class PatchDeploymentResponse(PatchDeploymentBase):
    id: UUID
    last_check_at: datetime
    patch_title: Optional[str] = None

    class Config:
        from_attributes = True


class PatchComplianceSummary(BaseModel):
    asset_id: UUID
    asset_name: str
    platform: Optional[str] = None      # Windows, Linux, macOS
    total_patches: int
    installed_patches: int
    missing_patches: int
    critical_missing: int
    compliance_score: float              # 0-100


class PatchScheduleCreate(BaseModel):
    patch_id: UUID
    target_group: str = "ALL"            # ALL | PILOT | SERVERS | WORKSTATIONS
    scheduled_at: datetime


class PatchScheduleResponse(BaseModel):
    id: UUID
    patch_id: UUID
    target_group: str
    scheduled_at: datetime
    created_by: UUID
    status: str
    created_at: datetime
    executed_at: Optional[datetime] = None
    error_message: Optional[str] = None

    class Config:
        from_attributes = True


class PatchComplianceHistoryPoint(BaseModel):
    date: str
    avg_score: float
    total_missing: int
    critical_missing: int


class AgentPatchStatusPayload(BaseModel):
    """Payload sent by agent to report real patch levels on an endpoint."""
    agent_id: str
    platform: str                        # Windows | Linux | macOS
    installed_patches: Optional[List[str]] = []   # KB IDs (Windows) or patch_ids
    installed_packages: Optional[List[dict]] = []  # Linux: [{name, version}]


class PatchBulkDeployCreate(BaseModel):
    patch_id: UUID
    target_group: str = "ALL"            # ALL | PILOT | SERVERS | WORKSTATIONS


class PatchBulkDeployResponse(BaseModel):
    queued_count: int
    skipped_count: int
    message: str
