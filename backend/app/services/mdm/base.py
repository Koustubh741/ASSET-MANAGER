"""Base MDM adapter interface."""
from abc import ABC, abstractmethod
from typing import Dict, Any
from uuid import UUID


class MDMAdapter(ABC):
    """Abstract MDM adapter for device enrollment and compliance."""

    @abstractmethod
    async def enroll_and_check(
        self,
        device_id: UUID,
        device_model: str,
        os_version: str,
        security_policies: Dict[str, Any] = None,
    ) -> Dict[str, Any]:
        """
        Enroll device (if needed) and run compliance check.

        Returns:
            Dict with success, compliance_status, compliance_checks, policies_applied, etc.
        """
        pass
