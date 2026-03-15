"""
Notification Service
Handles email and system notifications for asset request workflow state changes.
"""
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from ..models.models import User, AssetRequest
from typing import Dict, Any, Optional, List
from uuid import UUID
from datetime import datetime
import logging

logger = logging.getLogger(__name__)


class NotificationService:
    """
    Service for sending notifications during workflow transitions.
    
    In production, this would integrate with:
    - SMTP server for emails
    - Slack/Teams for instant messaging
    - Push notification services
    - SMS gateways
    """
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def _get_user_email(self, user_id: UUID) -> Optional[str]:
        """Get user email by ID"""
        result = await self.db.execute(select(User).filter(User.id == user_id))
        user = result.scalars().first()
        return user.email if user else None
    
    async def _get_users_by_role(self, role: str) -> List[str]:
        """Get all user emails with a specific role"""
        result = await self.db.execute(select(User).filter(User.role == role, User.status == "ACTIVE"))
        users = result.scalars().all()
        return [user.email for user in users if user.email]
    
    async def _simulate_email(self, to: str, subject: str, body: str, cc: List[str] = None):
        """
        Simulate sending an email.
        In production, replace with actual SMTP integration.
        """
        logger.info(f"""
        ========== EMAIL NOTIFICATION ==========
        To: {to}
        CC: {', '.join(cc) if cc else 'None'}
        Subject: {subject}
        
        {body}
        ========================================
        """)
        
        # In production, use:
        # import smtplib
        # from email.mime.text import MIMEText
        # ...
        
        return True
    
    async def notify_request_submitted(self, request_id: UUID):
        """Notify when a new request is submitted"""
        result = await self.db.execute(select(AssetRequest).filter(AssetRequest.id == request_id))
        request = result.scalars().first()
        
        if not request:
            return False
        
        requester_email = await self._get_user_email(request.requester_id)
        
        # Notify requester
        await self._simulate_email(
            to=requester_email,
            subject=f"Asset Request #{request_id} Submitted",
            body=f"""
            Your asset request has been submitted successfully.
            
            Asset Type: {request.asset_type}
            Model: {request.asset_model or 'N/A'}
            Status: SUBMITTED
            
            Your request is now pending manager approval.
            """
        )
        
        return True
    
    async def notify_manager_approval_required(self, request_id: UUID):
        """Notify manager that approval is required"""
        result = await self.db.execute(select(AssetRequest).filter(AssetRequest.id == request_id))
        request = result.scalars().first()
        
        if not request:
            return False
        
        # Get requester to find their manager
        requester = await self.db.execute(select(User).filter(User.id == request.requester_id))
        requester_user = requester.scalars().first()
        
        # In production, would query for actual manager based on org hierarchy
        # For now, notify all users with MANAGER position
        managers = await self.db.execute(
            select(User).filter(User.position == "MANAGER", User.status == "ACTIVE")
        )
        manager_emails = [m.email for m in managers.scalars().all() if m.email]
        
        for manager_email in manager_emails:
            await self._simulate_email(
                to=manager_email,
                subject=f"Action Required: Asset Request #{request_id}",
                body=f"""
                A new asset request requires your approval.
                
                Requester: {requester_user.full_name if requester_user else 'Unknown'}
                Asset Type: {request.asset_type}
                Model: {request.asset_model or 'N/A'}
                Justification: {request.justification or 'None provided'}
                
                Please review and approve/reject this request.
                """
            )
        
        return True
    
    async def notify_status_change(
        self,
        request_id: UUID,
        old_status: str,
        new_status: str,
        reviewer_name: Optional[str] = None,
        reason: Optional[str] = None
    ):
        """
        Generic notification for status changes.
        Routes to appropriate stakeholders based on new status.
        """
        result = await self.db.execute(select(AssetRequest).filter(AssetRequest.id == request_id))
        request = result.scalars().first()
        
        if not request:
            return False
        
        requester_email = await self._get_user_email(request.requester_id)
        
        # Determine notification recipients based on new status
        notifications = []
        
        if new_status.endswith("_REJECTED"):
            # Notify requester of rejection
            notifications.append({
                "to": requester_email,
                "subject": f"Asset Request #{request_id} - {new_status}",
                "body": f"""
                Your asset request has been {new_status}.
                
                Reviewed by: {reviewer_name or 'System'}
                Reason: {reason or 'No reason provided'}
                
                Asset Type: {request.asset_type}
                Model: {request.asset_model or 'N/A'}
                """
            })
            # Procurement rejected: also notify IT Management
            if new_status == "PROCUREMENT_REJECTED" or new_status == "PO_REJECTED":
                it_emails = await self._get_users_by_role("IT_MANAGEMENT")
                for email in it_emails:
                    notifications.append({
                        "to": email,
                        "subject": f"Procurement Rejected Request #{request_id}",
                        "body": f"""
                        Procurement has rejected asset request #{request_id}.
                        
                        Reason: {reason or 'No reason provided'}
                        Reviewed by: {reviewer_name or 'System'}
                        
                        Asset Type: {request.asset_type}
                        """
                    })
            # Finance rejected: also notify IT Management and Procurement
            if new_status == "FINANCE_REJECTED":
                it_emails = await self._get_users_by_role("IT_MANAGEMENT")
                proc_emails = await self._get_users_by_role("PROCUREMENT")
                for email in it_emails:
                    notifications.append({
                        "to": email,
                        "subject": f"Budget Rejected - Request #{request_id}",
                        "body": f"""
                        Budget approval was rejected for asset request #{request_id}.
                        
                        Reason: {reason or 'No reason provided'}
                        Reviewed by: {reviewer_name or 'System'}
                        """
                    })
                for email in proc_emails:
                    notifications.append({
                        "to": email,
                        "subject": f"Budget Rejected - Request #{request_id}",
                        "body": f"""
                        Budget approval was rejected for asset request #{request_id}.
                        
                        Reason: {reason or 'No reason provided'}
                        Reviewed by: {reviewer_name or 'System'}
                        """
                    })
        
        elif new_status == "MANAGER_APPROVED":
            # Notify IT Management that a request is ready for review
            it_emails = await self._get_users_by_role("IT_MANAGEMENT")
            for email in it_emails:
                notifications.append({
                    "to": email,
                    "subject": f"Action Required: IT Review for Request #{request_id}",
                    "body": f"""
                    The manager has approved an asset request. IT review is now required.
                    
                    Asset Type: {request.asset_type}
                    Model: {request.asset_model or 'N/A'}
                    Requester: {request.requester_id}
                    
                    Please review current inventory and technical requirements.
                    """
                })

        elif new_status == "IT_APPROVED":
            # Notify requester and Manager that IT has approved
            notifications.append({
                "to": requester_email,
                "subject": f"Asset Request #{request_id} - IT Approved",
                "body": f"""
                Your asset request has been approved by IT Management.
                
                Next Step: Manager final confirmation of the technical decision.
                """
            })
            # Also notify manager (who needs to confirm)
            # Find manager emails again (already did this in notify_manager_approval_required, could refactor)
            managers = await self.db.execute(
                select(User).filter(User.position == "MANAGER", User.status == "ACTIVE")
            )
            manager_emails = [m.email for m in managers.scalars().all() if m.email]
            for email in manager_emails:
                notifications.append({
                    "to": email,
                    "subject": f"Manager Confirmation Required - Request #{request_id}",
                    "body": f"""
                    IT has approved asset request #{request_id}. Please provide your final confirmation to trigger fulfillment.
                    """
                })

        elif new_status == "MANAGER_CONFIRMED_IT":
            # Determine routing based on ownership type
            if request.asset_ownership_type == "BYOD":
                it_emails = await self._get_users_by_role("IT_MANAGEMENT")
                for email in it_emails:
                    notifications.append({
                        "to": email,
                        "subject": f"Action Required: BYOD Compliance Scan - Request #{request_id}",
                        "body": f"""
                        A BYOD request has been confirmed. Please perform the security scan.
                        
                        Asset: {request.asset_model}
                        Serial: {request.serial_number}
                        """
                    })
            else:
                # If inventory not available, it would go to PROCUREMENT_REQUESTED (handled below)
                # If inventory available, it goes to USER_ACCEPTANCE_PENDING (handled below)
                pass

        elif new_status == "BYOD_COMPLIANCE_CHECK":
            # Already handled by MANAGER_CONFIRMED_IT for the trigger, but good to have a backup
            pass

        elif new_status == "PROCUREMENT_REQUESTED":
            # Notify procurement team
            procurement_emails = await self._get_users_by_role("PROCUREMENT")
            for email in procurement_emails:
                notifications.append({
                    "to": email,
                    "subject": f"Action Required: Procurement for Request #{request_id}",
                    "body": f"""
                    A new procurement request requires your attention.
                    
                    Asset Type: {request.asset_type}
                    Model: {request.asset_model or 'N/A'}
                    Estimated Cost: ${request.cost_estimate or 0}
                    
                    Please upload the Purchase Order for this request.
                    """
                })
        
        elif new_status == "PO_VALIDATED":
            # Notify finance team
            finance_emails = await self._get_users_by_role("FINANCE")
            for email in finance_emails:
                notifications.append({
                    "to": email,
                    "subject": f"Action Required: Budget Approval for Request #{request_id}",
                    "body": f"""
                    A Purchase Order has been validated and requires budget approval.
                    
                    Asset Type: {request.asset_type}
                    Estimated Cost: ${request.cost_estimate or 0}
                    
                    Please review and approve the budget allocation.
                    """
                })
        
        elif new_status == "PO_UPLOADED":
            # Notify procurement team to validate
            procurement_emails = await self._get_users_by_role("PROCUREMENT")
            for email in procurement_emails:
                notifications.append({
                    "to": email,
                    "subject": f"Action Required: PO Validation for Request #{request_id}",
                    "body": f"""
                    A Purchase Order has been uploaded for asset request #{request_id}.
                    Please review and validate the PO details.
                    """
                })

        elif new_status == "FINANCE_APPROVED":
            # Notify manager to give final confirmation
            managers = await self.db.execute(
                select(User).filter(User.position == "MANAGER", User.status == "ACTIVE")
            )
            manager_emails = [m.email for m in managers.scalars().all() if m.email]
            for email in manager_emails:
                notifications.append({
                    "to": email,
                    "subject": f"Manager Confirmation Required: Budget Approved - Request #{request_id}",
                    "body": f"""
                    Finance has approved the budget for asset request #{request_id}. 
                    Please provide your final confirmation to proceed with delivery.
                    """
                })
            # Also notify requester
            notifications.append({
                "to": requester_email,
                "subject": f"Budget Approved - Request #{request_id}",
                "body": f"Your asset request budget has been approved by Finance. Awaiting final manager confirmation."
            })

        elif new_status == "QC_PENDING":
            # Notify Asset Manager or IT Management to perform QC
            asset_manager_emails = await self._get_users_by_role("ASSET_MANAGER")
            it_emails = await self._get_users_by_role("IT_MANAGEMENT")
            target_emails = list(set(asset_manager_emails + it_emails))
            
            for email in target_emails:
                notifications.append({
                    "to": email,
                    "subject": f"Action Required: QC Check - Request #{request_id}",
                    "body": f"""
                    The asset for request #{request_id} has been delivered and requires a Quality check.
                    
                    Asset Type: {request.asset_type}
                    Model: {request.asset_model or 'N/A'}
                    """
                })

        elif new_status == "MANAGER_CONFIRMED_ASSIGNMENT":
            # Notify manager to formally finalize the assignment
            managers = await self.db.execute(
                select(User).filter(User.position == "MANAGER", User.status == "ACTIVE")
            )
            manager_emails = [m.email for m in managers.scalars().all() if m.email]
            for email in manager_emails:
                notifications.append({
                    "to": email,
                    "subject": f"Action Required: Finalize Assignment - Request #{request_id}",
                    "body": f"""
                    The requester has accepted the asset for request #{request_id}. 
                    Please formally fulfill the assignment in the dashboard.
                    """
                })

        elif new_status == "USER_ACCEPTANCE_PENDING":
            # Notify requester that asset is ready
            notifications.append({
                "to": requester_email,
                "subject": f"Asset Ready for Acceptance - Request #{request_id}",
                "body": f"""
                Your requested asset is ready for acceptance.
                
                Asset Type: {request.asset_type}
                Model: {request.asset_model or 'N/A'}
                
                Please inspect the asset and confirm acceptance.
                """
            })
        
        elif new_status == "IN_USE":
            # Notify requester that asset is assigned
            notifications.append({
                "to": requester_email,
                "subject": f"Asset Assigned - Request #{request_id}",
                "body": f"""
                Your asset has been successfully assigned and is now in use.
                
                Asset Type: {request.asset_type}
                Model: {request.asset_model or 'N/A'}
                
                Thank you for using the Asset Management System.
                """
            })
        
        # Send all notifications
        for notif in notifications:
            await self._simulate_email(**notif)
        
        return True
    
    async def notify_ticket_created(self, ticket_id: UUID):
        """Notify IT Management when a new support ticket is created"""
        from ..models.models import Ticket
        result = await self.db.execute(select(Ticket).filter(Ticket.id == ticket_id))
        ticket = result.scalars().first()
        if not ticket:
            return False
            
        requester = await self.db.execute(select(User).filter(User.id == ticket.requestor_id))
        requester_user = requester.scalars().first()
        
        it_emails = await self._get_users_by_role("IT_MANAGEMENT")
        body = f"""
        A new support ticket has been created.
        
        Ticket ID: {ticket_id}
        Requester: {requester_user.full_name if requester_user else 'Unknown'}
        Subject: {ticket.subject}
        Priority: {ticket.priority}
        
        Description:
        {ticket.description}
        """
        for email in it_emails:
            await self._simulate_email(
                to=email,
                subject=f"New Support Ticket: {ticket.subject}",
                body=body
            )
        return True

    async def notify_ticket_updated(self, ticket_id: UUID, status: str, updated_by: str, comment: str = None):
        """Notify requester when their ticket is updated (acknowledged/progress)"""
        from ..models.models import Ticket
        result = await self.db.execute(select(Ticket).filter(Ticket.id == ticket_id))
        ticket = result.scalars().first()
        if not ticket:
            return False
            
        requester_email = await self._get_user_email(ticket.requestor_id)
        if not requester_email:
            return False
            
        body = f"""
        Your support ticket has been updated.
        
        Ticket: {ticket.subject}
        New Status: {status}
        Updated By: {updated_by}
        
        Comment:
        {comment or 'No additional comments provided.'}
        """
        await self._simulate_email(
            to=requester_email,
            subject=f"Update on Support Ticket: {ticket.subject}",
            body=body
        )
        return True

    async def notify_ticket_resolved(self, ticket_id: UUID, resolution_notes: str = None):
        """Notify requester when their ticket is resolved"""
        from ..models.models import Ticket
        result = await self.db.execute(select(Ticket).filter(Ticket.id == ticket_id))
        ticket = result.scalars().first()
        if not ticket:
            return False
            
        requester_email = await self._get_user_email(ticket.requestor_id)
        if not requester_email:
            return False
            
        body = f"""
        Your support ticket has been formally resolved.
        
        Ticket: {ticket.subject}
        Resolution Notes:
        {resolution_notes or 'Your issue has been resolved.'}
        
        Thank you for your patience.
        """
        await self._simulate_email(
            to=requester_email,
            subject=f"Support Ticket Resolved: {ticket.subject}",
            body=body
        )
        return True

    async def notify_qc_failed(self, request_id: UUID) -> bool:
        """Notify PROCUREMENT and FINANCE when QC fails for a request."""
        result = await self.db.execute(select(AssetRequest).filter(AssetRequest.id == request_id))
        request = result.scalars().first()
        if not request:
            return False
        procurement_emails = await self._get_users_by_role("PROCUREMENT")
        finance_emails = await self._get_users_by_role("FINANCE")
        body = f"""
        QC failed for asset request #{request_id}.
        
        Asset Type: {request.asset_type}
        Model: {request.asset_model or 'N/A'}
        
        Please review and take action (e.g. return to vendor, reorder).
        """
        for email in procurement_emails:
            await self._simulate_email(to=email, subject=f"QC Failed - Request #{request_id}", body=body)
        for email in finance_emails:
            await self._simulate_email(to=email, subject=f"QC Failed - Request #{request_id}", body=body)
        return True


async def send_notification(
    db: AsyncSession,
    request_id: UUID,
    event_type: str,
    **kwargs
):
    """
    Convenience function to send notifications.
    
    Args:
        db: Database session
        request_id: ID of the asset request
        event_type: Type of event (submitted, status_change, etc.)
        **kwargs: Additional parameters for specific event types
    """
    service = NotificationService(db)
    
    if event_type == "submitted":
        await service.notify_request_submitted(request_id)
        await service.notify_manager_approval_required(request_id)
    
    elif event_type == "status_change":
        await service.notify_status_change(
            request_id=request_id,
            old_status=kwargs.get("old_status"),
            new_status=kwargs.get("new_status"),
            reviewer_name=kwargs.get("reviewer_name"),
            reason=kwargs.get("reason")
        )
    
    elif event_type == "ticket_created":
        await service.notify_ticket_created(request_id)
        
    elif event_type == "ticket_updated":
        await service.notify_ticket_updated(
            ticket_id=request_id,
            status=kwargs.get("status"),
            updated_by=kwargs.get("updated_by"),
            comment=kwargs.get("comment")
        )
        
    elif event_type == "ticket_resolved":
        await service.notify_ticket_resolved(
            ticket_id=request_id,
            resolution_notes=kwargs.get("resolution_notes")
        )
    
    return True
