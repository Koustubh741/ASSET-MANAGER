import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import apiClient from '../lib/apiClient';
import { useToast } from '@/components/common/Toast';
import ManagerApprovalModal from './ManagerApprovalModal';
import ComplianceCheckModal from './ComplianceCheckModal';
import ITApprovalModal from './ITApprovalModal';
import WorkflowProgressBar from './WorkflowProgressBar';
import Skeleton from '@/components/common/Skeleton';
import { getStatusLabel } from '@/lib/statusLabels';
import { FileText, Check, Shield, AlertCircle, ShieldCheck, ChevronDown, ChevronUp, Info, Eye, Plus } from 'lucide-react';
import { useRole } from '@/contexts/RoleContext';

const AssetRequestsList = () => {
    const toast = useToast();
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [isApprovalModalOpen, setIsApprovalModalOpen] = useState(false);
    const [isComplianceModalOpen, setIsComplianceModalOpen] = useState(false);
    const [isITModalOpen, setIsITModalOpen] = useState(false);
    const { 
        user, 
        currentRole, 
        isManagerial, 
        isITStaff, 
        isFinanceStaff, 
        isProcurementStaff 
    } = useRole();
    const [expandedRows, setExpandedRows] = useState(new Set());

    useEffect(() => {
        fetchRequests();
    }, []);

    const fetchRequests = async () => {
        try {
            setLoading(true);
            const data = await apiClient.getAssetRequests();
            setRequests(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error("Failed to fetch requests", error);
            toast.error(`Failed to load asset requests: ${error.message || 'Unknown error'}`);
        } finally {
            setLoading(false);
        }
    };

    const toggleRow = (id) => {
        if (id == null) return;
        const newExpanded = new Set(expandedRows);
        if (newExpanded.has(id)) {
            newExpanded.delete(id);
        } else {
            newExpanded.add(id);
        }
        setExpandedRows(newExpanded);
    };

    const handleManagerAction = (request) => {
        setSelectedRequest(request);
        setIsApprovalModalOpen(true);
    };

    const handleComplianceCheck = (request) => {
        setSelectedRequest(request);
        setIsComplianceModalOpen(true);
    };

    const handleITAction = (request) => {
        setSelectedRequest(request);
        setIsITModalOpen(true);
    };

    // Determine if the current user can perform an action on a request
    const canAct = (request) => {
        if (!user) return false;

        const status = request.status;

        // Manager Actions
        if (isManagerial) {
            if (status === 'SUBMITTED') return true;
            if (status === 'IT_APPROVED') return true;
            if (status === 'FINANCE_APPROVED') return true;
            if (status === 'USER_ACCEPTANCE_PENDING' && request.user_acceptance_status === 'ACCEPTED') return true;
            if (status === 'MANAGER_CONFIRMED_ASSIGNMENT') return true;
        }

        // IT Actions
        if (isITStaff && !isManagerial) {
            if (status === 'MANAGER_APPROVED') return true;
            if (status === 'BYOD_COMPLIANCE_CHECK') return true;
        }

        // PROCUREMENT Actions
        if (isProcurementStaff) {
            if (status === 'PROCUREMENT_REQUIRED') return true;
        }

        // FINANCE Actions
        if (isFinanceStaff) {
            if (status === 'PO_VALIDATED') return true;
        }

        return false;
    };

    return (
        <div className="glass-panel overflow-hidden">
            {/* Desktop: Table */}
            <div className="overflow-x-auto hidden md:block">
                <table className="w-full text-left text-sm text-slate-900 dark:text-slate-200">
                    <thead className="bg-app-surface-soft text-app-text-muted bg-slate-100 text-app-text-muted font-semibold border-b border-app-border">
                        <tr>
                            <th className="px-6 py-4 w-10"></th>
                            <th className="px-6 py-4">Asset / User</th>
                            <th className="px-6 py-4">Status</th>
                            <th className="px-6 py-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 divide-slate-200">
                        {loading ? (
                            Array.from({ length: 5 }).map((_, i) => (
                                <tr key={i} className="animate-pulse">
                                    <td className="px-6 py-4"><Skeleton variant="line" className="h-4 w-4 rounded" /></td>
                                    <td className="px-6 py-4 space-y-2">
                                        <Skeleton variant="line" className="h-4 w-32" />
                                        <Skeleton variant="line" className="h-3 w-24" />
                                    </td>
                                    <td className="px-6 py-4"><Skeleton variant="line" className="h-5 w-20 rounded-full" /></td>
                                    <td className="px-6 py-4 text-right"><Skeleton variant="line" className="h-8 w-16 ml-auto rounded" /></td>
                                </tr>
                            ))
                        ) : requests.length === 0 ? (
                            <tr>
                                <td colSpan="4" className="px-6 py-12 text-center">
                                    <div className="flex flex-col items-center gap-4">
                                        <div className="w-14 h-14 rounded-full bg-app-surface-soft flex items-center justify-center">
                                            <FileText className="w-7 h-7 text-app-text-muted" />
                                        </div>
                                        <div>
                                            <p className="text-app-text-muted text-app-text-muted font-medium">No asset requests yet</p>
                                            <p className="text-sm text-app-text-muted mt-1">Request an asset from your dashboard to get started.</p>
                                        </div>
                                        <Link
                                            href="/"
                                            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 hover:brightness-110 active:scale-95 text-app-text text-sm font-semibold rounded-xl transition-all duration-200"
                                        >
                                            <Plus size={18} />
                                            Request an asset
                                        </Link>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            requests.map((req) => (
                                <React.Fragment key={req.id}>
                                    <tr className={`hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-app-surface-soft hover:bg-slate-50 transition-all duration-200 cursor-pointer ${expandedRows.has(req.id ?? req.request_id) ? 'bg-indigo-500/10 ring-1 ring-indigo-500/30 bg-indigo-50 ring-indigo-200' : ''}`} onClick={() => toggleRow(req.id ?? req.request_id)}>
                                        <td className="px-6 py-4">
                                            {expandedRows.has(req.id ?? req.request_id) ? <ChevronUp className="w-4 h-4 text-app-text-muted text-app-text-muted" /> : <ChevronDown className="w-4 h-4 text-app-text-muted text-app-text-muted" />}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <div className="font-medium text-app-text flex items-center gap-2">
                                                    {req.asset_name ?? '—'}
                                                    <span className="text-xs font-mono text-app-text-muted text-app-text-muted bg-slate-200 bg-app-surface-soft px-1.5 py-0.5 rounded uppercase">
                                                        {req.asset_ownership_type ?? '—'}
                                                    </span>
                                                </div>
                                                <div className="flex flex-col">
                                                    <div className="text-sm font-bold text-slate-900 dark:text-slate-200">{req.requester_name}</div>
                                                    <div className="text-xs text-app-text-muted text-app-text-muted mb-1">{req.requester_email}</div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs text-app-text-muted">{req.domain}</span>
                                                        {req.requester_department && (
                                                            <span className="text-xs px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-medium">
                                                                {req.requester_department}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider border ${(req.status || '') === 'IN_USE' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                                (req.status || '').includes('REJECTED') || (req.status || '').includes('FAILED') ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' :
                                                    'bg-blue-500/10 text-blue-400 border-blue-500/20'
                                                }`}>
                                                {getStatusLabel(req.status)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                                                <button
                                                    type="button"
                                                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleRow(req.id ?? req.request_id); }}
                                                    className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-indigo-700 dark:text-indigo-300 hover:text-slate-900 dark:hover:text-white text-app-text hover:bg-indigo-600 hover:bg-indigo-600 border border-indigo-500/30 hover:border-indigo-400 rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-offset-slate-100 min-h-[44px] cursor-pointer"
                                                    aria-label="View details"
                                                    title="View details"
                                                >
                                                    <Eye className="w-4 h-4 shrink-0" />
                                                    View
                                                </button>
                                                {canAct(req) && (
                                                    <>
                                                        {isManagerial && (
                                                            <button
                                                                type="button"
                                                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleManagerAction(req); }}
                                                                className="px-3 py-1.5 text-xs font-bold bg-indigo-600 text-app-text hover:bg-indigo-700 hover:brightness-110 active:scale-95 rounded-lg shadow-sm transition-all duration-200"
                                                            >
                                                                Review
                                                            </button>
                                                        )}
                                                        {isITStaff && !isManagerial && req.status === 'MANAGER_APPROVED' && (
                                                            <button
                                                                type="button"
                                                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleITAction(req); }}
                                                                className="px-3 py-1.5 text-xs font-bold bg-emerald-600 text-app-text hover:bg-emerald-700 hover:brightness-110 active:scale-95 rounded-lg shadow-sm transition-all duration-200"
                                                            >
                                                                IT Review
                                                            </button>
                                                        )}
                                                        {isITStaff && !isManagerial && req.status === 'BYOD_COMPLIANCE_CHECK' && (
                                                            <button
                                                                type="button"
                                                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleComplianceCheck(req); }}
                                                                className="px-3 py-1.5 text-xs font-bold bg-blue-600 text-app-text hover:bg-blue-700 hover:brightness-110 active:scale-95 rounded-lg shadow-sm transition-all duration-200"
                                                            >
                                                                Scan
                                                            </button>
                                                        )}
                                                        {isProcurementStaff && req.status === 'PROCUREMENT_REQUIRED' && (
                                                            <Link
                                                                href="/dashboard/procurement-manager"
                                                                onClick={(e) => e.stopPropagation()}
                                                                className="px-3 py-1.5 text-xs font-bold bg-amber-600 text-app-text hover:bg-amber-700 hover:brightness-110 active:scale-95 rounded-lg shadow-sm transition-all duration-200 flex items-center"
                                                            >
                                                                Action Required
                                                            </Link>
                                                        )}
                                                        {isFinanceStaff && req.status === 'PO_VALIDATED' && (
                                                            <Link
                                                                href="/dashboard/finance"
                                                                onClick={(e) => e.stopPropagation()}
                                                                className="px-3 py-1.5 text-xs font-bold bg-emerald-600 text-app-text hover:bg-emerald-700 hover:brightness-110 active:scale-95 rounded-lg shadow-sm transition-all duration-200 flex items-center"
                                                            >
                                                                Action Required
                                                            </Link>
                                                        )}
                                                    </>
                                                )}
                                                <button
                                                    type="button"
                                                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleRow(req.id ?? req.request_id); }}
                                                    className="p-1.5 text-app-text-muted text-app-text-muted hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 hover:text-slate-900 dark:hover:bg-app-surface hover:bg-slate-200 rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-offset-slate-100 rounded"
                                                    aria-label="Toggle details"
                                                    title="Toggle details"
                                                >
                                                    <Info className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                    {expandedRows.has(req.id ?? req.request_id) && (
                                        <tr className="bg-app-surface-soft">
                                            <td colSpan="4" className="px-12 py-8 border-l-4 border-indigo-500">
                                                <div className="space-y-6">
                                                    <div>
                                                        <h4 className="text-xs font-bold text-app-text-muted text-app-text-muted uppercase tracking-widest mb-4">Lifecycle Journey Insights</h4>
                                                        <WorkflowProgressBar
                                                            currentStatus={req.status}
                                                            isByod={req.asset_ownership_type === 'BYOD'}
                                                        />
                                                    </div>

                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
                                                        <div className="space-y-4">
                                                            <h5 className="text-xs font-bold text-slate-700 dark:text-slate-700 flex items-center gap-2">
                                                                <FileText className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                                                                Request Context
                                                            </h5>
                                                            <div className="bg-app-surface-soft p-4 rounded-xl border border-app-border space-y-3">
                                                                <div className="flex justify-between text-xs">
                                                                    <span className="text-app-text-muted text-app-text-muted">Justification:</span>
                                                                    <span className="font-medium text-slate-900 dark:text-slate-200">{req.justification || 'N/A'}</span>
                                                                </div>
                                                                <div className="flex justify-between text-xs">
                                                                    <span className="text-app-text-muted text-app-text-muted">Asset Type:</span>
                                                                    <span className="font-medium text-slate-900 dark:text-slate-200 font-mono uppercase">{req.asset_type ?? '—'}</span>
                                                                </div>
                                                                {req.serial_number && (
                                                                    <div className="flex justify-between text-xs">
                                                                        <span className="text-app-text-muted text-app-text-muted">Serial/Model:</span>
                                                                        <span className="font-medium text-slate-900 dark:text-slate-200 uppercase">{req.serial_number}</span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>

                                                        <div className="space-y-4">
                                                            <h5 className="text-xs font-bold text-slate-700 dark:text-slate-700 flex items-center gap-2">
                                                                <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                                                                Audit Trail
                                                            </h5>
                                                            <div className="bg-app-surface-soft p-4 rounded-xl border border-app-border space-y-3">
                                                                {req.manager_approvals?.length > 0 ? (
                                                                    req.manager_approvals.map((log, i) => (
                                                                        <div key={i} className="flex gap-3 text-xs">
                                                                            <div className="w-1.5 h-1.5 mt-1 rounded-full bg-slate-400 dark:bg-slate-500 shrink-0" />
                                                                            <span className="text-app-text-muted text-app-text-muted">
                                                                                <span className="font-bold text-slate-900 dark:text-slate-200">{log.reviewer_name ?? '—'}</span>
                                                                                {' '}{(log.type != null ? String(log.type).replace(/_/g, ' ') : '—')}:
                                                                                <span className={`ml-1 font-bold ${log.decision === 'APPROVED' ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                                                    {log.decision ?? '—'}
                                                                                </span>
                                                                            </span>
                                                                        </div>
                                                                    ))
                                                                ) : (
                                                                    <div className="text-xs text-app-text-muted italic">No audit events recorded yet</div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Mobile: Card layout */}
            <div className="block md:hidden divide-y divide-white/10 divide-slate-200">
                {loading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="p-4 space-y-3 animate-pulse">
                            <Skeleton variant="line" className="h-4 w-3/4" />
                            <Skeleton variant="line" className="h-3 w-1/2" />
                            <Skeleton variant="line" className="h-5 w-20 rounded-full" />
                        </div>
                    ))
                ) : requests.length === 0 ? (
                    <div className="p-8 text-center">
                        <FileText className="w-10 h-10 text-app-text-muted mx-auto mb-3" />
                        <p className="text-app-text-muted text-app-text-muted font-medium">No asset requests yet</p>
                        <p className="text-sm text-app-text-muted mt-1">Request an asset from your dashboard to get started.</p>
                        <Link href="/" className="inline-flex items-center gap-2 mt-4 px-4 py-3 bg-indigo-600 hover:bg-indigo-500 text-app-text text-sm font-semibold rounded-xl min-h-[44px] items-center justify-center">
                            <Plus size={18} /> Request an asset
                        </Link>
                    </div>
                ) : (
                    requests.map((req) => (
                        <div
                            key={req.id}
                            className={`p-4 space-y-3 border-b border-app-border last:border-0 transition-all duration-200 ${expandedRows.has(req.id ?? req.request_id) ? 'bg-indigo-500/10 ring-1 ring-indigo-500/30 bg-indigo-50 ring-indigo-200' : ''}`}
                            onClick={() => toggleRow(req.id ?? req.request_id)}
                        >
                            <div className="flex justify-between items-start">
                                <div>
                                    <div className="font-medium text-app-text flex flex-wrap items-center gap-2">
                                        {req.asset_name ?? '—'}
                                        <span className="text-xs font-mono text-app-text-muted text-app-text-muted bg-slate-200 bg-app-surface-soft px-1.5 py-0.5 rounded uppercase">{req.asset_ownership_type ?? '—'}</span>
                                    </div>
                                    <div className="text-sm text-slate-900 dark:text-slate-200 mt-0.5">{req.requester_name ?? '—'}</div>
                                    <div className="text-xs text-app-text-muted">{req.requester_department || req.domain || '—'}</div>
                                </div>
                                <span className={`shrink-0 inline-flex px-2.5 py-0.5 rounded-full text-xs font-bold uppercase border ${(req.status || '').includes('REJECTED') || (req.status || '').includes('FAILED') ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : 'bg-blue-500/10 text-blue-400 border-blue-500/20'}`}>
                                    {getStatusLabel(req.status)}
                                </span>
                            </div>
                            <div className="flex gap-2 flex-wrap min-h-[44px] items-center">
                                <button
                                    type="button"
                                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleRow(req.id ?? req.request_id); }}
                                    className="flex items-center gap-1.5 px-3 py-2.5 text-xs font-semibold text-indigo-700 dark:text-indigo-300 hover:text-slate-900 dark:hover:text-white text-app-text hover:bg-indigo-600 hover:bg-indigo-600 border border-indigo-500/30 hover:border-indigo-400 rounded-lg min-h-[44px] cursor-pointer"
                                    aria-label="View details"
                                >
                                    <Eye className="w-4 h-4" /> View details
                                </button>
                                {canAct(req) && isManagerial && (
                                    <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleManagerAction(req); }} className="px-3 py-2.5 text-xs font-bold bg-indigo-600 text-app-text rounded-lg min-h-[44px]">
                                        Review
                                    </button>
                                )}
                                {canAct(req) && isITStaff && !isManagerial && req.status === 'MANAGER_APPROVED' && (
                                    <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleITAction(req); }} className="px-3 py-2.5 text-xs font-bold bg-emerald-600 text-app-text rounded-lg min-h-[44px]">
                                        IT Review
                                    </button>
                                )}
                                {canAct(req) && isITStaff && !isManagerial && req.status === 'BYOD_COMPLIANCE_CHECK' && (
                                    <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleComplianceCheck(req); }} className="px-3 py-2.5 text-xs font-bold bg-blue-600 text-app-text rounded-lg min-h-[44px]">
                                        Scan
                                    </button>
                                )}
                                {canAct(req) && isProcurementStaff && req.status === 'PROCUREMENT_REQUIRED' && (
                                    <Link href="/dashboard/procurement-manager" onClick={(e) => e.stopPropagation()} className="px-3 py-2.5 text-xs font-bold bg-amber-600 text-app-text rounded-lg min-h-[44px] flex items-center">
                                        Action Required
                                    </Link>
                                )}
                                {canAct(req) && isFinanceStaff && req.status === 'PO_VALIDATED' && (
                                    <Link href="/dashboard/finance" onClick={(e) => e.stopPropagation()} className="px-3 py-2.5 text-xs font-bold bg-emerald-600 text-app-text rounded-lg min-h-[44px] flex items-center">
                                        Action Required
                                    </Link>
                                )}
                            </div>
                            {expandedRows.has(req.id ?? req.request_id) && (
                                <div className="pt-4 mt-4 border-t border-app-border space-y-4">
                                    <WorkflowProgressBar currentStatus={req.status} isByod={req.asset_ownership_type === 'BYOD'} />
                                    <p className="text-xs text-app-text-muted text-app-text-muted"><span className="font-medium text-slate-700 dark:text-slate-700">Justification:</span> {req.justification || 'N/A'}</p>
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>

            <ManagerApprovalModal
                isOpen={isApprovalModalOpen}
                onClose={() => setIsApprovalModalOpen(false)}
                request={selectedRequest}
                onUpdate={fetchRequests}
            />

            <ComplianceCheckModal
                isOpen={isComplianceModalOpen}
                onClose={() => setIsComplianceModalOpen(false)}
                request={selectedRequest}
                onUpdate={fetchRequests}
            />

            <ITApprovalModal
                isOpen={isITModalOpen}
                onClose={() => setIsITModalOpen(false)}
                request={selectedRequest}
                onUpdate={fetchRequests}
            />
        </div>
    );
};

export default AssetRequestsList;
