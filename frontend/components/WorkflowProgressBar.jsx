import React from 'react';
import { Check, Clock, AlertCircle } from 'lucide-react';

const WorkflowProgressBar = ({ currentStatus, isByod = false, compact = false }) => {
    // Define the canonical steps for the Asset Lifecycle
    const steps = [
        { id: 'REQUEST', label: 'Requested', roles: ['END_USER'] },
        { id: 'APPROVAL', label: 'Review', roles: ['MANAGER', 'IT_MANAGEMENT'] },
        { id: 'PROCUREMENT', label: 'Procurement', roles: ['PROCUREMENT'], skipIf: isByod },
        { id: 'FINANCE', label: 'Finance', roles: ['FINANCE'], skipIf: isByod },
        { id: 'SETUP', label: isByod ? 'Compliance Scan' : 'Quality Check', roles: isByod ? ['IT_MANAGEMENT'] : ['INVENTORY'] },
        { id: 'VERIFY', label: 'Verification', roles: ['END_USER'] },
        { id: 'DEPLOYED', label: 'Deployed', roles: ['SYSTEM'] }
    ];

    // Status mapping to identify which semantic step is active
    const statusToStepId = {
        'SUBMITTED': 'REQUEST',
        'MANAGER_APPROVED': 'APPROVAL',
        'MANAGER_REJECTED': 'APPROVAL',
        'IT_APPROVED': 'APPROVAL',
        'IT_REJECTED': 'APPROVAL',
        'MANAGER_CONFIRMED_IT': isByod ? 'SETUP' : 'PROCUREMENT',
        'PROCUREMENT_REQUESTED': 'PROCUREMENT',
        'PO_UPLOADED': 'PROCUREMENT',
        'PO_VALIDATED': 'PROCUREMENT',
        'FINANCE_APPROVED': 'FINANCE',
        'MANAGER_CONFIRMED_BUDGET': 'FINANCE',
        'QC_PENDING': 'SETUP',
        'QC_FAILED': 'SETUP',
        'BYOD_COMPLIANCE_CHECK': 'SETUP',
        'USER_ACCEPTANCE_PENDING': 'VERIFY',
        'USER_REJECTED': 'VERIFY',
        'MANAGER_CONFIRMED_ASSIGNMENT': 'DEPLOYED',
        'IN_USE': 'DEPLOYED',
        'BYOD_REJECTED': 'SETUP',
        'CLOSED': 'DEPLOYED'
    };

    const statusStr = currentStatus != null ? String(currentStatus) : '';
    const visibleSteps = steps.filter((s) => !s.skipIf);
    const activeStepId = statusToStepId[statusStr] || 'REQUEST';

    // Find index in visible steps, fallback to 0
    let currentIndex = visibleSteps.findIndex(s => s.id === activeStepId);
    if (currentIndex === -1) currentIndex = 0;

    const isError = statusStr.includes('REJECTED') || statusStr.includes('FAILED');
    const currentStepLabel = visibleSteps[currentIndex]?.label ?? '—';

    return (
        <div className={`w-full ${compact ? 'py-3 px-2' : 'py-6 px-4'}`}>
            <div className="relative flex justify-between" style={compact ? { minHeight: 32 } : undefined}>
                {/* Background Line */}
                <div className="absolute top-1/2 left-0 w-full h-0.5 bg-slate-200 dark:bg-slate-700 -translate-y-1/2 z-0" />

                {/* Progress Line */}
                <div
                    className={`absolute top-1/2 left-0 h-0.5 transition-all duration-700 -translate-y-1/2 z-0 ${isError ? 'bg-red-500' : 'bg-indigo-500'}`}
                    style={{ width: `${(currentIndex / Math.max(1, visibleSteps.length - 1)) * 100}%` }}
                />

                {steps.map((step, index) => {
                    const isCompleted = index < currentIndex;
                    const isActive = index === currentIndex;
                    const isCurrentError = isActive && isError;

                    if (step.skipIf) return null;

                    return (
                        <div key={step.id} className="relative z-10 flex flex-col items-center flex-1 min-w-0 group">
                            {/* Dot */}
                            <div className={`flex-shrink-0 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${compact ? 'w-6 h-6' : 'w-8 h-8'} ${isCompleted ? (isError ? 'bg-red-500 border-red-500 text-app-text' : 'bg-indigo-500 border-indigo-500 text-app-text') :
                                isActive ? (isError ? 'bg-white border-red-500 text-red-500 scale-125' : 'bg-white border-indigo-500 text-indigo-500 scale-125 shadow-lg shadow-indigo-200') :
                                    'bg-white border-slate-200 text-app-text-muted border-slate-300'
                                }`}>
                                {isCompleted ? (
                                    <Check className={compact ? 'w-3 h-3' : 'w-4 h-4'} />
                                ) : isCurrentError ? (
                                    <AlertCircle className={compact ? 'w-3 h-3' : 'w-4 h-4'} />
                                ) : (
                                    <span className="text-[10px] font-bold">{index + 1}</span>
                                )}
                            </div>

                            {/* Per-step labels only in non-compact mode; they overlap in narrow cards so compact uses single line below */}
                            {!compact && (
                                <div className={`absolute -bottom-8 whitespace-nowrap text-[10px] font-bold uppercase tracking-wider transition-colors duration-300 ${isActive ? (isError ? 'text-red-500' : 'text-indigo-600') : 'text-app-text-muted'}`} title={step.label}>
                                    {step.label}
                                </div>
                            )}
                            {!compact && (
                                <div className="absolute -top-8 px-2 py-1 bg-slate-200 dark:bg-slate-700 dark:bg-slate-800 text-app-text text-[8px] rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap font-medium">
                                    Action by: {step.roles.join(', ')}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
            {/* Compact: single line below bar to avoid squashed/overlapping labels */}
            {compact && (
                <p className="text-center text-[10px] font-medium uppercase tracking-wider text-app-text-muted mt-2 min-h-[1.25rem] truncate px-1" title={currentStepLabel}>
                    Step {currentIndex + 1}: {currentStepLabel}
                </p>
            )}
        </div>
    );
};

export default WorkflowProgressBar;
