from __future__ import annotations

from datetime import datetime
from typing import List, Optional, Any, Dict
from uuid import UUID

from pydantic import BaseModel, Field


#
# Admin-facing schemas
#


class PortPolicyBase(BaseModel):
    name: str = Field(..., max_length=255)
    description: Optional[str] = None

    scope_type: str = Field(..., description="HOST | NETWORK_DEVICE | CLOUD_RESOURCE")
    direction: str = Field(..., description="INBOUND | OUTBOUND")
    protocol: str = Field("TCP", description="TCP | UDP | ANY")

    port: Optional[int] = Field(
        None, ge=0, le=65535, description="Single port. Can be null if using range."
    )
    port_range_start: Optional[int] = Field(
        None, ge=0, le=65535, description="Start of port range (inclusive)."
    )
    port_range_end: Optional[int] = Field(
        None, ge=0, le=65535, description="End of port range (inclusive)."
    )

    action: str = Field("BLOCK", description="BLOCK | ALLOW")
    priority: int = Field(100, description="Lower number = higher priority")
    enabled: bool = True


class PortPolicyCreate(PortPolicyBase):
    pass


class PortPolicyUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    scope_type: Optional[str] = None
    direction: Optional[str] = None
    protocol: Optional[str] = None
    port: Optional[int] = Field(None, ge=0, le=65535)
    port_range_start: Optional[int] = Field(None, ge=0, le=65535)
    port_range_end: Optional[int] = Field(None, ge=0, le=65535)
    action: Optional[str] = None
    priority: Optional[int] = None
    enabled: Optional[bool] = None


class PolicyTargetRef(BaseModel):
    id: UUID
    target_type: str
    target_ref_id: str
    display_name: Optional[str] = None
    metadata_: Optional[Dict[str, Any]] = None

    class Config:
        from_attributes = True


class PortPolicyResponse(PortPolicyBase):
    id: UUID
    created_by: Optional[UUID] = None
    created_at: datetime
    updated_at: datetime

    targets: List[PolicyTargetRef] = []

    class Config:
        from_attributes = True


class PortPolicyAssignmentCreate(BaseModel):
    target_type: str
    target_ref_id: str
    display_name: Optional[str] = None
    metadata_: Optional[Dict[str, Any]] = None
    scope: Optional[str] = None


class EnforcementStateItem(BaseModel):
    id: UUID
    policy_id: UUID
    target_id: UUID
    agent_id: str
    status: str
    last_reported_at: Optional[datetime] = None
    last_error: Optional[str] = None
    applied_config_hash: Optional[str] = None

    class Config:
        from_attributes = True


#
# Agent-facing schemas
#


class AgentPortPolicyRule(BaseModel):
    policy_id: UUID
    target_id: UUID

    scope_type: str
    direction: str
    protocol: str
    action: str
    priority: int

    port: Optional[int] = None
    port_range_start: Optional[int] = None
    port_range_end: Optional[int] = None


class AgentPortPolicyDesiredResponse(BaseModel):
    agent_id: str
    config_hash: str
    rules: List[AgentPortPolicyRule]


class AgentPortPolicyReportItem(BaseModel):
    policy_id: UUID
    target_id: UUID
    status: str
    applied_config_hash: Optional[str] = None
    applied_rules: Optional[Dict[str, Any]] = None
    last_error: Optional[str] = None


class AgentPortPolicyReport(BaseModel):
    agent_id: str
    items: List[AgentPortPolicyReportItem]

