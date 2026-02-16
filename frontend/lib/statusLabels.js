/**
 * Human-readable labels for asset request and ticket statuses.
 */
export const STATUS_LABELS = {
    REQUESTED: 'Submitted',
    MANAGER_APPROVED: 'Manager approved',
    IT_APPROVED: 'IT approved',
    MANAGER_CONFIRMED_IT: 'Manager confirmed IT',
    INVENTORY_APPROVED: 'Inventory approved',
    REJECTED: 'Rejected',
    PROCUREMENT_REQUIRED: 'Awaiting purchase',
    QC_PENDING: 'Quality check pending',
    USER_ACCEPTANCE_PENDING: 'Waiting for your confirmation',
    MANAGER_CONFIRMED_ASSIGNMENT: 'Manager confirmed assignment',
    BYOD_COMPLIANCE_CHECK: 'BYOD compliance check',
    FULFILLED: 'Fulfilled',
    CLOSED: 'Closed',
    IN_USE: 'In use',
    SUBMITTED: 'Submitted',
    OPEN: 'Open',
    IN_PROGRESS: 'In progress',
    RESOLVED: 'Resolved',
};

export function getStatusLabel(status) {
    if (!status) return 'Unknown';
    const key = String(status).toUpperCase().replace(/\s/g, '_');
    return STATUS_LABELS[key] || status.replace(/_/g, ' ');
}
