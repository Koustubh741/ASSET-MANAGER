import React, { useState, useEffect } from 'react';
import apiClient from '../lib/apiClient';
import ManagerApprovalModal from './ManagerApprovalModal';
import ComplianceCheckModal from './ComplianceCheckModal';
import ITApprovalModal from './ITApprovalModal';
import WorkflowProgressBar from './WorkflowProgressBar';
import { FileText, Check, Shield, AlertCircle, ShieldCheck, ChevronDown, ChevronUp, Info } from 'lucide-react';

const AssetRequestsList = () => {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [isApprovalModalOpen, setIsApprovalModalOpen] = useState(false);
    const [isComplianceModalOpen, setIsComplianceModalOpen] = useState(false);
    const [isITModalOpen, setIsITModalOpen] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);
    const [expandedRows, setExpandedRows] = useState(new Set());

    useEffect(() => {
        const userStr = localStorage.getItem('user');
        if (userStr) {
            setCurrentUser(JSON.parse(userStr));
        }
        fetchRequests();
    }, []);

    const fetchRequests = async () => {
        try {
            setLoading(true);
            const data = await apiClient.getAssetRequests();
            setRequests(data);
        } catch (error) {
            console.error("Failed to fetch requests", error);
        } finally {
            setLoading(false);
        }
    };

    const toggleRow = (id) => {
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
        if (!currentUser) return false;

        const role = currentUser.role; // e.g., 'MANAGER', 'IT_MANAGEMENT'
        const status = request.status;

        // Manager Actions
        if (role === 'MANAGER' || currentUser.position === 'MANAGER') {
            if (status === 'SUBMITTED') return true;
            if (status === 'IT_APPROVED') return true;
            if (status === 'FINANCE_APPROVED') return true;
            if (status === 'USER_ACCEPTANCE_PENDING' && request.user_acceptance_status === 'ACCEPTED') return true;
            if (status === 'MANAGER_CONFIRMED_ASSIGNMENT') return true;
        }

        // IT Actions
        if (role === 'IT_MANAGEMENT') {
            if (status === 'MANAGER_APPROVED') return true;
            if (status === 'BYOD_COMPLIANCE_CHECK') return true;
        }

        return false;
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-600">
                    <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                        <tr>
                            <th className="px-6 py-4 w-10"></th>
                            <th className="px-6 py-4">Asset / User</th>
                            <th className="px-6 py-4">Status</th>
                            <th className="px-6 py-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {loading ? (
                            <tr><td colSpan="4" className="px-6 py-8 text-center text-slate-400">Loading requests...</td></tr>
                        ) : requests.length === 0 ? (
                            <tr><td colSpan="4" className="px-6 py-8 text-center text-slate-400">No active requests found</td></tr>
                        ) : (
                            requests.map((req) => (
                                <React.Fragment key={req.id}>
                                    <tr className={`hover:bg-slate-50/50 transition-colors cursor-pointer ${expandedRows.has(req.id) ? 'bg-slate-50/50' : ''}`} onClick={() => toggleRow(req.id)}>
                                        <td className="px-6 py-4">
                                            {expandedRows.has(req.id) ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <div className="font-medium text-slate-900 flex items-center gap-2">
                                                    {req.asset_name}
                                                    <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded uppercase">
                                                        {req.asset_ownership_type}
                                                    </span>
                                                </div>
                                                <div className="flex flex-col">
                                                    <div className="text-sm font-bold text-slate-700">{req.requester_name}</div>
                                                    <div className="text-[10px] text-slate-400 mb-1">{req.requester_email}</div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[10px] text-slate-500">{req.domain}</span>
                                                        {req.requester_department && (
                                                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 font-medium">
                                                                {req.requester_department}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${req.status === 'IN_USE' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                                                req.status.includes('REJECTED') || req.status.includes('FAILED') ? 'bg-red-50 text-red-700 border-red-100' :
                                                    'bg-blue-50 text-blue-700 border-blue-100'
                                                }`}>
                                                {req.status.replace(/_/g, ' ')}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                                                {canAct(req) && (
                                                    <>
                                                        {(currentUser.role === 'MANAGER' || currentUser.position === 'MANAGER') && (
                                                            <button
                                                                onClick={() => handleManagerAction(req)}
                                                                className="px-3 py-1.5 text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg shadow-sm transition-all"
                                                            >
                                                                Review
                                                            </button>
                                                        )}
                                                        {currentUser.role === 'IT_MANAGEMENT' && req.status === 'MANAGER_APPROVED' && (
                                                            <button
                                                                onClick={() => handleITAction(req)}
                                                                className="px-3 py-1.5 text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 rounded-lg shadow-sm transition-all"
                                                            >
                                                                IT Review
                                                            </button>
                                                        )}
                                                        {currentUser.role === 'IT_MANAGEMENT' && req.status === 'BYOD_COMPLIANCE_CHECK' && (
                                                            <button
                                                                onClick={() => handleComplianceCheck(req)}
                                                                className="px-3 py-1.5 text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 rounded-lg shadow-sm transition-all"
                                                            >
                                                                Scan
                                                            </button>
                                                        )}
                                                    </>
                                                )}
                                                <button
                                                    onClick={() => toggleRow(req.id)}
                                                    className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all"
                                                >
                                                    <Info className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                    {expandedRows.has(req.id) && (
                                        <tr className="bg-slate-50/30">
                                            <td colSpan="4" className="px-12 py-8 border-l-4 border-indigo-500">
                                                <div className="space-y-6">
                                                    <div>
                                                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Lifecycle Journey Insights</h4>
                                                        <WorkflowProgressBar
                                                            currentStatus={req.status}
                                                            isByod={req.asset_ownership_type === 'BYOD'}
                                                        />
                                                    </div>

                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
                                                        <div className="space-y-4">
                                                            <h5 className="text-xs font-bold text-slate-800 flex items-center gap-2">
                                                                <FileText className="w-4 h-4 text-indigo-500" />
                                                                Request Context
                                                            </h5>
                                                            <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-3 shadow-sm">
                                                                <div className="flex justify-between text-xs">
                                                                    <span className="text-slate-500">Justification:</span>
                                                                    <span className="font-medium text-slate-900">{req.justification || 'N/A'}</span>
                                                                </div>
                                                                <div className="flex justify-between text-xs">
                                                                    <span className="text-slate-500">Asset Type:</span>
                                                                    <span className="font-medium text-slate-900 font-mono uppercase">{req.asset_type}</span>
                                                                </div>
                                                                {req.serial_number && (
                                                                    <div className="flex justify-between text-xs">
                                                                        <span className="text-slate-500">Serial/Model:</span>
                                                                        <span className="font-medium text-slate-900 uppercase">{req.serial_number}</span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>

                                                        <div className="space-y-4">
                                                            <h5 className="text-xs font-bold text-slate-800 flex items-center gap-2">
                                                                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                                                                Audit Trail
                                                            </h5>
                                                            <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-3 shadow-sm">
                                                                {req.manager_approvals?.length > 0 ? (
                                                                    req.manager_approvals.map((log, i) => (
                                                                        <div key={i} className="flex gap-3 text-[10px]">
                                                                            <div className="w-1.5 h-1.5 mt-1 rounded-full bg-slate-300 shrink-0" />
                                                                            <span className="text-slate-500">
                                                                                <span className="font-bold text-slate-700">{log.reviewer_name}</span>
                                                                                {' '}{log.type.replace('_', ' ')}:
                                                                                <span className={`ml-1 font-bold ${log.decision === 'APPROVED' ? 'text-emerald-600' : 'text-red-500'}`}>
                                                                                    {log.decision}
                                                                                </span>
                                                                            </span>
                                                                        </div>
                                                                    ))
                                                                ) : (
                                                                    <div className="text-[10px] text-slate-400 italic italic">No audit events recorded yet</div>
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
