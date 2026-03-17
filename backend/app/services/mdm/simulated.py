"""Simulated MDM adapter for dev/test - uses policy engine."""
from typing import Dict, Any
from uuid import UUID

from .base import MDMAdapter
from ..policy_engine import evaluate_compliance


class SimulatedMDMAdapter(MDMAdapter):
    """Simulated MDM - evaluates against policy engine, no real MDM integration."""

    async def enroll_and_check(
        self,
        device_id: UUID,
        device_model: str,
        os_version: str,
        security_policies: Dict[str, Any] = None,
    ) -> Dict[str, Any]:
        result = evaluate_compliance(
            device_model=device_model,
            os_version=os_version,
            force_compliant=False,
        )
        return {
            "success": True,
            "device_id": str(device_id),
            "mdm_enrolled": True,
            "compliance_status": "COMPLIANT" if result["all_compliant"] else "NON_COMPLIANT",
            "compliance_checks": result["compliance_checks"],
            "remediation_steps": result.get("remediation_steps", []),
            "policies_applied": security_policies or {},
            "enrollment_date": __import__("datetime").datetime.now().isoformat(),
            "platform": result.get("platform", "unknown"),
        }
