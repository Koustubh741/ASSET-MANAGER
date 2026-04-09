"""
State machine validation for AssetRequest workflow
Enforces valid state transitions according to enterprise ITSM workflow
"""

# Canonical description of the asset request lifecycle (phases, roles, statuses)
# is in docs/WORKFLOW_FINANCE_PROCUREMENT.md.
# Main phases: Request → Manager → IT → Manager Confirms IT → Inventory (allocate
# or route to Procurement) → Procurement (PO) → Finance (budget) → Procurement
# (delivery) → QC → User acceptance → FULFILLED/CLOSED.

from typing import Dict, List, Set

# Valid state transitions for AssetRequest
VALID_TRANSITIONS: Dict[str, Set[str]] = {
    "SUBMITTED": {"MANAGER_APPROVED", "MANAGER_REJECTED"},
    "MANAGER_APPROVED": {"IT_APPROVED", "IT_REJECTED"},
    "MANAGER_REJECTED": {"CLOSED"},  # Terminal state
    "IT_APPROVED": {"MANAGER_CONFIRMED_IT", "IT_REJECTED"},
    "MANAGER_CONFIRMED_IT": {
        "PROCUREMENT_REQUESTED",  # Company-owned, no inventory
        "BYOD_COMPLIANCE_CHECK",  # BYOD path
        "USER_ACCEPTANCE_PENDING",  # Company-owned, inventory available
    },
    "IT_REJECTED": {"CLOSED"},  # Terminal state
    "PROCUREMENT_REQUESTED": {"PO_UPLOADED", "PROCUREMENT_REJECTED", "PROCUREMENT_APPROVED"},  # Procurement uploads PO
    "PROCUREMENT_APPROVED": {"MANAGER_CONFIRMED_BUDGET", "QC_PENDING", "USER_ACCEPTANCE_PENDING"}, # Added shortcut state
    "PO_UPLOADED": {"PO_VALIDATED", "PO_REJECTED", "PROCUREMENT_APPROVED"},  # Procurement validates PO completeness
    "PO_VALIDATED": {"FINANCE_APPROVED", "FINANCE_REJECTED"},  # Finance validates budget
    "PO_REJECTED": {"CLOSED"},  # Terminal state
    "FINANCE_APPROVED": {"MANAGER_CONFIRMED_BUDGET", "FINANCE_REJECTED"},
    "MANAGER_CONFIRMED_BUDGET": {"QC_PENDING"},  # Manager confirms budget allocation
    "FINANCE_REJECTED": {"CLOSED"},  # Terminal state
    "PROCUREMENT_REJECTED": {"CLOSED"},  # Terminal state
    "QC_PENDING": {"QC_FAILED", "USER_ACCEPTANCE_PENDING"},
    "QC_FAILED": {"PROCUREMENT_REQUESTED"},  # Return to vendor, reorder
    "BYOD_COMPLIANCE_CHECK": {"BYOD_REJECTED", "IN_USE"},
    "BYOD_REJECTED": {"CLOSED"},  # Terminal state
    "USER_ACCEPTANCE_PENDING": {"USER_REJECTED", "MANAGER_CONFIRMED_ASSIGNMENT", "IN_USE"},
    "MANAGER_CONFIRMED_ASSIGNMENT": {"IN_USE"},  # Manager confirms final assignment
    "USER_REJECTED": {"CLOSED"},  # Terminal state
    "IN_USE": {"CLOSED"},  # Terminal state (normal closure)
    "CLOSED": set(),  # Terminal state - no further transitions
}

# Terminal states (workflow ends)
TERMINAL_STATES: Set[str] = {
    "MANAGER_REJECTED",
    "IT_REJECTED",
    "PROCUREMENT_REJECTED",
    "PO_REJECTED",
    "FINANCE_REJECTED",
    "BYOD_REJECTED",
    "USER_REJECTED",
    "CLOSED"
}

# States that require specific roles to transition from
ROLE_REQUIRED_STATES: Dict[str, str] = {
    "SUBMITTED": "MANAGER",  # Manager approval required
    "MANAGER_APPROVED": "IT_MANAGEMENT",  # IT approval required
    "IT_APPROVED": "MANAGER",  # Manager confirms IT decision
    "PROCUREMENT_REQUESTED": "PROCUREMENT",  # Procurement uploads PO
    "PO_UPLOADED": "PROCUREMENT",  # Procurement validates PO completeness
    "PO_VALIDATED": "FINANCE",  # Finance validates budget
    "FINANCE_APPROVED": "MANAGER",  # Manager confirms budget allocation
    "QC_PENDING": "ASSET_MANAGER",  # QC performed by inventory manager
    "USER_ACCEPTANCE_PENDING": "END_USER",  # User must accept/reject
    "MANAGER_CONFIRMED_ASSIGNMENT": "MANAGER",  # Manager confirms final assignment
}


def is_valid_transition(current_status: str, new_status: str) -> bool:
    """
    Check if transition from current_status to new_status is valid
    
    Args:
        current_status: Current state of the asset request
        new_status: Desired new state
        
    Returns:
        True if transition is valid, False otherwise
    """
    if current_status not in VALID_TRANSITIONS:
        return False
    
    return new_status in VALID_TRANSITIONS[current_status]


def get_valid_next_states(current_status: str) -> Set[str]:
    """
    Get all valid next states from current status
    
    Args:
        current_status: Current state of the asset request
        
    Returns:
        Set of valid next states
    """
    return VALID_TRANSITIONS.get(current_status, set())


def is_terminal_state(status: str) -> bool:
    """
    Check if a state is terminal (workflow ends)
    
    Args:
        status: State to check
        
    Returns:
        True if terminal, False otherwise
    """
    return status in TERMINAL_STATES


def get_required_role_for_transition(current_status: str) -> str:
    """
    Get the role required to transition from current status
    
    Args:
        current_status: Current state
        
    Returns:
        Role name required, or empty string if no specific role required
    """
    return ROLE_REQUIRED_STATES.get(current_status, "")


def validate_state_transition(
    current_status: str,
    new_status: str,
    user_role: str,
    asset_ownership_type: str = None
) -> tuple[bool, str]:
    """
    Comprehensive validation of state transition
    
    Args:
        current_status: Current state
        new_status: Desired new state
        user_role: Role of user attempting transition
        asset_ownership_type: Type of asset (COMPANY_OWNED | BYOD)
        
    Returns:
        Tuple of (is_valid, error_message)
    """
    # Check if transition is valid
    if not is_valid_transition(current_status, new_status):
        return False, f"Invalid transition from {current_status} to {new_status}"
    
    # Check if current state is terminal
    if is_terminal_state(current_status):
        return False, f"Cannot transition from terminal state {current_status}"
    
    # Check role requirements
    required_role = get_required_role_for_transition(current_status)
    if required_role:
        # Admin and System Admin can perform any transition
        if user_role == "ADMIN":
            pass
        # Special handling for MANAGER role (END_USER with position=MANAGER)
        elif required_role == "MANAGER":
            if user_role not in ["END_USER", "MANAGER"]:  # Will be checked separately for position
                return False, f"Transition from {current_status} requires MANAGER role"
        elif required_role in ["IT_MANAGEMENT", "ASSET_MANAGER", "PROCUREMENT", "FINANCE"]:
            if user_role not in ["SUPPORT", "ADMIN", required_role]: # Keep required_role for backwards compatibility testing
                return False, f"Transition from {current_status} requires {required_role} functional scope (SUPPORT role)"
        elif user_role != required_role:
            return False, f"Transition from {current_status} requires {required_role} role"
    
    # Validate asset type specific transitions
    if current_status == "IT_APPROVED":
        # MANAGER_CONFIRMED_IT allowed for BYOD - service immediately routes to BYOD_COMPLIANCE_CHECK
        if asset_ownership_type == "BYOD" and new_status not in {"BYOD_COMPLIANCE_CHECK", "IN_USE", "MANAGER_CONFIRMED_IT"}:
            return False, "BYOD requests must go through compliance check"
        elif asset_ownership_type == "COMPANY_OWNED" and new_status == "BYOD_COMPLIANCE_CHECK":
            return False, "Company-owned assets cannot go through BYOD compliance check"
    
    return True, ""

