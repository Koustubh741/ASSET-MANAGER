import { useState } from 'react';
import { Laptop, Ticket, RefreshCw, User, Briefcase, MapPin, Calendar, Building2, Cpu, X, CheckCircle, AlertCircle, Settings, Sparkles, ChevronUp, Smartphone, LogOut, Eye } from 'lucide-react';
import { useRole } from '@/contexts/RoleContext';
import { useAssetContext, ASSET_STATUS, OWNER_ROLE, REQUEST_STATUS } from '@/contexts/AssetContext';
import apiClient from '@/lib/apiClient';

export default function EndUserDashboard() {
    const { currentRole, setCurrentRole, ROLES, logout, user } = useRole();
    const { assets, requests, tickets, createRequest, managerApproveRequest, managerRejectRequest, managerConfirmIT, userAcceptAsset, refreshData } = useAssetContext();
    const [activeModal, setActiveModal] = useState(null); // 'asset' | 'ticket' | 'profile' | null
    const [showSuccess, setShowSuccess] = useState(null); // 'asset-success' | 'ticket-success' | null
    const [selectedRequest, setSelectedRequest] = useState(null); // For viewing details
    const [requestFilter, setRequestFilter] = useState('active'); // 'active' | 'history'

    const handleSubmit = async (e, type) => {
        e.preventDefault();
        const formData = new FormData(e.target);


        if (type === 'asset' || type === 'byod') {
            createRequest({
                assetType: type === 'byod' ? 'BYOD' : (formData.get('type') || 'Laptop'),
                justification: formData.get('reason') || 'No justification provided',
                assetOwnershipType: type === 'byod' ? 'BYOD' : 'COMPANY_OWNED',
                // For BYOD registration, we can include extra details in justification or wait for the registration step
                deviceDetails: type === 'byod' ? {
                    model: formData.get('device_model'),
                    os: formData.get('os_version'),
                    serial: formData.get('serial_number')
                } : null
            });
        } else if (type === 'ticket') {
            // Create support ticket
            try {
                const ticketData = {
                    subject: formData.get('title') || 'Support Request',
                    category: formData.get('category') || 'Other',
                    description: formData.get('description') || 'No description provided',
                    priority: formData.get('priority') || 'MEDIUM',
                    related_asset_id: null, // Can be linked to an asset if needed
                    status: 'OPEN'
                };

                await apiClient.createTicket(ticketData);
                console.log('[End User] Ticket created successfully');
            } catch (error) {
                console.error('[End User] Failed to create ticket:', error);
                alert(`Failed to create ticket: ${error.message}`);
                return;
            }
        }

        setActiveModal(null);
        setShowSuccess(type === 'asset' || type === 'byod' ? 'asset-success' : 'ticket-success');
        setTimeout(() => setShowSuccess(null), 3000);
    };

    const displayProfile = {
        name: user?.name || "Alex Johnson",
        role: user?.position === 'MANAGER' ? 'Manager' : (currentRole?.label || "Senior Software Engineer"),
        empId: user?.employee_id || "EMP-2024-8821",
        company: user?.company || "Acme Corp Global",
        doj: user?.createdAt ? new Date(user.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : "Recently Joined",
        location: user?.location || "New York HQ, Floor 4",
        email: user?.email || "alex.j@acmecorp.com",
        domain: user?.domain || "General",
        department: user?.department || "General"
    };

    // Filter assets assigned to current user and sort by latest assignment first
    const getAssignedAt = (asset) => {
        // Different code paths / data sources use different keys
        const raw =
            asset?.assignment_date ??
            asset?.assignedDate ??
            asset?.assigned_date ??
            asset?.updated_at ??
            asset?.created_at ??
            null;

        if (!raw) return new Date(0);

        const d = new Date(raw);
        return Number.isNaN(d.getTime()) ? new Date(0) : d;
    };

    const assignedAssets = assets
        .filter(a => {
            const matches = (a.assigned_to?.toLowerCase() === (user?.name || 'Alex Johnson').toLowerCase()) &&
                (a.status === ASSET_STATUS.IN_USE || a.status === 'Active' || a.status === 'Reserved');
            return matches;
        })
        .sort((a, b) => {
            const dateA = getAssignedAt(a);
            const dateB = getAssignedAt(b);
            return dateB - dateA; // Latest first
        });

    console.log('--- DASHBOARD ASSET DEBUG ---');
    console.log('CUrrent User Name:', user?.name);
    console.log('Total Assets in context:', assets.length);
    console.log('Assigned Assets found:', assignedAssets.length);
    console.log('----------------------------');

    return (
        <div className="space-y-6 relative">
            {/* Success Toast */}
            {showSuccess && (
                <div className="fixed top-24 right-6 z-50 animate-in slide-in-from-right fade-in duration-300">
                    <div className="bg-emerald-500/10 border border-emerald-500/20 backdrop-blur-md text-emerald-400 px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3">
                        <CheckCircle size={24} />
                        <div>
                            <h4 className="font-bold text-sm">Success!</h4>
                            <p className="text-xs opacity-90">
                                {showSuccess === 'asset-success' ? 'Asset request submitted successfully.' : 'Support ticket raised successfully.'}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Offboarding Banner */}
            {user?.status === 'EXITING' && (
                <div className="bg-orange-500/10 border border-orange-500/20 backdrop-blur-md p-6 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-6 animate-in slide-in-from-top duration-500 shadow-xl shadow-orange-500/10 mb-6">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-orange-500/20 flex items-center justify-center text-orange-400 border border-orange-500/20 shadow-inner">
                            <LogOut size={28} />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-white">Active Offboarding Workflow</h3>
                            <p className="text-orange-200/70 text-sm mt-0.5">Your exit process has been initiated. Please ensure all company assets are returned to IT.</p>
                        </div>
                    </div>
                </div>
            )}

            {/* User Profile Section */}
            <div className="glass-panel p-6 md:p-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-12 bg-blue-500/10 rounded-full blur-3xl"></div>

                <div className="flex flex-col md:flex-row gap-6 relative z-10">
                    <div className="flex-shrink-0">
                        <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                            <span className="text-3xl font-bold text-white">
                                {displayProfile.name.split(' ').map(n => n[0]).join('')}
                            </span>
                        </div>
                    </div>

                    <div className="flex-1 space-y-4">
                        <div>
                            <h1 className="text-3xl font-bold text-white mb-1">{displayProfile.name}</h1>
                            <p className="text-blue-400 font-medium flex items-center gap-2">
                                <Briefcase size={16} /> {displayProfile.role}
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
                            <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                                <p className="text-slate-400 text-xs uppercase mb-1 flex items-center gap-1.5"><Building2 size={12} /> Company</p>
                                <p className="text-white font-semibold text-sm">{displayProfile.company}</p>
                            </div>
                            <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                                <p className="text-slate-400 text-xs uppercase mb-1 flex items-center gap-1.5"><Ticket size={12} /> Employee ID</p>
                                <p className="text-white font-semibold text-sm">{displayProfile.empId}</p>
                            </div>
                            <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                                <p className="text-slate-400 text-xs uppercase mb-1 flex items-center gap-1.5"><Calendar size={12} /> Date of Joining</p>
                                <p className="text-white font-semibold text-sm">{displayProfile.doj}</p>
                            </div>
                            <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                                <p className="text-slate-400 text-xs uppercase mb-1 flex items-center gap-1.5"><MapPin size={12} /> Work Location</p>
                                <p className="text-white font-semibold text-sm">{displayProfile.location}</p>
                            </div>
                            <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                                <p className="text-slate-400 text-xs uppercase mb-1 flex items-center gap-1.5"><Briefcase size={12} className="text-blue-400" /> Department</p>
                                <p className="text-white font-semibold text-sm uppercase">{displayProfile.department}</p>
                            </div>
                            <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                                <p className="text-slate-400 text-xs uppercase mb-1 flex items-center gap-1.5"><Sparkles size={12} className="text-purple-400" /> Domain</p>
                                <p className="text-white font-semibold text-sm uppercase">{displayProfile.domain?.replace('/', ' / ')}</p>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col gap-3 justify-center border-l border-white/10 pl-6 h-full my-auto">
                        <button
                            onClick={() => setActiveModal('profile')}
                            className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-xl flex items-center justify-center gap-2 text-sm font-semibold shadow-lg shadow-indigo-500/20 transition-all active:scale-95"
                        >
                            <User size={18} /> My Profile
                        </button>
                        <button
                            onClick={() => setActiveModal('byod')}
                            className="bg-sky-600 hover:bg-sky-500 text-white px-5 py-2.5 rounded-xl flex items-center justify-center gap-2 text-sm font-semibold shadow-lg shadow-sky-500/20 transition-all active:scale-95"
                        >
                            <Smartphone size={18} /> Register BYOD
                        </button>
                        <button
                            onClick={() => setActiveModal('asset')}
                            className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-xl flex items-center justify-center gap-2 text-sm font-semibold shadow-lg shadow-blue-500/20 transition-all active:scale-95"
                        >
                            <Laptop size={18} /> Request Asset
                        </button>
                        <button
                            onClick={() => setActiveModal('ticket')}
                            className="bg-white/5 hover:bg-white/10 text-white px-5 py-2.5 rounded-xl flex items-center justify-center gap-2 text-sm font-semibold border border-white/10 transition-all active:scale-95"
                        >
                            <Ticket size={18} /> Get Support
                        </button>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Assigned Assets Detail */}
                <div className="lg:col-span-2 space-y-6">
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        <Laptop className="text-blue-400" size={20} /> My Assigned Assets
                    </h3>

                    {assignedAssets.map((asset) => (
                        <div key={asset.id} className="glass-panel p-0 overflow-hidden group hover:border-blue-500/30 transition-all duration-300">
                            <div className="p-6 border-b border-white/5 bg-gradient-to-r from-white/5 to-transparent">
                                <div className="flex justify-between items-start">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center text-blue-400 border border-white/10">
                                            {asset.type === 'Laptop' ? <Laptop size={24} /> : <RefreshCw size={24} />}
                                        </div>
                                        <div>
                                            <h4 className="text-lg font-bold text-white">
                                                {asset.name}
                                                {asset.model && asset.model !== asset.name && <span className="text-slate-400 font-normal text-sm ml-2">({asset.model})</span>}
                                            </h4>
                                            <p className="text-sm text-slate-400 flex items-center gap-2 mt-1">
                                                <span className="bg-slate-700 px-1.5 py-0.5 rounded text-[10px] font-mono text-slate-300">{asset.id}</span>
                                                <span className="w-1 h-1 rounded-full bg-slate-500"></span>
                                                <span>Assigned: {asset.assignment_date || asset.assignedDate || 'Recent'}</span>
                                            </p>
                                        </div>
                                    </div>
                                    <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full text-xs font-semibold">
                                        In Use
                                    </span>
                                </div>
                            </div>

                            <div className="p-6 bg-slate-900/40">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                                    <div>
                                        <p className="text-xs text-slate-500 uppercase mb-2 font-semibold">Asset Specifications</p>
                                        <ul className="space-y-2">
                                            {Object.entries(asset.specifications || asset.specs || {}).map(([key, value]) => (
                                                <li key={key} className="flex items-start gap-2 text-sm text-slate-300">
                                                    <Cpu size={14} className="mt-1 text-slate-500 shrink-0" />
                                                    <span>
                                                        <span className="capitalize text-slate-400">{key}:</span> {String(value)}
                                                    </span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-500 uppercase mb-2 font-semibold">Location & Status</p>
                                        <div className="space-y-3">
                                            <div className="flex items-center gap-2 text-sm text-slate-300 bg-white/5 p-2 rounded-lg">
                                                <MapPin size={14} className="text-amber-400" />
                                                {asset.location}
                                            </div>
                                            <div className="flex items-center gap-2 text-sm text-slate-300 bg-white/5 p-2 rounded-lg">
                                                <Calendar size={14} className="text-blue-400" />
                                                Next Audit: 15th Sept, 2024
                                            </div>
                                        </div>

                                        <div className="mt-4 flex gap-3">
                                            <button
                                                onClick={() => setActiveModal('ticket')}
                                                className="text-xs text-rose-400 hover:text-rose-300 hover:underline"
                                            >
                                                Report Issue
                                            </button>
                                            <button
                                                onClick={() => setActiveModal('asset')}
                                                className="text-xs text-slate-400 hover:text-white hover:underline"
                                            >
                                                Request Upgrade
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Sidebar Widgets */}
                <div className="space-y-6">
                    {/* Asset Procurement Requests List */}
                    <div className="glass-panel p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <Laptop size={20} className="text-blue-400" />
                                <h3 className="text-lg font-bold text-white">Asset Procurement Requests</h3>
                                <button
                                    onClick={() => refreshData?.()}
                                    className="p-1.5 rounded-lg bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 transition-all border border-white/5 active:scale-90 group"
                                    title="Refresh Data"
                                >
                                    <RefreshCw size={14} className="group-active:animate-spin" />
                                </button>
                            </div>
                            <div className="flex bg-slate-900/50 rounded-lg p-1 border border-white/5">
                                <button
                                    onClick={() => setRequestFilter('active')}
                                    className={`px-3 py-1 text-[10px] font-bold rounded transition-all ${requestFilter === 'active' ? 'bg-indigo-500 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                                >
                                    Active
                                </button>
                                <button
                                    onClick={() => setRequestFilter('history')}
                                    className={`px-3 py-1 text-[10px] font-bold rounded transition-all ${requestFilter === 'history' ? 'bg-indigo-500 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                                >
                                    History
                                </button>
                            </div>
                        </div>

                        <div className="space-y-4 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
                            {requests.filter(req => {
                                const isCompleted = ['FULFILLED', 'REJECTED', 'CLOSED', 'CANCELLED'].includes(req.status);
                                return requestFilter === 'active' ? !isCompleted : isCompleted;
                            }).length === 0 ? (
                                <div className="text-center py-8">
                                    <div className="w-12 h-12 rounded-full bg-slate-800/50 flex items-center justify-center mx-auto mb-3 border border-white/5">
                                        <Briefcase className="text-slate-600" size={20} />
                                    </div>
                                    <p className="text-slate-500 text-xs">No {requestFilter} asset requests found.</p>
                                </div>
                            ) : requests
                                .filter(req => {
                                    const isCompleted = ['FULFILLED', 'REJECTED', 'CLOSED', 'CANCELLED'].includes(req.status);
                                    return requestFilter === 'active' ? !isCompleted : isCompleted;
                                })
                                .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
                                .map(req => (
                                    <div
                                        key={req.id}
                                        onClick={() => setSelectedRequest(req)}
                                        className="p-3 rounded-xl bg-white/5 border border-white/5 hover:border-indigo-500/30 hover:shadow-md hover:bg-white/[0.07] transition-all cursor-pointer group relative overflow-hidden"
                                    >
                                        <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-white/5 to-transparent rounded-bl-3xl opacity-0 group-hover:opacity-100 transition-opacity"></div>

                                        <div className="flex justify-between items-start mb-2 relative z-10">
                                            <div className="flex flex-col items-end">
                                                <span className={`px-2 py-0.5 text-[10px] rounded font-medium border 
                                                    ${req.status === 'FULFILLED' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                                        req.status === 'IT_APPROVED' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                                                            req.status === 'IN_PROGRESS' ? 'bg-sky-500/10 text-sky-400 border-sky-500/20' :
                                                                req.status === 'PROCUREMENT_REQUIRED' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                                                                    req.status === 'REJECTED' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' :
                                                                        'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'}`}>
                                                    {req.status}
                                                </span>
                                            </div>
                                            <span className="text-[10px] text-slate-500 font-mono">{new Date(req.createdAt).toLocaleDateString()}</span>
                                        </div>

                                        <div className="flex items-center gap-2 mb-1.5 relative z-10">
                                            <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400">
                                                <Laptop size={14} />
                                            </div>
                                            <div>
                                                <h4 className="text-sm font-bold text-white leading-tight">{req.assetType} Request</h4>
                                                <div className="flex flex-col mt-0.5">
                                                    <p className="text-[10px] font-medium text-slate-300">
                                                        {req.requestedBy?.name || req.requester_name}
                                                    </p>
                                                    <p className="text-[9px] text-slate-500 truncate max-w-[150px] italic">
                                                        {req.requestedBy?.email || req.requester_email || req.id.split('-')[0]}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        {req.justification && (
                                            <p className="text-[11px] text-slate-400 mb-2 line-clamp-2 bg-slate-900/30 p-2 rounded-lg border border-white/5">
                                                {req.justification}
                                            </p>
                                        )}

                                        {req.status === REQUEST_STATUS.USER_ACCEPTANCE_PENDING && (
                                            <div className="mt-3 relative z-10">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        if (confirm(`Confirm you have received the ${req.assetType}?`)) {
                                                            userAcceptAsset(req.id);
                                                        }
                                                    }}
                                                    className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold rounded-lg shadow-lg shadow-emerald-500/20 transition-all active:scale-95 flex items-center justify-center gap-1.5"
                                                >
                                                    <CheckCircle size={14} /> Confirm Acceptance
                                                </button>
                                            </div>
                                        )}

                                        <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/5 relative z-10">
                                            <div className="flex items-center gap-1.5">
                                                <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></div>
                                                <span className="text-[10px] text-indigo-300 font-medium">With: {req.currentOwnerRole}</span>
                                                {req.requester_department && (
                                                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/10 text-slate-400 border border-white/5">
                                                        Dept: {req.requester_department}
                                                    </span>
                                                )}
                                            </div>
                                            {req.procurementStage &&
                                                req.procurementStage !== 'AWAITING_DECISION' &&
                                                req.status !== 'FULFILLED' && (
                                                    <span className="text-[10px] flex items-center gap-1 text-amber-400">
                                                        <Building2 size={10} /> Procurement
                                                    </span>
                                                )}
                                        </div>
                                    </div>
                                ))}
                        </div>
                    </div>

                    {/* Support & Technical Tickets List */}
                    <div className="glass-panel p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <Ticket size={20} className="text-rose-400" />
                                <h3 className="text-lg font-bold text-white">Support & Technical Tickets</h3>
                            </div>
                        </div>

                        <div className="space-y-4 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
                            {tickets.filter(t => {
                                const isCompleted = ['CLOSED', 'RESOLVED', 'REJECTED', 'CANCELLED'].includes(t.status?.toUpperCase());
                                return requestFilter === 'active' ? !isCompleted : isCompleted;
                            }).length === 0 ? (
                                <div className="text-center py-8">
                                    <div className="w-12 h-12 rounded-full bg-slate-800/50 flex items-center justify-center mx-auto mb-3 border border-white/5">
                                        <Ticket className="text-slate-600" size={20} />
                                    </div>
                                    <p className="text-slate-500 text-xs">No {requestFilter} support tickets found.</p>
                                </div>
                            ) : tickets
                                .filter(t => {
                                    const isCompleted = ['CLOSED', 'RESOLVED', 'REJECTED', 'CANCELLED'].includes(t.status?.toUpperCase());
                                    return requestFilter === 'active' ? !isCompleted : isCompleted;
                                })
                                .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
                                .map(ticket => (
                                    <div
                                        key={ticket.id}
                                        onClick={() => setSelectedRequest(ticket)}
                                        className="p-3 rounded-xl bg-white/5 border border-white/5 hover:border-rose-500/30 hover:shadow-md hover:bg-white/[0.07] transition-all cursor-pointer group relative overflow-hidden"
                                    >
                                        <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-white/5 to-transparent rounded-bl-3xl opacity-0 group-hover:opacity-100 transition-opacity"></div>

                                        <div className="flex justify-between items-start mb-2 relative z-10">
                                            <div className="flex flex-col items-end">
                                                <span className={`px-2 py-0.5 text-[10px] rounded font-medium border 
                                                    ${ticket.status === 'RESOLVED' || ticket.status === 'CLOSED' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                                        ticket.status === 'OPEN' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                                                            ticket.status === 'IN_PROGRESS' ? 'bg-sky-500/10 text-sky-400 border-sky-500/20' :
                                                                'bg-rose-500/10 text-rose-400 border-rose-500/20'}`}>
                                                    {ticket.status}
                                                </span>
                                                {ticket.resolution_percentage > 0 && (
                                                    <span className="text-[9px] text-indigo-400 font-bold mt-1">
                                                        {Math.round(ticket.resolution_percentage)}% Fixed
                                                    </span>
                                                )}
                                            </div>
                                            <span className="text-[10px] text-slate-500 font-mono">{new Date(ticket.createdAt).toLocaleDateString()}</span>
                                        </div>

                                        <div className="flex items-center gap-2 mb-1.5 relative z-10">
                                            <div className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400">
                                                <Ticket size={14} />
                                            </div>
                                            <div>
                                                <h4 className="text-sm font-bold text-white leading-tight">{ticket.subject || 'Support Ticket'}</h4>
                                                <div className="flex flex-col mt-0.5">
                                                    <p className="text-[10px] font-medium text-slate-300">
                                                        {ticket.requestor_name || 'Anonymous User'}
                                                    </p>
                                                    <p className="text-[9px] text-rose-400/70 truncate max-w-[150px] italic">
                                                        {ticket.requestor_email || ticket.id.split('-')[0]}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        {ticket.description && (
                                            <p className="text-[11px] text-slate-400 mb-2 line-clamp-2 bg-slate-900/30 p-2 rounded-lg border border-white/5">
                                                {ticket.description}
                                            </p>
                                        )}

                                        <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/5 relative z-10">
                                            <div className="flex items-center gap-1.5">
                                                <div className={`w-1.5 h-1.5 rounded-full ${ticket.priority === 'HIGH' ? 'bg-rose-500' : 'bg-amber-500'} animate-pulse`}></div>
                                                <span className="text-[10px] text-slate-300 font-medium">Priority: {ticket.priority}</span>
                                            </div>
                                            <div className="flex flex-col items-end gap-1">
                                                <span className="text-[10px] text-slate-500">{ticket.category}</span>
                                                {ticket.requestor_department && (
                                                    <span className="text-[9px] text-rose-400 font-medium">Dept: {ticket.requestor_department}</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                        </div>
                    </div>

                    {/* Quick Policies */}
                    <div className="glass-panel p-6">
                        <h3 className="text-lg font-bold text-white mb-4">IT Policies</h3>
                        <ul className="text-sm space-y-3 text-slate-400">
                            <li className="flex items-start gap-2 hover:text-blue-300 cursor-pointer transition-colors">
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5"></span>
                                Acceptable Use Policy
                            </li>
                            <li className="flex items-start gap-2 hover:text-blue-300 cursor-pointer transition-colors">
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5"></span>
                                Data Security Guidelines
                            </li>
                            <li className="flex items-start gap-2 hover:text-blue-300 cursor-pointer transition-colors">
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5"></span>
                                Remote Work Asset Standards
                            </li>
                        </ul>
                    </div>
                </div>
            </div>

            {/* MANAGER APPROVAL SECTION */}
            {(user?.position === 'MANAGER' || currentRole?.label === 'Manager') && (
                <div className="glass-panel p-6 border-t-4 border-indigo-500 mt-8">
                    <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                        <Briefcase className="text-indigo-400" /> Team Approvals Needed
                    </h3>

                    {requests.filter(r => r.currentOwnerRole === OWNER_ROLE.MANAGER).length === 0 ? (
                        <p className="text-slate-400 text-sm">No pending approvals for your team.</p>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {requests.filter(r => r.currentOwnerRole === OWNER_ROLE.MANAGER).map(req => (
                                <div key={req.id} className="p-4 bg-slate-800 rounded-xl border border-white/10 flex justify-between items-center group hover:border-indigo-500/50 transition-all">
                                    <div>
                                        <div className="flex items-center justify-between gap-2">
                                            <div className="flex items-center gap-2">
                                                <h4 className="font-bold text-white">{req.assetType} Request</h4>
                                                {req.assetType === 'BYOD' && <span className="text-[10px] bg-sky-500/20 text-sky-300 px-1.5 rounded border border-sky-500/30">BYOD</span>}
                                            </div>
                                            <span className="text-[10px] text-slate-500">{new Date(req.createdAt).toLocaleString()}</span>
                                        </div>
                                        <div className="mt-2 space-y-0.5">
                                            <p className="text-xs text-slate-400">Sent by: <span className="text-indigo-300 font-semibold">{req.requestedBy?.name || req.requester_name}</span></p>
                                            <p className="text-[10px] text-slate-500 font-medium">Department: <span className="text-slate-300">{req.requester_department || 'General'}</span></p>
                                            <p className="text-[10px] text-slate-500 italic">{req.requestedBy?.email || req.requester_email || 'No email provided'}</p>
                                        </div>
                                        <p className="text-xs text-slate-500 mt-0.5 truncate max-w-[200px]">{req.justification || req.reason || 'No justification'}</p>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setSelectedRequest(req)}
                                            className="p-2 text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors"
                                            title="View Details"
                                        >
                                            <Eye size={18} />
                                        </button>
                                        <button
                                            onClick={() => {
                                                const reason = prompt("Reason for rejection:");
                                                if (reason) {
                                                    managerRejectRequest(req.id, reason, user.id, user.name);
                                                }
                                            }}
                                            className="p-2 text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors" title="Reject">
                                            <X size={18} />
                                        </button>

                                        {req.status === REQUEST_STATUS.IT_APPROVED ? (
                                            <button
                                                onClick={() => {
                                                    managerConfirmIT(req.id, 'CONFIRM', 'IT technical decision confirmed by manager');
                                                }}
                                                className="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold rounded-lg shadow-lg shadow-sky-500/20"
                                            >
                                                Confirm IT Decision
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => {
                                                    managerApproveRequest(req.id, user.id, user.name);
                                                }}
                                                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg shadow-lg shadow-indigo-500/20"
                                            >
                                                Approve
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* MANAGER HISTORY */}
                    <div className="mt-8 pt-6 border-t border-white/5">
                        <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Request History</h4>
                        <div className="space-y-3">
                            {requests.filter(r => r.currentOwnerRole !== OWNER_ROLE.MANAGER).length === 0 ? (
                                <p className="text-slate-500 text-xs italic">No history available.</p>
                            ) : requests.filter(r => r.currentOwnerRole !== OWNER_ROLE.MANAGER).map(req => (
                                <div key={req.id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/5 opacity-75 hover:opacity-100 transition-opacity">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-2 h-2 rounded-full ${req.status === 'REJECTED' ? 'bg-rose-500' : 'bg-emerald-500'}`}></div>
                                        <div>
                                            <p className="text-sm font-medium text-white">{req.assetType} Request</p>
                                            <div className="flex flex-col mt-0.5">
                                                <p className="text-xs text-slate-400">Sent by: <span className="text-slate-200">{req.requestedBy?.name || req.requester_name}</span></p>
                                                <div className="flex flex-col mt-0.5">
                                                    <p className="text-[10px] text-slate-500 truncate max-w-[180px] italic">{req.requestedBy?.email || req.requester_email}</p>
                                                    <div className="flex items-center gap-2 mt-0.5">
                                                        <span className="text-[10px] text-indigo-400 font-medium">Dept: {req.requester_department || 'General'}</span>
                                                        <span className="text-[10px] text-slate-600">{new Date(req.createdAt).toLocaleString()}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <span className={`text-[10px] px-2 py-1 rounded border ${req.status === 'MANAGER_APPROVED' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                                            req.status === 'REJECTED' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' :
                                                'bg-slate-500/10 text-slate-400'
                                            }`}>
                                            {req.status}
                                        </span>
                                        <p className="text-[10px] text-slate-500 mt-1">Current: {req.currentOwnerRole}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* MODALS */}
            {
                activeModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
                        <div className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">

                            {/* Modal Header */}
                            <div className="px-6 py-4 border-b border-white/10 flex justify-between items-center bg-white/5">
                                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                    {activeModal === 'asset' && <Laptop className="text-blue-400" size={20} />}
                                    {activeModal === 'byod' && <Smartphone className="text-sky-400" size={20} />}
                                    {activeModal === 'ticket' && <Ticket className="text-blue-400" size={20} />}
                                    {activeModal === 'profile' && <User className="text-blue-400" size={20} />}

                                    {activeModal === 'asset' && 'Request New Asset'}
                                    {activeModal === 'byod' && 'Register BYOD Device'}
                                    {activeModal === 'ticket' && 'Raise Support Ticket'}
                                    {activeModal === 'profile' && 'My Profile'}
                                </h3>
                                <button
                                    onClick={() => setActiveModal(null)}
                                    className="text-slate-400 hover:text-white transition-colors"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            {/* Modal Body */}
                            {activeModal !== 'profile' ? (
                                <form onSubmit={(e) => handleSubmit(e, activeModal)} className="p-6 space-y-4">
                                    {activeModal === 'asset' ? (
                                        <>
                                            <div>
                                                <label className="block text-sm font-medium text-slate-300 mb-1.5">Asset Type</label>
                                                <select name="type" className="w-full bg-slate-800 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                                                    <option value="Laptop">Laptop (Standard)</option>
                                                    <option value="BYOD">BYOD (Bring Your Own Device)</option>
                                                    <option value="Laptop_HighPerf">Laptop (High Performance)</option>
                                                    <option value="Monitor">Monitor</option>
                                                    <option value="Peripheral">Peripheral (Keyboard/Mouse)</option>
                                                    <option value="Software">Software License</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-slate-300 mb-1.5">Reason for Request</label>
                                                <textarea
                                                    name="reason"
                                                    rows="3"
                                                    className="w-full bg-slate-800 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                    placeholder="e.g., Current laptop is slow, Need monitor for dual-screen setup..."
                                                ></textarea>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-slate-300 mb-1.5">Urgency</label>
                                                <div className="flex gap-4">
                                                    <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                                                        <input type="radio" name="urgency" className="text-blue-500" defaultChecked /> Standard
                                                    </label>
                                                    <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                                                        <input type="radio" name="urgency" className="text-blue-500" /> high
                                                    </label>
                                                </div>
                                            </div>
                                        </>
                                    ) : activeModal === 'byod' ? (
                                        <>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-sm font-medium text-slate-300 mb-1.5">Device Model</label>
                                                    <input
                                                        type="text"
                                                        name="device_model"
                                                        required
                                                        placeholder="e.g. MacBook Pro, Dell XPS"
                                                        className="w-full bg-slate-800 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-slate-300 mb-1.5">OS Version</label>
                                                    <input
                                                        type="text"
                                                        name="os_version"
                                                        required
                                                        placeholder="e.g. macOS Sonoma, Win 11"
                                                        className="w-full bg-slate-800 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                                                    />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-slate-300 mb-1.5">Serial Number</label>
                                                <input
                                                    type="text"
                                                    name="serial_number"
                                                    required
                                                    className="w-full bg-slate-800 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-slate-300 mb-1.5">Usage Justification</label>
                                                <textarea
                                                    name="reason"
                                                    rows="2"
                                                    className="w-full bg-slate-800 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                                                    placeholder="Why do you need to use your personal device for work?"
                                                ></textarea>
                                            </div>
                                            <div className="bg-sky-500/10 border border-sky-500/20 p-3 rounded-lg flex gap-3">
                                                <AlertCircle className="text-sky-400 shrink-0" size={18} />
                                                <p className="text-[11px] text-sky-200">
                                                    By registering, you agree to comply with the company's BYOD security policy and data access guidelines.
                                                </p>
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <div>
                                                <label className="block text-sm font-medium text-slate-300 mb-1.5">Subject</label>
                                                <input
                                                    type="text"
                                                    name="title"
                                                    required
                                                    className="w-full bg-slate-800 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                    placeholder="Brief summary of the issue"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-slate-300 mb-1.5">Issue Category</label>
                                                <select name="category" className="w-full bg-slate-800 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                                                    <option value="Hardware Fault">Hardware Fault</option>
                                                    <option value="Software / OS Issue">Software / OS Issue</option>
                                                    <option value="Network / VPN">Network / VPN</option>
                                                    <option value="Access / Permissions">Access / Permissions</option>
                                                    <option value="Other">Other</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-slate-300 mb-1.5">Description</label>
                                                <textarea
                                                    name="description"
                                                    rows="4"
                                                    className="w-full bg-slate-800 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                    placeholder="Describe the issue in detail..."
                                                ></textarea>
                                            </div>
                                            <div className="bg-amber-500/10 border border-amber-500/20 p-3 rounded-lg flex gap-3">
                                                <AlertCircle className="text-amber-400 shrink-0" size={18} />
                                                <p className="text-xs text-amber-200">
                                                    For critical outages blocking your work, please call the IT Helpdesk directly at x4499.
                                                </p>
                                            </div>
                                        </>
                                    )}

                                    {/* Modal Footer */}
                                    <div className="pt-4 flex gap-3">
                                        <button
                                            type="button"
                                            onClick={() => setActiveModal(null)}
                                            className="flex-1 bg-white/5 hover:bg-white/10 text-white py-2.5 rounded-lg font-medium transition-colors border border-white/10"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-2.5 rounded-lg font-bold shadow-lg shadow-blue-500/20 transition-colors"
                                        >
                                            {activeModal === 'asset' ? 'Submit Request' : activeModal === 'byod' ? 'Register Device' : 'Create Ticket'}
                                        </button>
                                    </div>
                                </form>
                            ) : (
                                // PROFILE MODAL CONTENT
                                <div className="p-8 space-y-8 custom-scrollbar max-h-[80vh] overflow-y-auto">
                                    <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-8 flex flex-col md:flex-row items-center gap-6 shadow-lg relative overflow-hidden">
                                        <div className="absolute top-0 right-0 p-16 bg-white/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
                                        <div className="w-24 h-24 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border-4 border-white/10 shrink-0 shadow-xl">
                                            <span className="text-3xl font-bold text-white">AJ</span>
                                        </div>
                                        <div className="flex-1 text-center md:text-left">
                                            <h3 className="text-2xl font-bold text-white mb-1">Alex Johnson</h3>
                                            <p className="text-blue-100 mb-0.5">alex.j@acmecorp.com</p>
                                            <p className="text-blue-200 text-sm opacity-80">{user?.department || "General"} • {currentRole.label}</p>
                                        </div>
                                        <div className="flex gap-3 relative z-10">
                                            <button className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm font-semibold backdrop-blur-sm border border-white/10 transition-colors">
                                                Change Password
                                            </button>
                                            <button
                                                onClick={() => {
                                                    logout();
                                                    window.location.href = '/login';
                                                }}
                                                className="px-4 py-2 bg-rose-500/20 hover:bg-rose-500/30 text-rose-100 hover:text-white rounded-lg text-sm font-semibold backdrop-blur-sm border border-rose-500/20 transition-colors"
                                            >
                                                Logout
                                            </button>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 gap-8">
                                        <div className="glass-panel p-6 space-y-6 bg-slate-800/50">
                                            <div className="flex items-center gap-3 mb-4">
                                                <div className="p-2 bg-purple-500/10 rounded-lg text-purple-400">
                                                    <Settings size={20} />
                                                </div>
                                                <h4 className="text-lg font-bold text-white">Account Information</h4>
                                            </div>
                                        </div>
                                        {/* Security */}
                                        <div className="glass-panel p-6 space-y-6">
                                            <div className="flex items-center gap-3 mb-4">
                                                <div className="p-2 bg-amber-500/10 rounded-lg text-amber-400">
                                                    <Sparkles size={20} />
                                                </div>
                                                <h4 className="text-lg font-bold text-white">Security</h4>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div className="border border-white/5 rounded-xl p-4 flex items-center justify-between hover:bg-white/5 transition-colors group">
                                                    <div>
                                                        <h5 className="font-semibold text-white mb-1">Password</h5>
                                                        <p className="text-xs text-slate-400">Last changed 3 months ago</p>
                                                    </div>
                                                    <button className="text-sm font-semibold text-blue-400 group-hover:text-blue-300">Change</button>
                                                </div>
                                                <div className="border border-white/5 rounded-xl p-4 flex items-center justify-between hover:bg-white/5 transition-colors group">
                                                    <div>
                                                        <h5 className="font-semibold text-white mb-1">Two-Factor Authentication</h5>
                                                        <p className="text-xs text-slate-400">Add an extra layer of security</p>
                                                    </div>
                                                    <button className="text-sm font-semibold text-blue-400 group-hover:text-blue-300">Enable</button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )
            }

            {/* Request Details Modal */}
            {
                selectedRequest && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                        <div className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[85vh] overflow-hidden animate-in zoom-in-95 duration-200">
                            {/* Header */}
                            <div className="p-6 border-b border-white/10 bg-white/5 flex justify-between items-start">
                                <div>
                                    <div className="flex items-center gap-3 mb-2">
                                        <span className={`px-2 py-0.5 text-xs rounded font-bold border 
                                        ${selectedRequest.status === 'FULFILLED' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                                selectedRequest.status === 'IT_APPROVED' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                                                    selectedRequest.status === 'IN_PROGRESS' ? 'bg-sky-500/10 text-sky-400 border-sky-500/20' :
                                                        selectedRequest.status === 'PROCUREMENT_REQUIRED' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                                                            selectedRequest.status === 'REJECTED' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' :
                                                                'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'}`}>
                                            {selectedRequest.status}
                                        </span>
                                        <span className="text-xs text-slate-400 font-mono">{selectedRequest.id}</span>
                                    </div>
                                    <h3 className="text-xl font-bold text-white">{selectedRequest.assetType} Request</h3>
                                </div>
                                <button onClick={() => setSelectedRequest(null)} className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10">
                                    <X size={20} />
                                </button>
                            </div>

                            {/* Content */}
                            <div className="p-6 overflow-y-auto custom-scrollbar space-y-6">
                                {/* Details */}
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Asset Type</label>
                                        <p className="text-white text-sm mt-1 font-medium">{selectedRequest.assetType}</p>
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Justification</label>
                                        <p className="text-slate-300 text-sm mt-1 leading-relaxed bg-white/5 p-3 rounded-lg border border-white/5">
                                            {selectedRequest.justification}
                                        </p>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Current Owner</label>
                                            <div className="text-white text-sm font-medium mt-1 flex items-center gap-2">
                                                <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></div>
                                                {selectedRequest.currentOwnerRole}
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Inventory Check</label>
                                            <div className="text-white text-sm font-medium mt-1">{selectedRequest.inventoryDecision || 'Pending'}</div>
                                        </div>
                                    </div>
                                    {selectedRequest.procurementStage && (
                                        <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-xl">
                                            <label className="text-xs font-bold text-amber-400 uppercase tracking-wider">Procurement Stage</label>
                                            <p className="text-amber-200 text-sm mt-1 font-medium">📦 {selectedRequest.procurementStage.replace(/_/g, ' ')}</p>
                                        </div>
                                    )}
                                    {selectedRequest.rejectionReason && (
                                        <div className="bg-rose-500/10 border border-rose-500/20 p-4 rounded-xl">
                                            <label className="text-xs font-bold text-rose-400 uppercase tracking-wider flex items-center gap-1">
                                                <AlertCircle size={12} /> Rejection Reason
                                            </label>
                                            <p className="text-rose-200 text-sm mt-1">{selectedRequest.rejectionReason}</p>
                                        </div>
                                    )}

                                    {/* Resolution Progress for Tickets */}
                                    {selectedRequest.assetType === 'Ticket' && (selectedRequest.resolution_percentage > 0 || selectedRequest.resolution_checklist?.length > 0) && (
                                        <div className="bg-indigo-500/10 border border-indigo-500/20 p-4 rounded-xl space-y-4">
                                            <div className="flex justify-between items-center">
                                                <label className="text-xs font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-2">
                                                    <CheckCircle size={14} /> Resolution Progress
                                                </label>
                                                <span className="text-sm font-bold text-white">{Math.round(selectedRequest.resolution_percentage)}%</span>
                                            </div>

                                            {/* Progress Bar */}
                                            <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-indigo-500 transition-all duration-1000"
                                                    style={{ width: `${selectedRequest.resolution_percentage}%` }}
                                                ></div>
                                            </div>

                                            {selectedRequest.resolution_checklist?.length > 0 && (
                                                <div className="space-y-2 pt-2 border-t border-indigo-500/20">
                                                    <p className="text-[10px] text-slate-500 uppercase font-bold">Verification Steps</p>
                                                    {selectedRequest.resolution_checklist.map((item, idx) => (
                                                        <div key={idx} className="flex items-center gap-2 text-xs">
                                                            <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center border ${item.checked ? 'bg-indigo-500 border-indigo-400 text-white' : 'border-slate-600 text-transparent'}`}>
                                                                <CheckCircle size={10} />
                                                            </div>
                                                            <span className={item.checked ? 'text-slate-200' : 'text-slate-500'}>{item.text}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            {selectedRequest.resolution_notes && (
                                                <div className="bg-slate-900/50 p-2.5 rounded border border-white/5">
                                                    <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Latest Fix Notes</p>
                                                    <p className="text-xs text-slate-300 italic">"{selectedRequest.resolution_notes}"</p>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Audit Trail */}
                                <div>
                                    <h4 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                                        <span className="w-1 h-4 bg-blue-500 rounded-full"></span>
                                        Activity Log
                                    </h4>
                                    <div className="space-y-4 relative before:absolute before:left-2 before:top-2 before:bottom-0 before:w-0.5 before:bg-white/10">
                                        {(selectedRequest.auditTrail || selectedRequest.timeline || []).length > 0 ? (selectedRequest.auditTrail || selectedRequest.timeline).map((log, idx) => (
                                            <div key={idx} className="relative pl-8">
                                                <div className={`absolute left-0 top-1 w-4 h-4 rounded-full border-2 border-slate-900 
                                                ${(log.action || '').includes('CREATED') ? 'bg-blue-500' :
                                                        (log.action || '').includes('ACK') ? 'bg-sky-500' :
                                                            (log.action || '').includes('PROGRESS') ? 'bg-indigo-500' :
                                                                (log.action || '').includes('APPROVE') || (log.action || '').includes('RESOLVE') ? 'bg-emerald-500' :
                                                                    (log.action || '').includes('REJECT') ? 'bg-rose-500' :
                                                                        'bg-slate-500'}`}></div>
                                                <div className="flex flex-col">
                                                    <span className="text-xs text-slate-500">{new Date(log.timestamp || log.date).toLocaleString()}</span>
                                                    <div className="flex justify-between items-start">
                                                        <span className="text-sm font-bold text-slate-200">{log.action || log.status || 'Update'}</span>
                                                        {log.percentage !== undefined && (
                                                            <span className="text-[10px] bg-indigo-500/10 text-indigo-400 px-1.5 py-0.5 rounded border border-indigo-500/20">
                                                                {log.percentage}%
                                                            </span>
                                                        )}
                                                    </div>
                                                    <span className="text-xs text-slate-400">
                                                        by {log.byRole || log.role || 'System'} ({log.byUser || log.user || 'Automation'})
                                                    </span>
                                                    {(log.comment || log.notes) && <p className="text-xs text-slate-300 mt-1 italic border-l-2 border-white/5 pl-2">
                                                        "{log.comment || log.notes}"
                                                    </p>}
                                                </div>
                                            </div>
                                        )) : (
                                            <div className="relative pl-8 py-4">
                                                <p className="text-xs text-slate-500 italic">No activity recorded for this request.</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="p-4 border-t border-white/10 bg-white/5 flex justify-end gap-3">
                                {selectedRequest.status === REQUEST_STATUS.USER_ACCEPTANCE_PENDING && (
                                    <button
                                        onClick={() => {
                                            if (confirm(`Confirm you have received the ${selectedRequest.assetType}?`)) {
                                                userAcceptAsset(selectedRequest.id);
                                                setSelectedRequest(null);
                                            }
                                        }}
                                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-bold shadow-lg shadow-emerald-500/20 transition-all active:scale-95 flex items-center gap-2"
                                    >
                                        <CheckCircle size={18} /> Confirm Acceptance
                                    </button>
                                )}
                                <button
                                    onClick={() => setSelectedRequest(null)}
                                    className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm font-semibold transition-colors"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    )
}

