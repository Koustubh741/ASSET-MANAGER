from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
from sqlalchemy.future import select
from sqlalchemy import update, and_
from uuid import UUID
from datetime import datetime, timedelta
from ..models.models import Ticket, User
from ..models.automation import WorkflowRule, SLAPolicy, TicketSLA
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
                ticket_value = getattr(ticket, field, None)
                if ticket_value != value:
                    match = False
                    break
            
            if match:
                logger.info(f"Ticket {ticket_id} matched rule: {rule.name}")
                # Apply actions
                if "assign_to_role" in rule.actions or "assign_to_id" in rule.actions:
                    if "assign_to_id" in rule.actions:
                        ticket.assigned_to_id = UUID(rule.actions["assign_to_id"])
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
                    "timestamp": datetime.utcnow().isoformat(),
                    "byRole": "SYSTEM"
                })
                ticket.timeline = current_timeline
                
                await db.commit()
                break # Apply first matching rule and stop

    @staticmethod
    async def initialize_ticket_sla(db: AsyncSession, ticket_id: UUID):
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

        best_policy = None
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
            print(f"DEBUG: Selected Policy: {best_policy.name}")
            logger.info(f"Ticket {ticket_id} assigned SLA Policy: {best_policy.name}")
            
            now = datetime.utcnow()
            response_time: Optional[int] = best_policy.response_time_limit
            resolution_time: int = best_policy.resolution_time_limit
            
            res_deadline = now + timedelta(minutes=response_time) if response_time else None
            rem_deadline = now + timedelta(minutes=resolution_time)

            # Check for existing SLA to update
            sla_query = select(TicketSLA).where(TicketSLA.ticket_id == ticket.id)
            existing_sla_res = await db.execute(sla_query)
            existing_sla = existing_sla_res.scalars().first()

            if existing_sla:
                existing_sla.sla_policy_id = best_policy.id
                existing_sla.response_deadline = res_deadline
                existing_sla.resolution_deadline = rem_deadline
                existing_sla.response_status = "IN_PROGRESS"
                existing_sla.resolution_status = "IN_PROGRESS"
            else:
                new_sla = TicketSLA(
                    ticket_id=ticket.id,
                    sla_policy_id=best_policy.id,
                    response_deadline=res_deadline,
                    resolution_deadline=rem_deadline
                )
                db.add(new_sla)
            
            await db.commit()

    @staticmethod
    async def check_slas(db: AsyncSession):
        """
        Background job to check all active SLAs for breaches.
        """
        now = datetime.utcnow()
        
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
                "timestamp": datetime.utcnow().isoformat(),
                "byRole": "SYSTEM"
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
    async def submit_change_approval(db: AsyncSession, entity_type: str, entity_id: UUID, stages: list):
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
