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
        <div className={`w-full ${compact ? 'py-4' : 'py-8'}`}>
            <div className="relative flex justify-between" style={compact ? { minHeight: 40 } : undefined}>
                {/* Background Line (Technical Segmented Style) */}
                <div className="absolute top-1/2 left-0 w-full h-[1px] bg-white/10 -translate-y-1/2 z-0" />

                {/* Progress Line */}
                <div
                    className={`absolute top-1/2 left-0 h-[2px] transition-all duration-700 -translate-y-1/2 z-0 ${isError ? 'bg-danger shadow-[0_0_8px_var(--color-danger)]' : 'bg-primary shadow-[0_0_8px_var(--color-primary)]'}`}
                    style={{ width: `${(currentIndex / Math.max(1, visibleSteps.length - 1)) * 100}%` }}
                />

                {visibleSteps.map((step, index) => {
                    const isCompleted = index < currentIndex;
                    const isActive = index === currentIndex;
                    const isCurrentError = isActive && isError;

                    return (
                        <div key={step.id} className="relative z-10 flex flex-col items-center flex-1 min-w-0 group">
                            {/* Technical Checkpoint */}
                            <div className={`flex-shrink-0 border transition-all duration-500 relative flex items-center justify-center
                                ${compact ? 'w-5 h-5' : 'w-7 h-7'} 
                                ${isCompleted 
                                    ? (isError ? 'bg-danger border-danger text-white' : 'bg-primary border-primary text-white shadow-[0_0_15px_rgba(var(--color-primary-rgb),0.3)]') 
                                    : isActive 
                                        ? (isError ? 'bg-danger/20 border-danger text-danger scale-110 animate-pulse' : 'bg-primary/20 border-primary text-primary scale-110 shadow-[0_0_20px_rgba(var(--color-primary-rgb),0.4)] animate-glow') 
                                        : 'bg-app-surface border-white/10 text-app-text-muted hover:border-white/30'
                                }
                                !rounded-none
                            `}>
                                {/* Sharp Corner Accents for Active */}
                                {isActive && (
                                    <>
                                        <div className="absolute -top-1.5 -left-1.5 w-2 h-2 border-t-2 border-l-2 border-primary"></div>
                                        <div className="absolute -bottom-1.5 -right-1.5 w-2 h-2 border-b-2 border-r-2 border-primary"></div>
                                    </>
                                )}

                                {isCompleted ? (
                                    <Check className={compact ? 'w-3 h-3' : 'w-4 h-4'} strokeWidth={3} />
                                ) : isCurrentError ? (
                                    <AlertCircle className={compact ? 'w-3 h-3' : 'w-4 h-4'} strokeWidth={3} />
                                ) : (
                                    <span className={`font-mono leading-none ${compact ? 'text-[8px]' : 'text-[10px]'} font-bold`}>
                                        {index + 1}
                                    </span>
                                )}
                            </div>

                            {/* Labels */}
                            {!compact && (
                                <div className={`absolute -bottom-10 whitespace-nowrap text-[9px] font-bold uppercase tracking-[0.2em] transition-colors duration-300 
                                    ${isActive ? (isError ? 'text-danger' : 'text-primary') : 'text-app-text-muted/60'}`} 
                                    title={step.label}>
                                    {step.label}
                                </div>
                            )}

                            {/* Role Tooltip */}
                            {!compact && (
                                <div className="absolute -top-10 px-3 py-1 bg-app-surface border border-white/10 text-app-text text-[8px] opacity-0 group-hover:opacity-100 transition-all pointer-events-none whitespace-nowrap font-mono tracking-tighter translate-y-2 group-hover:translate-y-0">
                                    <span className="text-primary/60 mr-2">[AUTH_REQ]</span> {step.roles.join(' | ')}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {compact && (
                <div className="mt-4 flex items-center justify-center gap-2">
                    <div className={`text-[9px] font-bold uppercase tracking-[0.3em] px-2 py-0.5 border-y border-white/5 
                                    ${isError ? 'text-danger bg-danger/5' : 'text-primary bg-primary/5'}`}>
                        {currentStepLabel}
                    </div>
                </div>
            )}

            <style jsx>{`
                @keyframes glow {
                    0%, 100% { box-shadow: 0 0 5px rgba(var(--color-primary), 0.2); }
                    50% { box-shadow: 0 0 15px rgba(var(--color-primary), 0.5); }
                }
                .animate-glow {
                    animation: glow 2s ease-in-out infinite;
                }
            `}</style>
        </div>
    );
};

export default WorkflowProgressBar;
