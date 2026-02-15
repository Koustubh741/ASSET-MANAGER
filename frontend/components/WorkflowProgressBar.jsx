import React from 'react';
import { Check, Clock, AlertCircle } from 'lucide-react';

const WorkflowProgressBar = ({ currentStatus, isByod = false }) => {
    // Define the canonical steps for the Asset Lifecycle
    const steps = [
        { id: 'SUBMITTED', label: 'Requested', roles: ['END_USER'] },
        { id: 'MANAGER_APPROVED', label: 'Management', roles: ['MANAGER'] },
        { id: 'IT_APPROVED', label: 'IT Validation', roles: ['IT_MANAGEMENT'] },
        { id: 'LOGIC', label: 'Inventory/Procurement', roles: ['SYSTEM'] },
        { id: 'QC_PENDING', label: 'Quality Check', roles: ['INVENTORY'], skipIf: isByod },
        { id: 'USER_ACCEPTANCE_PENDING', label: 'User Verification', roles: ['END_USER'] },
        { id: 'IN_USE', label: 'Deployed', roles: ['SYSTEM'] }
    ];

    // Status mapping to identify which step is active
    const statusToStepIndex = {
        'SUBMITTED': 0,
        'MANAGER_APPROVED': 1,
        'MANAGER_REJECTED': 1,
        'IT_APPROVED': 2,
        'IT_REJECTED': 2,
        'MANAGER_CONFIRMED_IT': 3,
        'PROCUREMENT_REQUESTED': 3,
        'PO_UPLOADED': 3,
        'PO_VALIDATED': 3,
        'FINANCE_APPROVED': 3,
        'MANAGER_CONFIRMED_BUDGET': 3,
        'QC_PENDING': 4,
        'QC_FAILED': 4,
        'USER_ACCEPTANCE_PENDING': 5,
        'USER_REJECTED': 5,
        'MANAGER_CONFIRMED_ASSIGNMENT': 6,
        'IN_USE': 6,
        'BYOD_COMPLIANCE_CHECK': 4, // Maps to QC phase for BYOD
        'CLOSED': 6
    };

    const currentIndex = statusToStepIndex[currentStatus] ?? 0;
    const isError = currentStatus.includes('REJECTED') || currentStatus.includes('FAILED');

    return (
        <div className="w-full py-6 px-4">
            <div className="relative flex justify-between">
                {/* Background Line */}
                <div className="absolute top-1/2 left-0 w-full h-0.5 bg-slate-100 -translate-y-1/2 z-0" />

                {/* Progress Line */}
                <div
                    className={`absolute top-1/2 left-0 h-0.5 transition-all duration-700 -translate-y-1/2 z-0 ${isError ? 'bg-red-500' : 'bg-indigo-500'}`}
                    style={{ width: `${(currentIndex / (steps.length - 1)) * 100}%` }}
                />

                {steps.map((step, index) => {
                    const isCompleted = index < currentIndex;
                    const isActive = index === currentIndex;
                    const isCurrentError = isActive && isError;

                    if (step.skipIf) return null;

                    return (
                        <div key={step.id} className="relative z-10 flex flex-col items-center group">
                            {/* Dot */}
                            <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${isCompleted ? (isError ? 'bg-red-500 border-red-500 text-white' : 'bg-indigo-500 border-indigo-500 text-white') :
                                    isActive ? (isError ? 'bg-white border-red-500 text-red-500 scale-125' : 'bg-white border-indigo-500 text-indigo-500 scale-125 shadow-lg shadow-indigo-200') :
                                        'bg-white border-slate-200 text-slate-300'
                                }`}>
                                {isCompleted ? (
                                    <Check className="w-4 h-4" />
                                ) : isCurrentError ? (
                                    <AlertCircle className="w-4 h-4" />
                                ) : (
                                    <span className="text-xs font-bold">{index + 1}</span>
                                )}
                            </div>

                            {/* Label */}
                            <div className={`absolute -bottom-8 whitespace-nowrap text-[10px] font-bold uppercase tracking-wider transition-colors duration-300 ${isActive ? (isError ? 'text-red-500' : 'text-indigo-600') :
                                    isCompleted ? 'text-slate-600' : 'text-slate-400'
                                }`}>
                                {step.label}
                            </div>

                            {/* Role Tooltip */}
                            <div className="absolute -top-8 px-2 py-1 bg-slate-800 text-white text-[8px] rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap font-medium">
                                Action by: {step.roles.join(', ')}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default WorkflowProgressBar;
