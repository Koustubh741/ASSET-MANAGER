import React, { useState, useEffect } from 'react';
import { X, CheckCircle, AlertTriangle } from 'lucide-react';
import apiClient from '../lib/apiClient';
import { useRole } from '../contexts/RoleContext';

const ManagerApprovalModal = ({ isOpen, onClose, request, onUpdate }) => {
    const { user } = useRole();
    const [comment, setComment] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!isOpen) return;
        const onEscape = (e) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', onEscape);
        return () => window.removeEventListener('keydown', onEscape);
    }, [isOpen, onClose]);

    if (!isOpen || !request) return null;

    // Determine the type of approval based on status
    const getApprovalType = () => {
        if (request.status === 'SUBMITTED') return 'INITIAL_APPROVAL';
        if (request.status === 'IT_APPROVED') return 'CONFIRM_IT';
        if (request.status === 'FINANCE_APPROVED') return 'CONFIRM_BUDGET';
        if (request.status === 'USER_ACCEPTANCE_PENDING' && request.user_acceptance_status === 'ACCEPTED') return 'CONFIRM_ASSIGNMENT';
        if (request.status === 'MANAGER_CONFIRMED_ASSIGNMENT') return 'CONFIRM_ASSIGNMENT'; // Handle post-acceptance
        return 'UNKNOWN';
    };

    const approvalType = getApprovalType();

    const getTitle = () => {
        switch (approvalType) {
            case 'INITIAL_APPROVAL': return 'Approve New Request';
            case 'CONFIRM_IT': return 'Confirm IT Approval';
            case 'CONFIRM_BUDGET': return 'Confirm Budget Allocation';
            case 'CONFIRM_ASSIGNMENT': return 'Finalize Asset Assignment';
            default: return 'Manager Action';
        }
    };

    const getDescription = () => {
        switch (approvalType) {
            case 'INITIAL_APPROVAL':
                return `Initial approval for ${request.asset_name} for ${request.requester_name}.`;
            case 'CONFIRM_IT':
                return `IT has approved this request. Confirm to proceed to ${request.asset_ownership_type === 'COMPANY_OWNED' ? 'Inventory/Procurement' : 'BYOD Compliance'}.`;
            case 'CONFIRM_BUDGET':
                return `Finance has approved the budget. Confirm to proceed to Quality Check.`;
            case 'CONFIRM_ASSIGNMENT':
                return `User has accepted the asset. Confirm to mark as In Use.`;
            default: return '';
        }
    };

    const handleAction = async (decision) => {
        setIsSubmitting(true);
        setError(null);

        try {
            const managerId = user?.id;
            const managerName = user?.full_name || user?.name || user?.email;

            if (decision === 'REJECT' && !comment) {
                throw new Error('Reason is required for rejection');
            }

            const payload = {
                manager_id: managerId,
                manager_name: managerName,
                decision: decision === 'APPROVE' ? 'CONFIRM' : 'REJECT', // Map APPROVE -> CONFIRM for new endpoints
                reason: comment || null
            };

            // Initial approval uses different payload structure
            if (approvalType === 'INITIAL_APPROVAL') {
                if (decision === 'APPROVE') {
                    await apiClient.managerApproveRequest(request.id, { manager_id: managerId });
                } else {
                    await apiClient.managerRejectRequest(request.id, { manager_id: managerId, reason: comment });
                }
            }
            // New multi-stage confirmations
            else if (approvalType === 'CONFIRM_IT') {
                await apiClient.managerConfirmIT(request.id, payload);
            }
            else if (approvalType === 'CONFIRM_BUDGET') {
                await apiClient.managerConfirmBudget(request.id, payload);
            }
            else if (approvalType === 'CONFIRM_ASSIGNMENT') {
                await apiClient.managerConfirmAssignment(request.id, payload);
            }

            onUpdate();
            onClose();
        } catch (err) {
            setError(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-none shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">

                {/* Header */}
                <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex justify-between items-center">
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-800 flex items-center gap-2">
                        <CheckCircle className="w-5 h-5 text-indigo-600" />
                        {getTitle()}
                    </h3>
                    <button onClick={onClose} className="text-app-text-muted hover:text-app-text-muted transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded" aria-label="Close modal" title="Close">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-4">
                    <div className="bg-blue-50 text-blue-800 text-sm p-3 rounded-none border border-blue-100 flex gap-2">
                        <AlertTriangle className="w-5 h-5 shrink-0" />
                        <p>{getDescription()}</p>
                    </div>

                    {/* Requester Info */}
                    <div className="bg-slate-50 p-3 rounded-none border border-slate-200">
                        <label className="text-[10px] uppercase font-bold text-app-text-muted block mb-2">Requester Details</label>
                        <div className="space-y-1">
                            <div className="flex justify-between text-xs">
                                <span className="text-app-text-muted">Name:</span>
                                <span className="font-bold text-slate-900 dark:text-slate-800">{request.requester_name}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                                <span className="text-app-text-muted">Department:</span>
                                <span className="font-medium text-indigo-600">{request.requester_department || 'General'}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                                <span className="text-app-text-muted">Email:</span>
                                <span className="text-app-text-muted italic">{request.requester_email || 'N/A'}</span>
                            </div>
                        </div>
                    </div>

                    {error && (
                        <div className="bg-red-50 text-red-600 text-sm p-3 rounded-none border border-red-100">
                            {error}
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            Comments / Reason {approvalType === 'INITIAL_APPROVAL' ? '(Required for Rejection)' : '(Optional)'}
                        </label>
                        <textarea
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            className="w-full px-3 py-2 border border-slate-300 rounded-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 min-h-[100px] resize-none"
                            placeholder="Enter notes here..."
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="bg-slate-50 px-6 py-4 border-t border-slate-100 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        disabled={isSubmitting}
                        className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-none transition-colors"
                    >
                        Cancel
                    </button>

                    <button
                        onClick={() => handleAction('REJECT')}
                        disabled={isSubmitting}
                        className="px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 border border-transparent hover:border-red-200 rounded-none transition-colors"
                    >
                        Reject
                    </button>

                    <button
                        onClick={() => handleAction('APPROVE')}
                        disabled={isSubmitting}
                        className="px-4 py-2 text-sm font-medium text-app-text bg-indigo-600 hover:bg-indigo-700 rounded-none shadow-sm hover:shadow transition-all flex items-center gap-2"
                    >
                        {isSubmitting ? 'Processing...' : 'Confirm Approval'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ManagerApprovalModal;
