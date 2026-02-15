import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, CheckCircle, XCircle, DollarSign, Clock, AlertCircle, Eye, Filter, Calendar, Building, FileText, ChevronRight } from 'lucide-react'
import apiClient from '@/lib/apiClient';
import { getHash } from '@/utils/assetNormalizer';

// --- Helper Components ---

const RenewalDetailsModal = ({ renewal, onClose }) => {
    if (!renewal) return null;

    return (
        <div className="fixed inset-0 z-50 flex justify-end">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={onClose} />

            <div className="relative w-full max-w-md bg-[#0f172a] border-l border-white/10 shadow-2xl h-full overflow-y-auto transform transition-transform duration-300 ease-out">
                {/* Header */}
                <div className="p-6 border-b border-white/10 bg-slate-900/50 flex justify-between items-start">
                    <div>
                        <h3 className="text-xl font-bold text-white">Renewal Details</h3>
                        <p className="text-sm text-slate-400 mt-1">ID: {renewal.renewal_id}</p>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
                        <XCircle size={24} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                    {/* Status Badge */}
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-400 uppercase tracking-wide font-semibold">Current Status</span>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold border ${renewal.renewal_status === 'Requested' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' :
                            renewal.renewal_status === 'IT_Approved' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                                renewal.renewal_status === 'Finance_Approved' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' :
                                    renewal.renewal_status === 'Commercial_Approved' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                        'bg-red-500/10 text-red-400 border-red-500/20'
                            }`}>
                            {renewal.renewal_status.replace('_', ' ')}
                        </span>
                    </div>

                    {/* Key Info Grid */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-slate-800/50 rounded-xl border border-white/5">
                            <div className="flex items-center gap-2 text-slate-400 mb-2">
                                <DollarSign size={16} />
                                <span className="text-xs font-medium uppercase">Cost</span>
                            </div>
                            <div className="text-lg font-mono text-white">₹{renewal.renewal_cost?.toLocaleString()}</div>
                        </div>
                        <div className="p-4 bg-slate-800/50 rounded-xl border border-white/5">
                            <div className="flex items-center gap-2 text-slate-400 mb-2">
                                <Calendar size={16} />
                                <span className="text-xs font-medium uppercase">Period</span>
                            </div>
                            <div className="text-sm text-white">1 Year (Annual)</div>
                        </div>
                    </div>

                    {/* Details List */}
                    <div className="space-y-4">
                        <div className="pb-4 border-b border-white/5">
                            <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                                <FileText size={16} className="text-blue-400" /> Request Information
                            </h4>
                            <div className="space-y-3">
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-400">Asset Name:</span>
                                    <span className="text-slate-200 font-medium text-right">{renewal.name}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-400">Renewal Type:</span>
                                    <span className="text-slate-200">Warranty Extension</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-400">Requested By:</span>
                                    <span className="text-slate-200">{renewal.assigned_to || 'System Admin'}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-400">Requested Date:</span>
                                    <span className="text-slate-200">{new Date().toLocaleDateString()}</span>
                                </div>
                            </div>
                        </div>

                        <div className="pb-4 border-b border-white/5">
                            <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                                <Building size={16} className="text-purple-400" /> Vendor Details
                            </h4>
                            <div className="space-y-3">
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-400">Vendor:</span>
                                    <span className="text-slate-200">TechCare Solutions Ltd.</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-400">SLA Level:</span>
                                    <span className="text-slate-200">Gold (24/7 Support)</span>
                                </div>
                            </div>
                        </div>

                        <div>
                            <h4 className="text-sm font-semibold text-white mb-3">Approval History</h4>
                            <div className="relative pl-4 border-l-2 border-white/10 space-y-6">
                                {/* Timeline items */}
                                <div className="relative">
                                    <div className="absolute -left-[21px] top-1 w-3 h-3 rounded-full bg-emerald-500"></div>
                                    <p className="text-sm text-white font-medium">Request Submitted</p>
                                    <p className="text-xs text-slate-500">Auto-generated by System</p>
                                </div>
                                {['IT_Approved', 'Finance_Approved', 'Commercial_Approved'].includes(renewal.renewal_status) && (
                                    <div className="relative">
                                        <div className="absolute -left-[21px] top-1 w-3 h-3 rounded-full bg-blue-500"></div>
                                        <p className="text-sm text-white font-medium">IT Verified</p>
                                        <p className="text-xs text-slate-500">Approved by IT Manager</p>
                                    </div>
                                )}
                                {['Finance_Approved', 'Commercial_Approved'].includes(renewal.renewal_status) && (
                                    <div className="relative">
                                        <div className="absolute -left-[21px] top-1 w-3 h-3 rounded-full bg-purple-500"></div>
                                        <p className="text-sm text-white font-medium">Finance Approved</p>
                                        <p className="text-xs text-slate-500">Approved by CFO</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const RejectModal = ({ isOpen, onClose, onConfirm }) => {
    const [reason, setReason] = useState('');

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity" onClick={onClose} />
            <div className="relative bg-[#1e293b] rounded-2xl w-full max-w-md border border-white/10 p-6 shadow-2xl">
                <h3 className="text-xl font-bold text-white mb-2">Reject Renewal Request</h3>
                <p className="text-slate-400 text-sm mb-4">Please provide a reason for rejecting this renewal. This will be logged in the audit trail.</p>

                <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="w-full bg-black/30 border border-white/10 rounded-lg p-3 text-white text-sm focus:outline-none focus:border-red-500/50 h-32 resize-none"
                    placeholder="Enter rejection reason..."
                    autoFocus
                />

                <div className="flex justify-end gap-3 mt-6">
                    <button onClick={onClose} className="px-4 py-2 text-sm text-slate-300 hover:text-white transition-colors">Cancel</button>
                    <button
                        onClick={() => onConfirm(reason)}
                        disabled={!reason.trim()}
                        className="px-4 py-2 bg-red-500 hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
                    >
                        Confirm Rejection
                    </button>
                </div>
            </div>
        </div>
    );
}

// --- Main Page Component ---

export default function Renewals() {
    const [loading, setLoading] = useState(true)
    const [renewals, setRenewals] = useState([])
    const [filter, setFilter] = useState(null)
    const [stats, setStats] = useState({ requested: 0, it_approved: 0, finance_approved: 0 })

    // UI State
    const [selectedRenewal, setSelectedRenewal] = useState(null);
    const [rejectModalOpen, setRejectModalOpen] = useState(false);
    const [renewalToReject, setRenewalToReject] = useState(null);

    useEffect(() => {
        const loadRenewals = async () => {
            try {
                // Load assets from backend API
                const assets = await apiClient.getAssets();

                const generatedRenewals = assets
                    .filter(asset => {
                        const h = getHash(String(asset.id));
                        return h % 4 === 0 && asset.status !== 'Retired';
                    })
                    .map(asset => {
                        const h = getHash(String(asset.id));
                        let status = 'Requested';
                        if (h % 3 === 0) status = 'IT_Approved';
                        if (h % 5 === 0) status = 'Finance_Approved';

                        return {
                            ...asset,
                            renewal_id: `REN-${new Date().getFullYear()}-${String(asset.id).padStart(4, '0')}`,
                            renewal_cost: Math.round((asset.cost || 0) * 0.15),
                            renewal_status: status
                        };
                    });

                setRenewals(generatedRenewals);
            } catch (error) {
                console.error('Failed to load renewals from API:', error);
                setRenewals([]);
            } finally {
                setLoading(false);
            }
        };

        loadRenewals();
    }, [])

    useEffect(() => {
        setStats({
            requested: renewals.filter(a => a.renewal_status === 'Requested').length,
            it_approved: renewals.filter(a => a.renewal_status === 'IT_Approved').length,
            finance_approved: renewals.filter(a => a.renewal_status === 'Finance_Approved').length
        });
    }, [renewals]);

    const handleApprove = (assetId) => {
        setRenewals(prev => prev.map(a => {
            if (a.id === assetId) {
                let nextStatus = a.renewal_status;
                if (a.renewal_status === 'Requested') nextStatus = 'IT_Approved';
                else if (a.renewal_status === 'IT_Approved') nextStatus = 'Finance_Approved';
                else if (a.renewal_status === 'Finance_Approved') nextStatus = 'Commercial_Approved';

                return { ...a, renewal_status: nextStatus };
            }
            return a;
        }));
    };

    const initiateReject = (assetId) => {
        setRenewalToReject(assetId);
        setRejectModalOpen(true);
    };

    const confirmReject = (reason) => {
        setRenewals(prev => prev.map(a => {
            if (a.id === renewalToReject) {
                return { ...a, renewal_status: 'Rejected', rejection_reason: reason };
            }
            return a;
        }));
        setRejectModalOpen(false);
        setRenewalToReject(null);
    };

    const toggleFilter = (status) => {
        setFilter(prev => prev === status ? null : status);
    }

    const filteredRenewals = filter
        ? renewals.filter(r => r.renewal_status === filter)
        : renewals;

    // Badge Renderer
    const getStatusBadge = (status) => {
        const styles = {
            'Requested': 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
            'IT_Approved': 'bg-blue-500/10 text-blue-400 border-blue-500/20',
            'Finance_Approved': 'bg-purple-500/10 text-purple-400 border-purple-500/20',
            'Commercial_Approved': 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
            'Rejected': 'bg-red-500/10 text-red-500 border-red-500/20'
        }
        return (
            <span className={`px-2 py-1 rounded-full text-xs font-medium border ${styles[status] || 'bg-slate-800 text-slate-400'}`}>
                {status?.replace('_', ' ')}
            </span>
        )
    }

    // Actions Renderer
    const getActionButtons = (asset) => {
        if (asset.renewal_status === 'Rejected') return <span className="text-red-500 text-sm font-medium">Rejected</span>
        if (asset.renewal_status === 'Commercial_Approved') return <span className="text-emerald-500 text-sm flex items-center font-medium"><CheckCircle size={14} className="mr-1" /> Approved</span>

        return (
            <div className="flex items-center gap-2">
                <button
                    onClick={() => setSelectedRenewal(asset)}
                    className="p-1.5 rounded-lg bg-slate-700/50 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                    title="View Details"
                >
                    <Eye size={16} />
                </button>

                <div className="h-4 w-px bg-white/10 mx-1"></div>

                <button
                    onClick={() => handleApprove(asset.id)}
                    className="flex items-center px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 transition-all text-xs font-medium"
                >
                    <CheckCircle size={14} className="mr-1.5" /> Approve
                </button>
                <button
                    onClick={() => initiateReject(asset.id)}
                    className="flex items-center px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 transition-all text-xs font-medium"
                >
                    <XCircle size={14} className="mr-1.5" /> Reject
                </button>
            </div>
        )
    }

    if (loading) return <div className="p-8 text-white min-h-screen">Loading Workflows...</div>

    return (
        <div className="space-y-8 p-6 pb-20 min-h-screen">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold text-white tracking-tight">Renewal Management</h2>
                    <p className="text-slate-400 mt-1 flex items-center gap-2">
                        Enterprise Workflow: <span className="text-yellow-400">IT</span> <ChevronRight size={14} /> <span className="text-blue-400">Finance</span> <ChevronRight size={14} /> <span className="text-purple-400">Commercial</span>
                    </p>
                </div>
                <Link href="/" className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg flex items-center transition-colors border border-white/5">
                    <ArrowLeft size={16} className="mr-2" /> Back to Dashboard
                </Link>
            </div>

            {/* Workflow Pipeline Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div
                    onClick={() => toggleFilter('Requested')}
                    className={`glass-card p-6 flex items-center justify-between cursor-pointer transition-all duration-200 hover:scale-[1.01] ${filter === 'Requested' ? 'bg-yellow-500/10 border-yellow-500/50 ring-1 ring-yellow-500/50' : 'bg-slate-900/50 hover:bg-slate-800/80 border-white/5'}`}
                >
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <span className={`w-2 h-2 rounded-full ${filter === 'Requested' ? 'bg-yellow-400 animate-pulse' : 'bg-slate-600'}`}></span>
                            <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Pending IT Review</p>
                        </div>
                        <h3 className="text-4xl font-bold text-white">{stats.requested}</h3>
                    </div>
                    <div className={`p-4 rounded-2xl ${filter === 'Requested' ? 'bg-yellow-500 text-black' : 'bg-slate-800 text-slate-400'}`}>
                        <AlertCircle size={28} />
                    </div>
                </div>

                <div
                    onClick={() => toggleFilter('IT_Approved')}
                    className={`glass-card p-6 flex items-center justify-between cursor-pointer transition-all duration-200 hover:scale-[1.01] ${filter === 'IT_Approved' ? 'bg-blue-500/10 border-blue-500/50 ring-1 ring-blue-500/50' : 'bg-slate-900/50 hover:bg-slate-800/80 border-white/5'}`}
                >
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <span className={`w-2 h-2 rounded-full ${filter === 'IT_Approved' ? 'bg-blue-400 animate-pulse' : 'bg-slate-600'}`}></span>
                            <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Pending Finance</p>
                        </div>
                        <h3 className="text-4xl font-bold text-white">{stats.it_approved}</h3>
                    </div>
                    <div className={`p-4 rounded-2xl ${filter === 'IT_Approved' ? 'bg-blue-500 text-white' : 'bg-slate-800 text-slate-400'}`}>
                        <DollarSign size={28} />
                    </div>
                </div>

                <div
                    onClick={() => toggleFilter('Finance_Approved')}
                    className={`glass-card p-6 flex items-center justify-between cursor-pointer transition-all duration-200 hover:scale-[1.01] ${filter === 'Finance_Approved' ? 'bg-purple-500/10 border-purple-500/50 ring-1 ring-purple-500/50' : 'bg-slate-900/50 hover:bg-slate-800/80 border-white/5'}`}
                >
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <span className={`w-2 h-2 rounded-full ${filter === 'Finance_Approved' ? 'bg-purple-400 animate-pulse' : 'bg-slate-600'}`}></span>
                            <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Pending Commercial</p>
                        </div>
                        <h3 className="text-4xl font-bold text-white">{stats.finance_approved}</h3>
                    </div>
                    <div className={`p-4 rounded-2xl ${filter === 'Finance_Approved' ? 'bg-purple-500 text-white' : 'bg-slate-800 text-slate-400'}`}>
                        <Clock size={28} />
                    </div>
                </div>
            </div>

            {/* Filters Bar */}
            {filter && (
                <div className="flex items-center gap-2 px-1 animate-fadeIn">
                    <div className="bg-blue-500/10 text-blue-400 text-xs px-3 py-1 rounded-full border border-blue-500/20 flex items-center gap-2">
                        <Filter size={12} />
                        Filtered by Stage: <span className="font-bold text-white">{filter.replace('_', ' ')}</span>
                        <button onClick={() => setFilter(null)} className="ml-2 hover:text-white"><XCircle size={14} /></button>
                    </div>
                </div>
            )}

            {/* Data Table */}
            <div className="bg-slate-900/50 backdrop-blur border border-white/5 rounded-2xl overflow-hidden shadow-xl">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b border-white/5 bg-white/5">
                            <th className="p-5 text-xs font-bold text-slate-400 uppercase tracking-wider">Asset Details</th>
                            <th className="p-5 text-xs font-bold text-slate-400 uppercase tracking-wider">Requested By</th>
                            <th className="p-5 text-xs font-bold text-slate-400 uppercase tracking-wider">Renewal Cost</th>
                            <th className="p-5 text-xs font-bold text-slate-400 uppercase tracking-wider">Stage</th>
                            <th className="p-5 text-xs font-bold text-slate-400 uppercase tracking-wider text-right pr-8">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {filteredRenewals.length === 0 ? (
                            <tr>
                                <td colSpan="5" className="p-16 text-center">
                                    <div className="flex flex-col items-center justify-center text-slate-500">
                                        <CheckCircle size={48} className="mb-4 text-slate-700" />
                                        <p className="text-lg font-medium text-slate-400">No pending renewals found</p>
                                        <p className="text-sm">There are no items in this workflow stage.</p>
                                    </div>
                                </td>
                            </tr>
                        ) : filteredRenewals.map(asset => (
                            <tr key={asset.id} className="hover:bg-white/5 transition-colors group">
                                <td className="p-5">
                                    <div className="font-medium text-white text-base">{asset.name}</div>
                                    <div className="text-xs text-slate-500 font-mono mt-0.5">{asset.serial_number}</div>
                                </td>
                                <td className="p-5">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-slate-800 border border-white/5 flex items-center justify-center text-xs font-bold text-slate-400">
                                            {asset.assigned_to?.charAt(0) || 'S'}
                                        </div>
                                        <span className="text-slate-300 text-sm">{asset.assigned_to || 'System Admin'}</span>
                                    </div>
                                </td>
                                <td className="p-5 text-slate-300 font-mono font-medium">₹{asset.renewal_cost?.toLocaleString()}</td>
                                <td className="p-5">
                                    {getStatusBadge(asset.renewal_status)}
                                </td>
                                <td className="p-5 text-right">
                                    {getActionButtons(asset)}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Modals */}
            <RenewalDetailsModal
                renewal={selectedRenewal}
                onClose={() => setSelectedRenewal(null)}
            />

            <RejectModal
                isOpen={rejectModalOpen}
                onClose={() => setRejectModalOpen(false)}
                onConfirm={confirmReject}
            />
        </div>
    )
}
