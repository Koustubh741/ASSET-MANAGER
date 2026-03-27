from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func, case
from datetime import datetime, timedelta
from typing import Dict, Any

from ..models.models import Asset, Ticket, PurchaseOrder, VulnerabilityMapping, SystemPatch

class ExecutiveService:
    @staticmethod
    async def get_executive_summary(db: AsyncSession) -> Dict[str, Any]:
        """
        Aggregates data for the CEO/CXO dashboard.
        """
        # 1. Security Metrics
        vuln_result = await db.execute(
            select(func.count(VulnerabilityMapping.id))
            .join(SystemPatch, VulnerabilityMapping.patch_id == SystemPatch.id)
            .where(VulnerabilityMapping.remediated_at == None, SystemPatch.severity == "Critical")
        )
        critical_unpatched = vuln_result.scalar_one() or 0
        
        security_score = max(100 - (critical_unpatched * 5), 0)

        # 2. Operational Metrics (MTTR)
        ticket_result = await db.execute(
            select(Ticket.created_at, Ticket.updated_at)
            .where(Ticket.status.in_(["RESOLVED", "CLOSED"]))
            .where(Ticket.updated_at >= datetime.utcnow() - timedelta(days=30))
        )
        resolved_tickets = ticket_result.all()
        
        avg_mttr = 0.0
        if resolved_tickets:
            total_hours = sum((t.updated_at - t.created_at).total_seconds() / 3600 for t in resolved_tickets)
            avg_mttr = total_hours / len(resolved_tickets)
        
        ops_score = max(100 - (avg_mttr * 1.5), 0)

        # 3. Financial Metrics
        # budget estimation (mocked or from a settings table if exists, otherwise sum of all POs expected)
        po_result = await db.execute(select(func.sum(PurchaseOrder.total_cost)))
        actual_spend = po_result.scalar_one() or 0.0
        
        # Assume a target monthly budget for the fleet based on asset count (e.g. $50k)
        target_budget = 50000.0 
        budget_utilization = (actual_spend / target_budget * 100) if target_budget > 0 else 100
        financial_score = max(100 - abs(100 - budget_utilization), 0)

        # 4. Final Fleet Health Index
        health_index = (security_score * 0.4) + (ops_score * 0.3) + (financial_score * 0.3)

        # 5. Asset Distribution & Status
        asset_dist_result = await db.execute(select(Asset.type, func.count(Asset.id)).group_by(Asset.type))
        asset_distribution = {row[0]: row[1] for row in asset_dist_result.all()}
        
        status_result = await db.execute(select(Asset.status, func.count(Asset.id)).group_by(Asset.status))
        status_distribution = {row[0]: row[1] for row in status_result.all()}

        # 6. Departmental Metrics (CEO-specific)
        from ..models.models import Department, User as UserModel
        
        dept_spend_result = await db.execute(
            select(Department.name, func.sum(Asset.cost))
            .join(UserModel, UserModel.department_id == Department.id)
            .join(Asset, Asset.assigned_to_id == UserModel.id)
            .group_by(Department.name)
        )
        department_spend = {row[0]: round(row[1], 2) for row in dept_spend_result.all() if row[1] is not None}

        # 7. Departmental Risk (Unpatched Vulns per Dept)
        dept_risk_result = await db.execute(
            select(Department.name, func.count(VulnerabilityMapping.id))
            .join(UserModel, UserModel.department_id == Department.id)
            .join(Asset, Asset.assigned_to_id == UserModel.id)
            .join(VulnerabilityMapping, VulnerabilityMapping.asset_id == Asset.id)
            .where(VulnerabilityMapping.remediated_at == None)
            .group_by(Department.name)
        )
        department_risk = {row[0]: row[1] for row in dept_risk_result.all()}

        # 8. Upcoming Renewals (Financial Risk)
        renewal_result = await db.execute(
            select(func.count(Asset.id))
            .where(Asset.warranty_expiry <= datetime.utcnow() + timedelta(days=90))
            .where(Asset.status.in_(["Active", "In Use"]))
        )
        upcoming_renewals = renewal_result.scalar_one() or 0

        return {
            "health_index": round(health_index, 1),
            "scores": {
                "security": round(security_score, 1),
                "operations": round(ops_score, 1),
                "financial": round(financial_score, 1)
            },
            "kpis": {
                "critical_vulnerabilities": critical_unpatched,
                "avg_mttr_hours": round(avg_mttr, 1),
                "total_spend": round(actual_spend, 2),
                "upcoming_renewals": upcoming_renewals
            },
            "asset_distribution": asset_distribution,
            "status_distribution": status_distribution,
            "departmental_analytics": {
                "spend": department_spend,
                "risk": department_risk
            },
            "timestamp": datetime.utcnow().isoformat()
        }
