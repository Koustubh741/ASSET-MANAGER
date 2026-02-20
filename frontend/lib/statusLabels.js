/**
 * Human-readable labels for asset request and ticket statuses.
 */
export const STATUS_LABELS = {
    REQUESTED: 'Submitted',
    MANAGER_APPROVED: 'Manager approved',
    MANAGER_REJECTED: 'Manager rejected',
    IT_APPROVED: 'IT approved',
    IT_REJECTED: 'IT rejected',
    MANAGER_CONFIRMED_IT: 'Manager confirmed IT',
    INVENTORY_APPROVED: 'Inventory approved',
    REJECTED: 'Rejected',
    PROCUREMENT_REQUIRED: 'Awaiting purchase',
    PROCUREMENT_REQUESTED: 'Procurement requested',
    PROCUREMENT_APPROVED: 'Procurement approved',
    PROCUREMENT_REJECTED: 'Procurement rejected',
    QC_PENDING: 'Quality check pending',
    QC_FAILED: 'QC failed',
    USER_ACCEPTANCE_PENDING: 'Waiting for your confirmation',
    USER_REJECTED: 'User rejected',
    MANAGER_CONFIRMED_ASSIGNMENT: 'Manager confirmed assignment',
    MANAGER_CONFIRMED_BUDGET: 'Manager confirmed budget',
    BYOD_COMPLIANCE_CHECK: 'BYOD compliance check',
    BYOD_REJECTED: 'BYOD rejected',
    FULFILLED: 'Fulfilled',
    CLOSED: 'Closed',
    IN_USE: 'In use',
    SUBMITTED: 'Submitted',
    FINANCE_APPROVED: 'Finance approved',
    OPEN: 'Open',
    IN_PROGRESS: 'In progress',
    RESOLVED: 'Resolved',
};

export function getStatusLabel(status) {
    if (!status) return 'Unknown';
    const key = String(status).toUpperCase().replace(/\s/g, '_');
    return STATUS_LABELS[key] || status.replace(/_/g, ' ');
}
