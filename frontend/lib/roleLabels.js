/**
 * Human-readable labels for system roles.
 */
export const ROLE_LABELS = {
    ASSET_INVENTORY_MANAGER: 'Inventory team',
    PROCUREMENT_MANAGER: 'Procurement',
    PROCUREMENT: 'Procurement',
    IT_MANAGEMENT: 'IT Management',
    END_USER: 'End user',
    MANAGER: 'Manager',
    FINANCE: 'Finance',
    SYSTEM_ADMIN: 'System admin',
    ASSET_OWNER: 'Asset owner',
    CUSTODIAN: 'Custodian',
    AUDIT_OFFICER: 'Audit officer',
};

export function getRoleLabel(role) {
    if (!role) return 'Unknown';
    const key = String(role).toUpperCase().replace(/\s/g, '_');
    return ROLE_LABELS[key] || role;
}
