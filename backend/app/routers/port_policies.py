from __future__ import annotations

from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.database import get_db
from app.models.port_policies import (
    PortPolicy,
    PolicyTarget,
    PortPolicyEnforcementState,
)
from app.models.models import AuditLog
from app.schemas.port_policy_schema import (
    PortPolicyCreate,
    PortPolicyUpdate,
    PortPolicyResponse,
    PortPolicyAssignmentCreate,
    EnforcementStateItem,
    AgentPortPolicyDesiredResponse,
    AgentPortPolicyReport,
)
from app.services import port_policy_service
from app.routers.auth import check_system_admin
from app.routers.collect import verify_agent_token


router = APIRouter(prefix="", tags=["port-policies"])


# -----------------------
# Admin-facing endpoints
# -----------------------


@router.get("/port-policies", response_model=List[PortPolicyResponse])
async def list_port_policies(
    scope_type: str | None = Query(None),
    direction: str | None = Query(None),
    enabled: bool | None = Query(None),
    agent_id: str | None = Query(None, description="Filter to policies assigned to this agent"),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(check_system_admin),
):
    policies = await port_policy_service.list_policies(
        db, scope_type=scope_type, direction=direction, enabled=enabled, agent_id=agent_id
    )

    # Fetch targets in a second step for simplicity
    results: List[PortPolicyResponse] = []
    for policy in policies:
        assignments = await port_policy_service.get_policy_targets(db, policy.id)
        targets = [row[1] for row in assignments]
        resp = PortPolicyResponse(
            **PortPolicyResponse.model_validate(policy).model_dump(),
            targets=targets,
        )
        results.append(resp)

    return results


@router.post(
    "/port-policies",
    response_model=PortPolicyResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_port_policy(
    payload: PortPolicyCreate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(check_system_admin),
):
    policy = await port_policy_service.create_policy(
        db, payload, created_by=current_user.id
    )
    return PortPolicyResponse.model_validate(policy)


@router.get("/port-policies/{policy_id}", response_model=PortPolicyResponse)
async def get_port_policy(
    policy_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(check_system_admin),
):
    policy = await port_policy_service.get_policy(db, policy_id)
    if not policy:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Port policy not found"
        )

    assignments = await port_policy_service.get_policy_targets(db, policy_id)
    targets = [row[1] for row in assignments]
    return PortPolicyResponse(
        **PortPolicyResponse.model_validate(policy).model_dump(),
        targets=targets,
    )


@router.put("/port-policies/{policy_id}", response_model=PortPolicyResponse)
async def update_port_policy(
    policy_id: UUID,
    payload: PortPolicyUpdate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(check_system_admin),
):
    policy = await port_policy_service.get_policy(db, policy_id)
    if not policy:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Port policy not found"
        )

    policy = await port_policy_service.update_policy(db, policy, payload)
    assignments = await port_policy_service.get_policy_targets(db, policy_id)
    targets = [row[1] for row in assignments]
    return PortPolicyResponse(
        **PortPolicyResponse.model_validate(policy).model_dump(),
        targets=targets,
    )


@router.delete(
    "/port-policies/{policy_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_port_policy(
    policy_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(check_system_admin),
):
    policy = await port_policy_service.get_policy(db, policy_id)
    if not policy:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Port policy not found"
        )

    await port_policy_service.delete_policy(db, policy)
    return None


@router.post(
    "/port-policies/{policy_id}/targets",
    response_model=List[PortPolicyResponse],
)
async def assign_targets(
    policy_id: UUID,
    payload: List[PortPolicyAssignmentCreate],
    db: AsyncSession = Depends(get_db),
    current_user=Depends(check_system_admin),
):
    policy = await port_policy_service.get_policy(db, policy_id)
    if not policy:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Port policy not found"
        )

    await port_policy_service.assign_targets_to_policy(db, policy, payload)
    assignments = await port_policy_service.get_policy_targets(db, policy_id)
    targets = [row[1] for row in assignments]

    resp = PortPolicyResponse(
        **PortPolicyResponse.model_validate(policy).model_dump(),
        targets=targets,
    )
    return [resp]


@router.get(
    "/port-policies/{policy_id}/enforcement",
    response_model=List[EnforcementStateItem],
)
async def get_policy_enforcement(
    policy_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(check_system_admin),
):
    policy = await port_policy_service.get_policy(db, policy_id)
    if not policy:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Port policy not found"
        )

    states = await port_policy_service.get_enforcement_for_policy(db, policy_id)
    return [EnforcementStateItem.model_validate(s) for s in states]


@router.get(
    "/agents/{agent_id}/port-policies/state",
    response_model=List[EnforcementStateItem],
)
async def get_agent_port_policy_state(
    agent_id: str,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(check_system_admin),
):
    states = await port_policy_service.get_enforcement_for_agent(db, agent_id)
    return [EnforcementStateItem.model_validate(s) for s in states]


# -----------------------
# Agent-facing endpoints
# -----------------------


@router.get(
    "/agents/{agent_id}/port-policies/desired",
    response_model=AgentPortPolicyDesiredResponse,
)
async def get_desired_policies_for_agent(
    agent_id: str,
    agent_type: str = Query(
        "LOCAL_DISCOVERY",
        description="Agent type (LOCAL_DISCOVERY | SERVER_SCANNER | SNMP_SCANNER | CLOUD_MONITOR)",
    ),
    db: AsyncSession = Depends(get_db),
    authenticated: bool = Depends(verify_agent_token),
):
    """
    Return the normalized desired ruleset for a given agent.

    Agents must authenticate using the same header-based scheme as other collectors.
    """
    config_hash, rules = await port_policy_service.resolve_policies_for_agent(
        db, agent_id=agent_id, agent_type=agent_type
    )
    return AgentPortPolicyDesiredResponse(
        agent_id=agent_id,
        config_hash=config_hash,
        rules=rules,
    )


@router.post(
    "/agents/{agent_id}/port-policies/report",
    status_code=status.HTTP_202_ACCEPTED,
)
async def report_port_policy_enforcement(
    agent_id: str,
    payload: AgentPortPolicyReport,
    db: AsyncSession = Depends(get_db),
    authenticated: bool = Depends(verify_agent_token),
):
    """
    Agents call this to report enforcement status for their ruleset.
    """
    if payload.agent_id != agent_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Agent ID mismatch",
        )

    # Upsert enforcement state
    items = [
        {
            "policy_id": item.policy_id,
            "target_id": item.target_id,
            "status": item.status,
            "applied_config_hash": item.applied_config_hash,
            "applied_rules": item.applied_rules,
            "last_error": item.last_error,
        }
        for item in payload.items
    ]
    await port_policy_service.upsert_enforcement_report(db, agent_id=agent_id, items=items)

    # Simple audit log entry
    async with db:
        from datetime import datetime, timezone
        import uuid as uuid_lib

        audit = AuditLog(
            id=uuid_lib.uuid4(),
            entity_type="Agent",
            entity_id=str(agent_id),
            action="PORT_POLICY_ENFORCEMENT_REPORT",
            performed_by=None,
            details={
                "agent_id": agent_id,
                "item_count": len(items),
            },
            timestamp=datetime.now(timezone.utc),
        )
        db.add(audit)
        await db.commit()

    return {"status": "accepted"}

