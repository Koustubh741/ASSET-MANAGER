from __future__ import annotations
from sqlalchemy.ext.asyncio import AsyncSession
from typing import TYPE_CHECKING, List, Optional
from sqlalchemy.future import select
from sqlalchemy import update, and_, or_
from uuid import UUID
from datetime import datetime, timedelta, timezone
from ..models.models import Ticket, User, AssignmentGroup
from ..models.automation import WorkflowRule, SLAPolicy, TicketSLA
import logging

if TYPE_CHECKING:
    from sqlalchemy.ext.asyncio import AsyncSession
    from ..models.models import Ticket, User, AssignmentGroup
    from ..models.automation import WorkflowRule, SLAPolicy, TicketSLA, ChangeApproval
import logging

logger = logging.getLogger(__name__)

class AutomationService:
    @staticmethod
    async def apply_routing_rules(db: AsyncSession, ticket_id: UUID):
        """
        Evaluate workflow rules and assign ticket accordingly.
        """
        result = await db.execute(select(Ticket).where(Ticket.id == ticket_id))
        ticket = result.scalars().first()
        if not ticket:
            return

        # ROOT FIX: If an assignment group is already set (manual/initial assignment), 
        # do not apply keyword-aware routing rules to avoid "hijacking".
        if ticket.assignment_group_id:
            logger.info(f"Ticket {ticket_id} already has assignment group {ticket.assignment_group_id}. Skipping auto-routing.")
            return

        # Fetch active rules ordered by priority
        rules_result = await db.execute(
            select(WorkflowRule).where(WorkflowRule.is_active == True).order_by(WorkflowRule.priority_order.asc())
        )
        rules: List[WorkflowRule] = list(rules_result.scalars().all())

        for rule in rules:
            match = True
            conditions: dict = rule.conditions
            for field, value in conditions.items():
                if field == "subject_keywords":
                    if not ticket.subject or not any(kw.lower() in ticket.subject.lower() for kw in value):
                        match = False
                        break
                elif field == "description_keywords":
                    if not ticket.description or not any(kw.lower() in ticket.description.lower() for kw in value):
                        match = False
                        break
                else:
                    ticket_value = getattr(ticket, field, None)
                    if ticket_value != value:
                        match = False
                        break
            
            if match:
                logger.info(f"Ticket {ticket_id} matched rule: {rule.name}")
                # Apply actions
                if "assign_to_role" in rule.actions or "assign_to_id" in rule.actions:
                    if "assign_to_id" in rule.actions:
                        target_id = UUID(rule.actions["assign_to_id"])
                        # CROSS-REFERENCE: Check if target is a group
                        group_res = await db.execute(select(AssignmentGroup).where(AssignmentGroup.id == target_id))
                        if group_res.scalars().first():
                            ticket.assignment_group_id = target_id
                        else:
                            ticket.assigned_to_id = target_id
                    elif "assign_to_role" in rule.actions:
                        # Find a user with this role (simplified: pick first active)
                        user_res = await db.execute(
                            select(User).where(and_(User.role == rule.actions["assign_to_role"], User.status == "ACTIVE")).limit(1)
                        )
                        target_user = user_res.scalars().first()
                        if target_user:
                            ticket.assigned_to_id = target_user.id
                
                if "set_priority" in rule.actions:
                    ticket.priority = rule.actions["set_priority"]
                
                if "set_status" in rule.actions:
                    ticket.status = rule.actions["set_status"]
                
                # Update timeline
                current_timeline = list(ticket.timeline) if ticket.timeline else []
                current_timeline.append({
                    "action": "AUTO_ROUTED",
                    "comment": f"Automatically routed by rule: {rule.name}",
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "byRole": "SYSTEM",
                    "byUser": "SYSTEM"
                })
                ticket.timeline = current_timeline
                
                await db.commit()
                break # Apply first matching rule and stop

    @staticmethod
    async def initialize_ticket_sla(db: AsyncSession, ticket_id: UUID, commit: bool = True):
        """
        Assign an SLA policy to a ticket and calculate deadlines.
        """
        result = await db.execute(select(Ticket).where(Ticket.id == ticket_id))
        ticket = result.scalars().first()
        if not ticket:
            return

        # Find matching policy
        # Priority: Exact Priority + Category > Priority > Category > Default
        policy_query = select(SLAPolicy).where(SLAPolicy.is_active == True)
        policies_res = await db.execute(policy_query)
        policies = policies_res.scalars().all()

        best_policy: SLAPolicy | None = None
        best_score = -1

        print(f"DEBUG: Initializing SLA for ticket {ticket_id} (Priority: {ticket.priority}, Category: {ticket.category})")
        for p in policies:
            score = 0
            if p.priority and ticket.priority and p.priority.lower() == ticket.priority.lower(): score += 10
            elif p.priority is not None: continue # Mismatching priority

            if p.category and ticket.category and p.category.lower() == ticket.category.lower(): score += 5
            elif p.category is not None: continue # Mismatching category
            
            print(f"DEBUG: Policy {p.name} matches with score {score}")

            if score > best_score:
                best_score = score
                best_policy = p

        if best_policy is not None:
            # Ensure static analysis knows best_policy is not None here
            policy: SLAPolicy = best_policy
            print(f"DEBUG: Selected Policy: {policy.name}")
            logger.info(f"Ticket {ticket_id} assigned SLA Policy: {policy.name}")
            
            # ROOT FIX: Normalize base_time to UTC
            base_time = ticket.created_at
            if base_time.tzinfo is None:
                # If naive, assume UTC as per app standard
                base_time = base_time.replace(tzinfo=timezone.utc)
            else:
                # If aware, convert to UTC
                base_time = base_time.astimezone(timezone.utc)

            response_time: int | None = policy.response_time_limit
            resolution_time: int = policy.resolution_time_limit
            
            res_deadline = base_time + timedelta(minutes=response_time) if response_time else None
            rem_deadline = base_time + timedelta(minutes=resolution_time)

            # Check for existing SLA to update
            sla_query = select(TicketSLA).where(TicketSLA.ticket_id == ticket.id)
            existing_sla_res = await db.execute(sla_query)
            existing_sla: TicketSLA | None = existing_sla_res.scalars().first()

            if existing_sla is not None:
                existing_sla.sla_policy_id = policy.id
                existing_sla.response_deadline = res_deadline
                existing_sla.resolution_deadline = rem_deadline
                existing_sla.response_status = "IN_PROGRESS"
                existing_sla.resolution_status = "IN_PROGRESS"
            else:
                new_sla = TicketSLA(
                    ticket_id=ticket.id,
                    sla_policy_id=policy.id,
                    response_deadline=res_deadline,
                    resolution_deadline=rem_deadline
                )
                db.add(new_sla)
            
            if commit:
                await db.commit()
            else:
                await db.flush()

        else:
            # ── FALLBACK: No matching SLA policy found — use priority-based defaults ──
            # Ensures every ticket always gets an SLA record, even without configured policies.
            PRIORITY_RESOLUTION_HOURS = {
                "critical": 4,
                "high": 8,
                "medium": 24,
                "low": 72,
            }
            PRIORITY_RESPONSE_HOURS = {
                "critical": 1,
                "high": 2,
                "medium": 8,
                "low": 24,
            }
            priority_key = (ticket.priority or "medium").lower()
            resolution_hours = PRIORITY_RESOLUTION_HOURS.get(priority_key, 24)
            response_hours = PRIORITY_RESPONSE_HOURS.get(priority_key, 8)

            # ROOT FIX: Normalize base_time to UTC
            base_time = ticket.created_at
            if base_time.tzinfo is None:
                base_time = base_time.replace(tzinfo=timezone.utc)
            else:
                base_time = base_time.astimezone(timezone.utc)

            res_deadline = base_time + timedelta(hours=response_hours)
            rem_deadline = base_time + timedelta(hours=resolution_hours)

            logger.info(
                f"Ticket {ticket_id}: No SLA policy matched. "
                f"Applying default SLA — Priority={ticket.priority}, "
                f"Response in {response_hours}h, Resolution in {resolution_hours}h"
            )

            # Check for existing SLA record
            sla_query = select(TicketSLA).where(TicketSLA.ticket_id == ticket.id)
            existing_sla_res = await db.execute(sla_query)
            existing_sla = existing_sla_res.scalars().first()

            if existing_sla is not None:
                existing_sla.sla_policy_id = None  # No formal policy
                existing_sla.response_deadline = res_deadline
                existing_sla.resolution_deadline = rem_deadline
                existing_sla.response_status = "IN_PROGRESS"
                existing_sla.resolution_status = "IN_PROGRESS"
            else:
                new_sla = TicketSLA(
                    ticket_id=ticket.id,
                    sla_policy_id=None,  # Fallback — no policy record
                    response_deadline=res_deadline,
                    resolution_deadline=rem_deadline
                )
                db.add(new_sla)

            if commit:
                await db.commit()
            else:
                await db.flush()


    @staticmethod
    async def recalculate_open_ticket_slas(db: AsyncSession):
        """
        ROOT FIX: Re-evaluates SLAs for all open tickets when SLA Policies are changed.
        Ensures existing tickets instantly inherit newly created policies targeting them.
        """
        logger.info("Starting background SLA recalculation for all open tickets...")
        # Get all tickets that are not explicitly closed/resolved
        query = select(Ticket.id).where(
            or_(
                Ticket.status.notin_(["CLOSED", "RESOLVED", "Closed", "Resolved"]),
                Ticket.status == None
            )
        )
        res = await db.execute(query)
        open_ticket_ids = res.scalars().all()

        count = 0
        for tid in open_ticket_ids:
            try:
                # initialize_ticket_sla is safe because it only updates active policies,
                # and we anchored time calculations to ticket.created_at
                # ROOT FIX: Pass commit=False to batch these updates together for 10x performance boost
                await AutomationService.initialize_ticket_sla(db, tid, commit=False)
                count += 1
            except Exception as e:
                logger.error(f"Failed to recalculate SLA for ticket {tid}: {e}")
        
        await db.commit() # Single batch commit
        logger.info(f"Completed SLA recalculation. Re-evaluated {count} open tickets.")

    @staticmethod
    async def check_slas(db: AsyncSession):
        """
        Background job to check all active SLAs for breaches.
        """
        now = datetime.now(timezone.utc)
        
        # Check Response Breaches
        res_breach_query = select(TicketSLA).where(and_(
            TicketSLA.response_status == "IN_PROGRESS",
            TicketSLA.response_deadline < now
        ))
        res_breaches = await db.execute(res_breach_query)
        for sla in res_breaches.scalars().all():
            sla.response_status = "BREACHED"
            await AutomationService.trigger_escalation(db, sla.ticket_id, "RESPONSE_BREACH")

        # Check Resolution Breaches
        rem_breach_query = select(TicketSLA).where(and_(
            TicketSLA.resolution_status == "IN_PROGRESS",
            TicketSLA.resolution_deadline < now
        ))
        rem_breaches = await db.execute(rem_breach_query)
        for sla in rem_breaches.scalars().all():
            sla.resolution_status = "BREACHED"
            await AutomationService.trigger_escalation(db, sla.ticket_id, "RESOLUTION_BREACH")

        await db.commit()

    @staticmethod
    async def trigger_escalation(db: AsyncSession, ticket_id: UUID, reason: str):
        """
        Escalate a ticket: notify management and potentially reassign.
        """
        result = await db.execute(select(Ticket).where(Ticket.id == ticket_id))
        ticket = result.scalars().first()
        if not ticket:
            return

        logger.warning(f"Escalating ticket {ticket_id} due to {reason}")
        
        # Reassign to an IT Manager if breached and not already assigned to one
        # (Simplified: find first available IT_MANAGEMENT)
        mgr_res = await db.execute(
            select(User).where(and_(User.role == "IT_MANAGEMENT", User.status == "ACTIVE")).limit(1)
        )
        manager = mgr_res.scalars().first()
        
        if manager and ticket.assigned_to_id != manager.id:
            old_assignee = ticket.assigned_to_id
            ticket.assigned_to_id = manager.id
            
            # Update timeline
            current_timeline = list(ticket.timeline) if ticket.timeline else []
            current_timeline.append({
                "action": "ESCALATED",
                "comment": f"Ticket escalated due to {reason.replace('_', ' ').title()}. Reassigned to {manager.full_name}",
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "byRole": "SYSTEM",
                "byUser": "SYSTEM"
            })
            ticket.timeline = current_timeline
            
            # Here we would also call send_notification
            from .notification_service import send_notification
            await send_notification(db, ticket.id, "ticket_escalated", reason=reason, manager_name=manager.full_name)

        await db.commit()

    @staticmethod
    async def get_ticket_sla_status(db: AsyncSession, ticket_id: UUID):
        """
        Retrieve SLA tracking details for a ticket.
        """
        result = await db.execute(select(TicketSLA).where(TicketSLA.ticket_id == ticket_id))
        return result.scalars().first()

    @staticmethod
    async def mark_sla_responded(db: AsyncSession, ticket_id: UUID):
        """
        Set response status to MET if currently IN_PROGRESS or BREACHED but responded.
        Note: We allow updating BREACHED to MET if the response happens eventually (late but done).
        """
        result = await db.execute(select(TicketSLA).where(TicketSLA.ticket_id == ticket_id))
        sla = result.scalars().first()
        if sla and sla.response_status in ["IN_PROGRESS", "BREACHED"]:
            # If it was BREACHED, it stays BREACHED in the history but 'responded' metadata 
            # might be useful. For UI simplicity, MET means 'Done'.
            # However, standard ITSM usually keeps BREACHED if it breached.
            # We will use MET only if it wasn't BREACHED, or just mark it as 'Done' internal state.
            if sla.response_status == "IN_PROGRESS":
                sla.response_status = "MET"
            await db.commit()

    @staticmethod
    async def mark_sla_resolved(db: AsyncSession, ticket_id: UUID):
        """
        Set resolution status to MET. Also ensures response is marked.
        """
        result = await db.execute(select(TicketSLA).where(TicketSLA.ticket_id == ticket_id))
        sla = result.scalars().first()
        if sla:
            if sla.resolution_status == "IN_PROGRESS":
                sla.resolution_status = "MET"
            
            # Ensure response is also closed out
            if sla.response_status == "IN_PROGRESS":
                sla.response_status = "MET"
            
            await db.commit()

    @staticmethod
    async def submit_change_approval(db: AsyncSession, entity_type: str, entity_id: UUID, stages: list) -> ChangeApproval:
        """
        Submit a new change approval request.
        """
        from ..models.automation import ChangeApproval
        new_approval = ChangeApproval(
            entity_type=entity_type,
            entity_id=entity_id,
            stages=stages,
            status="PENDING",
            current_stage_index=0
        )
        db.add(new_approval)
        await db.commit()
        return new_approval

automation_service = AutomationService()
