import React, { useState, useEffect } from 'react';
import { 
    X, CheckCircle, AlertTriangle, ShieldCheck, 
    Clock, Tooltip, Info, Package, User, 
    ArrowRight, ChevronRight, FileText, Upload,
    Check, SkipForward
} from 'lucide-react';
import apiClient from '../lib/apiClient';
import { useRole } from '../contexts/RoleContext';
import WorkflowProgressBar from './WorkflowProgressBar';

const WorkflowActionPanel = ({ isOpen, onClose, request, onUpdate }) => {
    const { user, isManagerial, isITStaff, isFinanceStaff, isProcurementStaff } = useRole();
    const [comment, setComment] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState(null);
    const [extraData, setExtraData] = useState({});

    useEffect(() => {
        if (!isOpen) return;
        const onEscape = (e) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', onEscape);
        return () => window.removeEventListener('keydown', onEscape);
    }, [isOpen, onClose]);

    if (!isOpen || !request) return null;

    // Determine the type of action based on status and user role
    const getActionContext = () => {
        const status = request.status;
        
        if (isManagerial) {
            if (status === 'SUBMITTED') return { type: 'INITIAL_APPROVAL', title: 'Managerial Gate', icon: CheckCircle, color: 'text-indigo-500' };
            if (status === 'IT_APPROVED') return { type: 'CONFIRM_IT', title: 'IT Validation Confirmation', icon: ShieldCheck, color: 'text-emerald-500' };
            if (status === 'FINANCE_APPROVED') return { type: 'CONFIRM_BUDGET', title: 'Budget Allocation Confirmation', icon: AlertTriangle, color: 'text-warning' };
            if (status === 'USER_ACCEPTANCE_PENDING' && request.user_acceptance_status === 'ACCEPTED') return { type: 'CONFIRM_ASSIGNMENT', title: 'Final Assignment Relay', icon: Package, color: 'text-primary' };
        }

        if (isITStaff) {
            if (status === 'MANAGER_APPROVED') return { type: 'IT_REVIEW', title: 'Technical Assessment', icon: ShieldCheck, color: 'text-emerald-500' };
            if (status === 'BYOD_COMPLIANCE_CHECK') return { type: 'BYOD_COMPLIANCE', title: 'Security Scan Protocol', icon: ShieldCheck, color: 'text-emerald-500' };
        }

        if (isProcurementStaff) {
            if (status === 'PROCUREMENT_REQUIRED' || status === 'PROCUREMENT_REQUESTED') return { type: 'PROCUREMENT_PROCESS', title: 'Supply Chain Execution', icon: FileText, color: 'text-warning' };
        }

        if (isFinanceStaff) {
            if (status === 'PO_VALIDATED') return { type: 'FINANCE_AUDIT', title: 'Fiscal Verification', icon: AlertTriangle, color: 'text-indigo-500' };
        }

        return { type: 'VIEW_ONLY', title: 'Request Telemetry', icon: Info, color: 'text-app-text-muted' };
    };

    const ctx = getActionContext();

    const handleAction = async (decision) => {
        setIsSubmitting(true);
        setError(null);

        try {
            const userId = user?.id;
            const userName = user?.full_name || user?.name || user?.email;

            if (decision === 'REJECT' && !comment) {
                throw new Error('Reason is required for rejection');
            }

            const payload = {
                decision: decision === 'APPROVE' ? 'CONFIRM' : 'REJECT',
                reason: comment || null,
                ...extraData
            };

            switch (ctx.type) {
                case 'INITIAL_APPROVAL':
                    if (decision === 'APPROVE') await apiClient.managerApproveRequest(request.id);
                    else await apiClient.managerRejectRequest(request.id, { reason: comment });
                    break;
                case 'IT_REVIEW':
                    if (decision === 'APPROVE') await apiClient.itApproveRequest(request.id, { approval_comment: comment });
                    else await apiClient.itRejectRequest(request.id, { reason: comment });
                    break;
                case 'CONFIRM_IT':
                    await apiClient.managerConfirmIT(request.id, payload);
                    break;
                case 'CONFIRM_BUDGET':
                    await apiClient.managerConfirmBudget(request.id, payload);
                    break;
                case 'CONFIRM_ASSIGNMENT':
                    await apiClient.managerConfirmAssignment(request.id, payload);
                    break;
                case 'BYOD_COMPLIANCE':
                    await apiClient.byodComplianceCheck(request.id);
                    break;
                case 'PROCUREMENT_PROCESS':
                    // If decision is approve, we might need delivery confirmation or PO upload logic here
                    if (decision === 'APPROVE') await apiClient.procurementApproveRequest(request.id);
                    else await apiClient.procurementRejectRequest(request.id, { reason: comment });
                    break;
                case 'FINANCE_AUDIT':
                    if (decision === 'APPROVE') await apiClient.financeApproveRequest(request.id);
                    else await apiClient.financeRejectRequest(request.id, { reason: comment });
                    break;
                default:
                    throw new Error('No action defined for this state/role.');
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-app-void/80 backdrop-blur-md">
            <div className="w-full max-w-2xl bg-app-surface border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-300">
                
                {/* Visual Header / Status Bar */}
                <div className="h-1 bg-white/5 w-full relative">
                    <div className={`absolute top-0 left-0 h-full transition-all duration-1000 bg-primary shadow-[0_0_10px_var(--color-primary)]`} style={{ width: '40%' }}></div>
                </div>

                <div className="p-6 flex justify-between items-start border-b border-white/5">
                    <div className="flex items-center gap-4">
                        <div className={`p-3 bg-white/5 border border-white/10 ${ctx.color} shadow-[0_0_15px_rgba(255,255,255,0.05)]`}>
                            <ctx.icon size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold uppercase tracking-[0.2em]">{ctx.title}</h2>
                            <div className="flex items-center gap-2 mt-1">
                                <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></div>
                                <span className="text-[10px] font-mono text-app-text-muted uppercase tracking-tighter">SIG_ID: {request.id}</span>
                            </div>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/5 transition-colors group">
                        <X className="text-app-text-muted group-hover:text-white transition-colors" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
                    
                    {/* SLA & Stage Telemetry */}
                    <div className="grid grid-cols-3 gap-1">
                        <div className="bg-white/5 p-4 border border-white/5 flex flex-col gap-1">
                            <span className="text-[9px] font-bold text-app-text-muted uppercase tracking-widest">Stage_Age</span>
                            <span className="text-xl font-mono text-primary">{request.days_in_current_status ?? 0} <small className="text-[10px] text-app-text-muted">DAYS</small></span>
                        </div>
                        <div className="bg-white/5 p-4 border border-white/5 flex flex-col gap-1">
                            <span className="text-[9px] font-bold text-app-text-muted uppercase tracking-widest">SLA_Policy</span>
                            <span className="text-xs font-bold text-success uppercase">ENFORCED_GREEN</span>
                        </div>
                        <div className="bg-white/5 p-4 border border-white/5 flex flex-col gap-1">
                            <span className="text-[9px] font-bold text-app-text-muted uppercase tracking-widest">Priority</span>
                            <span className="text-xs font-bold text-warning uppercase">STANDARD_OPS</span>
                        </div>
                    </div>

                    {/* Request Context */}
                    <div className="space-y-4">
                        <h3 className="text-[10px] font-bold text-app-text-muted uppercase tracking-[0.3em] flex items-center gap-2">
                             <div className="w-4 h-[1px] bg-primary/40"></div> Object_Telemetry
                        </h3>
                        <div className="grid grid-cols-2 gap-x-12 gap-y-4 bg-app-void/40 p-6 border border-white/5">
                            <div className="space-y-1">
                                <label className="text-[9px] font-bold text-primary/60 uppercase">Asset_Type</label>
                                <p className="text-sm font-semibold uppercase tracking-wider">{request.asset_type}</p>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[9px] font-bold text-primary/60 uppercase">Ownership</label>
                                <p className="text-sm font-semibold uppercase tracking-wider">{request.asset_ownership_type}</p>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[9px] font-bold text-primary/60 uppercase">Requester</label>
                                <p className="text-sm font-semibold uppercase tracking-wider">{request.requester_name}</p>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[9px] font-bold text-primary/60 uppercase">Department</label>
                                <p className="text-sm font-semibold uppercase tracking-wider">{request.requester_department}</p>
                            </div>
                        </div>
                    </div>

                    {/* Form Section */}
                    <div className="space-y-4">
                        <h3 className="text-[10px] font-bold text-app-text-muted uppercase tracking-[0.3em] flex items-center gap-2">
                             <div className="w-4 h-[1px] bg-primary/40"></div> Decision_Matrix
                        </h3>
                        
                        {error && (
                            <div className="bg-danger/10 border border-danger/20 p-4 flex gap-3 items-center">
                                <AlertTriangle className="text-danger" size={20} />
                                <span className="text-xs text-danger uppercase font-bold tracking-widest">{error}</span>
                            </div>
                        )}

                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-app-text-muted uppercase mb-2 block">
                                Verification_Notes {ctx.type === 'INITIAL_APPROVAL' ? '(Required for REJECT)' : '(Optional)'}
                            </label>
                            <textarea 
                                value={comment}
                                onChange={(e) => setComment(e.target.value)}
                                className="w-full bg-app-void border border-white/10 p-4 text-sm focus:border-primary/50 focus:outline-none min-h-[100px] font-mono placeholder:text-white/10"
                                placeholder="[ENTER_VALIDATION_LOGS]"
                            />
                        </div>

                        {/* Special Fields for Procurement/Finance */}
                        {ctx.type === 'PROCUREMENT_PROCESS' && (
                            <div className="bg-white/5 p-4 border border-white/10 flex items-center justify-between group cursor-pointer hover:border-primary/40 transition-all">
                                <div className="flex items-center gap-4">
                                    <Upload className="text-primary/60" size={20} />
                                    <div>
                                        <p className="text-[10px] font-bold uppercase tracking-widest">Attach_Purchase_Order</p>
                                        <p className="text-[8px] text-app-text-muted uppercase">PDF_FORMAT_REQ</p>
                                    </div>
                                </div>
                                <div className="text-[10px] bg-white/5 px-3 py-1 border border-white/10 font-bold uppercase">Browse</div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer Controls */}
                <div className="p-6 bg-app-void/60 border-t border-white/5 flex justify-end gap-3">
                    <button 
                        onClick={onClose}
                        disabled={isSubmitting}
                        className="px-6 py-2 text-[10px] font-black uppercase tracking-widest text-app-text-muted hover:text-white transition-colors"
                    >
                        [ABORT]
                    </button>
                    <button 
                        onClick={() => handleAction('REJECT')}
                        disabled={isSubmitting || ctx.type === 'BYOD_COMPLIANCE'}
                        className="px-6 py-2 text-[10px] font-black uppercase tracking-widest border border-danger/30 text-danger hover:bg-danger/10 transition-all active:scale-95 disabled:opacity-30"
                    >
                        [REJECT_SIGNAL]
                    </button>
                    <button 
                        onClick={() => handleAction('APPROVE')}
                        disabled={isSubmitting}
                        className="px-8 py-2 text-[10px] font-black uppercase tracking-widest bg-primary text-app-void shadow-[0_0_20px_rgba(var(--color-primary-rgb),0.3)] hover:brightness-110 transition-all active:scale-95 disabled:opacity-30 flex items-center gap-2"
                    >
                        {isSubmitting ? '[PROCESSING...]' : (
                            <>
                                [EXECUTE_TRANSITION] <ChevronRight size={14} />
                            </>
                        )}
                    </button>
                </div>

            </div>
            
            <style jsx>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: rgba(255, 255, 255, 0.1);
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: rgba(255, 255, 255, 0.2);
                }
            `}</style>
        </div>
    );
};

export default WorkflowActionPanel;
