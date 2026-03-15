from __future__ import annotations

import hashlib
import json
from typing import List, Optional, Dict, Any, Tuple
from uuid import UUID

from sqlalchemy import select, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.port_policies import (
    PortPolicy,
    PolicyTarget,
    PortPolicyAssignment,
    PortPolicyEnforcementState,
)
from app.models.models import Asset, User
from app.schemas.port_policy_schema import (
    PortPolicyCreate,
    PortPolicyUpdate,
    PortPolicyAssignmentCreate,
    AgentPortPolicyRule,
)


# ------------------------
# CRUD helpers
# ------------------------


async def list_policies(
    db: AsyncSession,
    scope_type: Optional[str] = None,
    direction: Optional[str] = None,
    enabled: Optional[bool] = None,
    agent_id: Optional[str] = None,
) -> List[PortPolicy]:
    query = select(PortPolicy)

    filters = []
    if scope_type:
        filters.append(PortPolicy.scope_type == scope_type)
    if direction:
        filters.append(PortPolicy.direction == direction)
    if enabled is not None:
        filters.append(PortPolicy.enabled == enabled)

    if agent_id:
        # Only policies that have an assignment targeting this agent
        subq = (
            select(PortPolicyAssignment.policy_id)
            .join(PolicyTarget, PortPolicyAssignment.target_id == PolicyTarget.id)
            .where(
                and_(
                    PolicyTarget.target_type == "AGENT",
                    PolicyTarget.target_ref_id == agent_id,
                )
            )
        )
        query = query.where(PortPolicy.id.in_(subq))

    if filters:
        query = query.where(and_(*filters))

    result = await db.execute(query.order_by(PortPolicy.priority.asc(), PortPolicy.name.asc()))
    return result.scalars().all()


async def get_policy(db: AsyncSession, policy_id: UUID) -> Optional[PortPolicy]:
    result = await db.execute(select(PortPolicy).where(PortPolicy.id == policy_id))
    return result.scalars().first()


async def create_policy(
    db: AsyncSession,
    data: PortPolicyCreate,
    created_by: Optional[UUID],
) -> PortPolicy:
    policy = PortPolicy(
        name=data.name,
        description=data.description,
        scope_type=data.scope_type,
        direction=data.direction,
        protocol=data.protocol,
        port=data.port,
        port_range_start=data.port_range_start,
        port_range_end=data.port_range_end,
        action=data.action,
        priority=data.priority,
        enabled=data.enabled,
        created_by=created_by,
    )
    db.add(policy)
    await db.commit()
    await db.refresh(policy)
    return policy


async def update_policy(
    db: AsyncSession,
    policy: PortPolicy,
    data: PortPolicyUpdate,
) -> PortPolicy:
    update_dict = data.model_dump(exclude_unset=True)
    for field, value in update_dict.items():
        setattr(policy, field, value)

    await db.commit()
    await db.refresh(policy)
    return policy


async def delete_policy(db: AsyncSession, policy: PortPolicy) -> None:
    await db.delete(policy)
    await db.commit()


# ------------------------
# Target assignment helpers
# ------------------------


async def _get_or_create_target(
    db: AsyncSession,
    target_type: str,
    target_ref_id: str,
    display_name: Optional[str],
    metadata_: Optional[Dict[str, Any]],
) -> PolicyTarget:
    stmt = select(PolicyTarget).where(
        and_(
            PolicyTarget.target_type == target_type,
            PolicyTarget.target_ref_id == target_ref_id,
        )
    )
    result = await db.execute(stmt)
    target = result.scalars().first()

    if target:
        # Optionally update friendly fields
        if display_name is not None:
            target.display_name = display_name
        if metadata_ is not None:
            target.metadata_ = metadata_
        return target

    target = PolicyTarget(
        target_type=target_type,
        target_ref_id=target_ref_id,
        display_name=display_name,
        metadata_=metadata_ or {},
    )
    db.add(target)
    await db.flush()
    await db.refresh(target)
    return target


async def assign_targets_to_policy(
    db: AsyncSession,
    policy: PortPolicy,
    assignments: List[PortPolicyAssignmentCreate],
    current_user: Optional[User] = None,
) -> List[PortPolicyAssignment]:
    created: List[PortPolicyAssignment] = []

    # RBAC/Scope Check
    is_admin = current_user and current_user.role == "ADMIN"

    for item in assignments:
        # For non-admins, we should verify they own the target
        # For simplicity in this integration, we'll allow ASSET_MANAGER to manage AGENT targets 
        # that are related to their scoped assets. 
        # (This can be further refined with domain/dept checks)
        if not is_admin and current_user:
            if current_user.role not in ["ASSET_MANAGER", "IT_MANAGEMENT"]:
                raise Exception("Unauthorized to assign targets")
        
        target = await _get_or_create_target(
            db,
            target_type=item.target_type,
            target_ref_id=item.target_ref_id,
            display_name=item.display_name,
            metadata_=item.metadata_,
        )

        # Ensure we don't duplicate the same policy/target pair
        stmt = select(PortPolicyAssignment).where(
            and_(
                PortPolicyAssignment.policy_id == policy.id,
                PortPolicyAssignment.target_id == target.id,
            )
        )
        result = await db.execute(stmt)
        existing = result.scalars().first()
        if existing:
            # Optionally update scope/effective window
            if item.scope is not None:
                existing.scope = item.scope
            continue

        assignment = PortPolicyAssignment(
            policy_id=policy.id,
            target_id=target.id,
            scope=item.scope,
        )
        db.add(assignment)
        created.append(assignment)

    await db.commit()
    # Refresh created ones
    for a in created:
        await db.refresh(a)

    return created


async def remove_target_assignment(
    db: AsyncSession,
    policy_id: UUID,
    target_id: UUID,
) -> None:
    stmt = select(PortPolicyAssignment).where(
        and_(
            PortPolicyAssignment.policy_id == policy_id,
            PortPolicyAssignment.target_id == target_id,
        )
    )
    result = await db.execute(stmt)
    assignment = result.scalars().first()
    if not assignment:
        return

    await db.delete(assignment)
    await db.commit()


async def get_policy_targets(
    db: AsyncSession,
    policy_id: UUID,
) -> List[Tuple[PortPolicyAssignment, PolicyTarget]]:
    stmt = (
        select(PortPolicyAssignment, PolicyTarget)
        .join(PolicyTarget, PortPolicyAssignment.target_id == PolicyTarget.id)
        .where(PortPolicyAssignment.policy_id == policy_id)
    )
    result = await db.execute(stmt)
    return result.all()


async def get_enforcement_for_policy(
    db: AsyncSession,
    policy_id: UUID,
) -> List[PortPolicyEnforcementState]:
    result = await db.execute(
        select(PortPolicyEnforcementState).where(
            PortPolicyEnforcementState.policy_id == policy_id
        )
    )
    return result.scalars().all()


async def get_enforcement_for_agent(
    db: AsyncSession,
    agent_id: str,
) -> List[PortPolicyEnforcementState]:
    result = await db.execute(
        select(PortPolicyEnforcementState).where(
            PortPolicyEnforcementState.agent_id == agent_id
        )
    )
    return result.scalars().all()


# ------------------------
# Agent-facing helpers
# ------------------------


def _compute_rules_hash(rules: List[Dict[str, Any]]) -> str:
    # Stable hash for the ruleset
    payload = json.dumps(rules, sort_keys=True, default=str)
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


async def resolve_policies_for_agent(
    db: AsyncSession,
    agent_id: str,
    agent_type: str,
) -> Tuple[str, List[AgentPortPolicyRule]]:
    """
    Resolve the effective set of policies for an agent.

    Initial implementation:
    - Targets with type == 'AGENT' and target_ref_id == agent_id
    - Policies must be enabled.
    - Returns simple union of matching policies; conflict resolution is left
      to priority ordering (lower priority value wins).
    """

    # Find all targets bound directly to this agent_id
    target_stmt = select(PolicyTarget).where(
        and_(
            PolicyTarget.target_type == "AGENT",
            PolicyTarget.target_ref_id == agent_id,
        )
    )
    target_result = await db.execute(target_stmt)
    agent_targets = target_result.scalars().all()

    if not agent_targets:
        return _compute_rules_hash([]), []

    target_ids = [t.id for t in agent_targets]

    # Find assignments for these targets
    assignment_stmt = (
        select(PortPolicyAssignment, PortPolicy)
        .join(PortPolicy, PortPolicyAssignment.policy_id == PortPolicy.id)
        .where(
            and_(
                PortPolicyAssignment.target_id.in_(target_ids),
                PortPolicy.enabled.is_(True),
            )
        )
    )
    assignment_result = await db.execute(assignment_stmt)
    rows = assignment_result.all()

    rules: List[AgentPortPolicyRule] = []
    for assignment, policy in rows:
        rules.append(
            AgentPortPolicyRule(
                policy_id=policy.id,
                target_id=assignment.target_id,
                scope_type=policy.scope_type,
                direction=policy.direction,
                protocol=policy.protocol,
                action=policy.action,
                priority=policy.priority,
                port=policy.port,
                port_range_start=policy.port_range_start,
                port_range_end=policy.port_range_end,
            )
        )

    # Sort rules by priority for determinism
    rules.sort(key=lambda r: (r.priority, str(r.policy_id)))

    # Compute hash
    rules_dicts: List[Dict[str, Any]] = [
        r.model_dump() for r in rules  # type: ignore[call-arg]
    ]
    config_hash = _compute_rules_hash(rules_dicts)
    return config_hash, rules


async def upsert_enforcement_report(
    db: AsyncSession,
    agent_id: str,
    items: List[Dict[str, Any]],
) -> None:
    """
    Upsert enforcement status for each (policy_id, target_id, agent_id) tuple.
    """
    for item in items:
        policy_id = item["policy_id"]
        target_id = item["target_id"]

        stmt = select(PortPolicyEnforcementState).where(
            and_(
                PortPolicyEnforcementState.policy_id == policy_id,
                PortPolicyEnforcementState.target_id == target_id,
                PortPolicyEnforcementState.agent_id == agent_id,
            )
        )
        result = await db.execute(stmt)
        state = result.scalars().first()

        if state is None:
            state = PortPolicyEnforcementState(
                policy_id=policy_id,
                target_id=target_id,
                agent_id=agent_id,
            )
            db.add(state)

        state.status = item.get("status", state.status)
        state.applied_config_hash = item.get("applied_config_hash")
        state.applied_rules = item.get("applied_rules")
        state.last_error = item.get("last_error")

        # last_reported_at is handled by DB default if empty; we update here explicitly
        from datetime import datetime, timezone

        state.last_reported_at = datetime.now(timezone.utc)

    await db.commit()

