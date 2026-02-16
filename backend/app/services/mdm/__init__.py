import os
from .base import MDMAdapter
from .simulated import SimulatedMDMAdapter

__all__ = ["MDMAdapter", "SimulatedMDMAdapter", "get_mdm_adapter"]


def get_mdm_adapter(provider: str = None) -> MDMAdapter:
    """Get MDM adapter by provider. Default: SimulatedMDMAdapter."""
    provider = (provider or os.environ.get("MDM_PROVIDER", "simulated")).lower()
    if provider == "simulated":
        return SimulatedMDMAdapter()
    # Future: elif provider == "intune": return IntuneAdapter()
    return SimulatedMDMAdapter()
