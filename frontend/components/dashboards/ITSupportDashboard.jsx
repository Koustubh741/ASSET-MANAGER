import { useState, useEffect } from 'react';
import { Wrench, ShieldCheck, Terminal, AlertCircle, X, CheckCircle, Play, Server, Lock, Activity, ArrowRight, Trash2, Clock, MapPin, User, FileText, Check, MoreHorizontal, Printer, ChevronRight, Eye, Ticket } from 'lucide-react';
import apiClient from '@/lib/apiClient';
import { useToast } from '@/components/common/Toast';
import ComplianceCheckModal from '@/components/ComplianceCheckModal';
import { useAssetContext, ASSET_STATUS } from '@/contexts/AssetContext';
import { useRole } from '@/contexts/RoleContext';
import ActionsNeededBanner from '@/components/common/ActionsNeededBanner';

// Helper Component for Manual Install Items (Step 2 of Config)
const SoftwareInstallItem = ({ app }) => {
    const [status, setStatus] = useState('pending'); // pending | installing | installed

    const handleInstall = () => {
        setStatus('installing');
        setTimeout(() => setStatus('installed'), 1500);
    };

    return (
        <div className="flex items-center justify-between p-3 bg-slate-800 rounded-lg border border-white/5">
            <div className="flex items-center gap-3">
                <div className="p-1.5 bg-slate-700 rounded text-slate-300">
                    <Server size={14} />
                </div>
                <span className="text-sm text-slate-200 font-medium">{app}</span>
            </div>

            {status === 'pending' && (
                <button
                    onClick={handleInstall}
                    className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded transition-colors"
                >
                    Install
                </button>
            )}

            {status === 'installing' && (
                <span className="text-xs text-indigo-400 flex items-center gap-2">
                    <div className="w-3 h-3 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin"></div>
                    Pushing...
                </span>
            )}

            {status === 'installed' && (
                <span className="text-xs bg-emerald-500/10 text-emerald-400 px-2 py-1 rounded flex items-center gap-1 border border-emerald-500/20">
                    <Check size={12} /> Installed
                </span>
            )}
        </div>
    );
};

export default function ITSupportDashboard() {
    const toast = useToast();
    const { user } = useRole();
    const { assets, updateAssetStatus, requests, tickets, itApproveRequest, itRejectRequest, registerByod, exitRequests, processExitByod, refreshData } = useAssetContext();

    // Derived state for queues instead of static state
    const pendingQueue = assets.filter(a => a.status === ASSET_STATUS.ALLOCATED || a.status === ASSET_STATUS.CONFIGURING);

    // 1. Incoming Asset Requests (Awaiting IT Management Action)
    // NOTE: `AssetContext` merges Tickets into `requests` for some dashboards.
    // Tickets must NOT be routed through the asset-request IT approval endpoint.
    const incomingRequests = requests.filter(r =>
        r.assetType !== 'Ticket' &&
        r.currentOwnerRole === 'IT_MANAGEMENT' &&
        (r.status === 'MANAGER_APPROVED' || r.status === 'IT_APPROVED' || r.status === 'REQUESTED' || r.status === 'BYOD_COMPLIANCE_CHECK')
    );

    // Global tickets state is now provided by AssetContext

    // Active Support Tickets (OPEN status)
    const activeTickets = tickets.filter(t => t.status?.toUpperCase() === 'OPEN' || t.status?.toUpperCase() === 'IN_PROGRESS');

    // Deployment Queue: Assets ready for deployment
    const deployedArgs = assets.filter(a => a.status === ASSET_STATUS.READY_FOR_DEPLOYMENT);

    // Disposal Queue: Assets marked for scrap
    const disposalItems = assets.filter(a => a.status === ASSET_STATUS.SCRAP_CANDIDATE);

    // Discovery Queue: Assets found by agent
    const discoveredAssets = assets.filter(a => a.status === ASSET_STATUS.DISCOVERED);

    // Legacy fallback states (if we need to write to anything local, but ideally we write to context)
    // We don't need setPendingQueue anymore as it drives from Context.

    // STATE: Modals & Workflows
    const [activeModal, setActiveModal] = useState(null); // 'PENDING', 'TICKETS', 'DEPLOY', 'DISPOSAL', 'CONFIG', 'RESOLVE_TICKET'
    const [selectedItem, setSelectedItem] = useState(null);

    // STATE: Config Wizard
    const [configStep, setConfigStep] = useState(1);

    // STATE: Ticket Resolution
    const [resolutionNotes, setResolutionNotes] = useState('');
    const [resolutionType, setResolutionType] = useState('Fixed');
    const [activeChecklist, setActiveChecklist] = useState([]);

    // STATE: BYOD Compliance Modal
    const [complianceModalOpen, setComplianceModalOpen] = useState(false);

    // --- WORKFLOW ACTIONS ---

    // 1. CONFIGURATION WORKFLOW
    const startConfig = (item) => {
        setSelectedItem(item);
        setConfigStep(1);
        setActiveModal('CONFIG');
    };

    const handleConfigStepComplete = () => {
        if (configStep < 5) {
            setConfigStep(prev => prev + 1);
        } else {
            // FINISH CONFIGURATION
            // Update asset status in Context
            updateAssetStatus(selectedItem.id, ASSET_STATUS.READY_FOR_DEPLOYMENT);

            // UI Cleanup
            setActiveModal(null);
            setSelectedItem(null);
        }
    };

    // 2. DISPOSAL WORKFLOW
    const handleStartWipe = (id) => {
        // Mock wipe start
        toast.info(`Secure Wipe started for Asset ID ${id}. This will take approx 45 mins.`);
    };

    const handleMarkDisposed = (id) => {
        if (confirm("Confirm disposal? This action is irreversible.")) {
            updateAssetStatus(id, ASSET_STATUS.DISPOSED); // or RETIRED
        }
    };

    // 3. DEPLOYMENT WORKFLOW
    const handleHandover = (item) => {
        toast.success(`Handover protocol initiated for ${item.assignedUser}. Email notification sent.`);
        updateAssetStatus(item.id, ASSET_STATUS.IN_USE);
    };

    const handleGenerateAck = (item) => {
        toast.info(`Generating PDF Acknowledgement for ${item.name} (${item.id})...`);
    };

    // 4. TICKET RESOLUTION WORKFLOW
    const openResolveModal = (ticket) => {
        setSelectedItem(ticket);
        setResolutionNotes(ticket.resolution_notes || '');
        setResolutionType('Fixed');
        // Reset Wizard but keep existing checklist
        setConfigStep(1);
        setActiveChecklist(ticket.resolution_checklist || []);
        setActiveModal('RESOLVE_TICKET');
    };

    const submitResolution = () => {
        if (!resolutionNotes) {
            toast.error("Please enter troubleshooting notes.");
            return;
        }

        // Calculate Percentage
        const total = activeChecklist.length;
        const checked = activeChecklist.filter(i => i.checked).length;
        const percentage = total > 0 ? (checked / total) * 100 : 0;

        // Resolve logic
        resolveTicket(selectedItem.id, resolutionNotes, activeChecklist, percentage);

        setActiveModal(null);
        setSelectedItem(null);
    };

    const submitProgress = () => {
        if (!resolutionNotes && activeChecklist.length === 0) {
            toast.error("Please add notes or checklist items to update progress.");
            return;
        }

        // Calculate Percentage
        const total = activeChecklist.length;
        const checked = activeChecklist.filter(i => i.checked).length;
        const percentage = total > 0 ? (checked / total) * 100 : 0;

        // Update Progress
        updateProgress(selectedItem.id, resolutionNotes, activeChecklist, percentage);
    };

    // Ticket Actions
    const acknowledgeTicket = async (ticketId) => {
        try {
            await apiClient.acknowledgeTicket(ticketId);
            // Refresh tickets
            const fetchedTickets = await apiClient.getTickets();
            setTickets(fetchedTickets);
            toast.success("Ticket acknowledged!");
        } catch (error) {
            console.error("Failed to acknowledge ticket:", error);
            toast.error("Failed to acknowledge ticket: " + error.message);
        }
    };

    const resolveTicket = async (ticketId, notes, checklist, percentage) => {
        try {
            await apiClient.resolveTicket(ticketId, notes, checklist, percentage);
            // Refresh tickets
            const fetchedTickets = await apiClient.getTickets();
            setTickets(fetchedTickets);
            toast.success("Ticket resolved successfully!");
        } catch (error) {
            console.error("Failed to resolve ticket:", error);
            toast.error("Failed to resolve ticket: " + error.message);
        }
    };

    const updateProgress = async (ticketId, notes, checklist, percentage, silent = false) => {
        try {
            await apiClient.updateTicketProgress(ticketId, notes, checklist, percentage);
            // Refresh tickets
            const fetchedTickets = await apiClient.getTickets();
            setTickets(fetchedTickets);
            if (!silent) toast.success("Progress updated and user notified!");
        } catch (error) {
            console.error("Failed to update progress:", error);
            if (!silent) toast.error("Failed to update progress: " + error.message);
        }
    }

    const saveDraft = () => {
        if (!selectedItem) return;
        const total = activeChecklist.length;
        const checked = activeChecklist.filter(i => i.checked).length;
        // If we have notes but nothing checked, we are at least at 10%
        const percentage = total > 0 ? (checked / total) * 100 : (resolutionNotes ? 10 : 0);
        updateProgress(selectedItem.id, resolutionNotes, activeChecklist, percentage, true);
    };


    // --- HELPERS ---
    const ConfigStep = ({ step, current }) => {
        const isCompleted = current > step;
        const isCurrent = current === step;
        return (
            <div className={`flex items-center gap-2 ${isCurrent ? 'text-indigo-400 font-bold' : isCompleted ? 'text-emerald-400' : 'text-slate-600'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 
                    ${isCurrent ? 'border-indigo-400 bg-indigo-500/20' : isCompleted ? 'border-emerald-500 bg-emerald-500/20' : 'border-slate-700 bg-slate-800'}`}>
                    {isCompleted ? <Check size={16} /> : <span>{step}</span>}
                </div>
                {step < 5 && <div className={`flex-1 h-0.5 w-8 ${isCompleted ? 'bg-emerald-500' : 'bg-slate-700'}`}></div>}
            </div>
        );
    };

    return (
        <div className="space-y-6 relative h-full">
            <header>
                <h1 className="text-3xl font-bold text-white">Technician Workbench</h1>
                <p className="text-slate-400">IT Support Operations & Device Lifecycle Management</p>
            </header>

            <ActionsNeededBanner
                title="Actions needed"
                items={[
                    ...(incomingRequests.length > 0 ? [{ label: 'Pending approval', count: incomingRequests.length, onClick: () => setActiveModal('PENDING'), icon: Terminal, variant: 'primary' }] : []),
                    ...(activeTickets.length > 0 ? [{ label: 'Open tickets', count: activeTickets.length, onClick: () => setActiveModal('TICKETS'), icon: Ticket, variant: 'warning' }] : []),
                    ...(deployedArgs.length > 0 ? [{ label: 'Ready for handover', count: deployedArgs.length, onClick: () => setActiveModal('DEPLOY'), icon: CheckCircle, variant: 'success' }] : []),
                ]}
            />

            {/* --- METRIC CARDS --- */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">

                {/* 1. PENDING SETUP */}
                <div
                    onClick={() => setActiveModal('PENDING')}
                    className="glass-card p-5 bg-gradient-to-br from-indigo-500/10 to-indigo-600/5 border-indigo-500/20 cursor-pointer hover:border-indigo-400/50 transition-all hover:scale-[1.02]"
                >
                    <p className="text-indigo-300 text-xs font-bold uppercase flex justify-between">
                        Pending Approval <ChevronRight size={14} className="opacity-50" />
                    </p>
                    <h3 className="text-3xl font-bold text-white mt-1">{incomingRequests.length}</h3>
                    <div className="mt-2 text-xs text-indigo-200/70 flex items-center gap-1">
                        <Terminal size={12} /> {incomingRequests.filter(i => i.urgency === 'High').length} high priority
                    </div>
                </div>

                {/* 2. OPEN TICKETS */}
                <div
                    onClick={() => setActiveModal('TICKETS')}
                    className="glass-card p-5 bg-gradient-to-br from-amber-500/10 to-amber-600/5 border-amber-500/20 cursor-pointer hover:border-amber-400/50 transition-all hover:scale-[1.02]"
                >
                    <p className="text-amber-300 text-xs font-bold uppercase flex justify-between">
                        Open Tickets <ChevronRight size={14} className="opacity-50" />
                    </p>
                    <h3 className="text-3xl font-bold text-white mt-1">{activeTickets.length}</h3>
                    <div className="mt-2 text-xs text-amber-200/70 flex items-center gap-1">
                        <Activity size={12} /> {activeTickets.filter(t => t.priority?.toUpperCase() === 'HIGH').length} critical issues
                    </div>
                </div>

                {/* 3. READY TO DEPLOY */}
                <div
                    onClick={() => setActiveModal('DEPLOY')}
                    className="glass-card p-5 cursor-pointer hover:bg-white/5 transition-all hover:scale-[1.02]"
                >
                    <p className="text-emerald-300 text-xs font-bold uppercase flex justify-between">
                        Ready for User <ChevronRight size={14} className="opacity-50" />
                    </p>
                    <h3 className="text-3xl font-bold text-white mt-1">{deployedArgs.length}</h3>
                    <div className="mt-2 text-xs text-slate-400 flex items-center gap-1">
                        <User size={12} /> Configure & Verified
                    </div>
                </div>

                {/* 4. DISPOSAL */}
                <div
                    onClick={() => setActiveModal('DISPOSAL')}
                    className="glass-card p-5 cursor-pointer hover:bg-white/5 transition-all hover:scale-[1.02]"
                >
                    <p className="text-slate-400 text-xs font-bold uppercase flex justify-between">
                        Disposal Queue <ChevronRight size={14} className="opacity-50" />
                    </p>
                    <h3 className="text-3xl font-bold text-white mt-1">{disposalItems.length}</h3>
                    <div className="mt-2 text-xs text-slate-500 flex items-center gap-1">
                        <Trash2 size={12} /> Pending Data Wipe
                    </div>
                </div>

                {/* 5. DISCOVERY */}
                <div
                    onClick={() => window.location.href = '/assets?status=Discovered'}
                    className="glass-card p-5 bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/20 cursor-pointer hover:border-purple-400/50 transition-all hover:scale-[1.02]"
                >
                    <p className="text-purple-300 text-xs font-bold uppercase flex justify-between">
                        Discovered Assets <ChevronRight size={14} className="opacity-50" />
                    </p>
                    <h3 className="text-3xl font-bold text-white mt-1">{discoveredAssets.length}</h3>
                    <div className="mt-2 text-xs text-purple-200/70 flex items-center gap-1">
                        <Activity size={12} /> Found by Auto-Agent
                    </div>
                </div>
            </div>

            {/* --- DASHBOARD WIDGETS --- */}
            <div className="grid grid-cols-1 gap-6">

                {/* JUST THE PENDING SETUP WIDGET (Removed Compliance as requested) */}
                <div className="glass-panel p-0 overflow-hidden flex flex-col">
                    <div className="p-4 border-b border-white/10 bg-white/5 flex justify-between items-center">
                        <h3 className="font-bold text-white flex items-center gap-2">
                            <Clock size={16} className="text-indigo-400" />
                            Upcoming Validations & Setups
                        </h3>
                        <button onClick={() => setActiveModal('PENDING')} className="text-xs text-indigo-400 hover:text-indigo-300">View Full Queue</button>
                    </div>
                    <div className="p-4 space-y-3 flex-1">
                        {pendingQueue.slice(0, 5).map((item) => (
                            <div key={item.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-800/50 border border-white/5 hover:border-white/10 transition-colors">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-lg bg-slate-700/50 flex items-center justify-center text-slate-400 border border-white/5">
                                        <Wrench size={18} />
                                    </div>
                                    <div>
                                        <div className="text-sm text-slate-200 font-medium">{item.name}</div>
                                        <div className="text-xs text-slate-500 flex items-center gap-2">
                                            <span>{item.user} ({item.requestedFor})</span>
                                            <span className="w-1 h-1 rounded-full bg-slate-600"></span>
                                            <span className="text-amber-500">Due in {item.slaCountdown}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="text-xs px-2 py-1 rounded bg-slate-700 text-slate-300 border border-white/5">{item.id}</span>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); startConfig(item); }}
                                        className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded transition-colors shadow-lg shadow-indigo-500/20"
                                    >
                                        Start Config
                                    </button>
                                </div>
                            </div>
                        ))}
                        {pendingQueue.length === 0 && (
                            <div className="text-center py-12 text-slate-500 text-sm">All setups complete for today.</div>
                        )}
                    </div>
                </div>

            </div>


            {/* ===================================================================================== */}
            {/* MODALS */}
            {/* ===================================================================================== */}

            {activeModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">

                    {/* ---- REQUEST DETAILS MODAL (IT MANAGEMENT REVIEW) ---- */}
                    {activeModal === 'REQUEST_DETAILS' && selectedItem && (
                        <div className="bg-slate-900 border border-white/10 rounded-xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in scale-95 duration-200 flex flex-col max-h-[90vh]">
                            <div className="bg-slate-800 p-6 border-b border-white/10 flex justify-between items-center shrink-0">
                                <div>
                                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                        <FileText size={20} className="text-indigo-400" />
                                        Request Details
                                    </h2>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="text-xs font-mono text-slate-400 uppercase tracking-wider">{selectedItem.id}</span>
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${selectedItem.urgency === 'High' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : 'bg-slate-700 text-slate-300'}`}>
                                            {selectedItem.urgency || 'STANDARD'}
                                        </span>
                                    </div>
                                </div>
                                <button onClick={() => setActiveModal('PENDING')} className="text-slate-400 hover:text-white p-2">
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="p-6 overflow-y-auto custom-scrollbar space-y-6">
                                {/* Requester Info */}
                                <div className="grid grid-cols-2 gap-4 bg-slate-800/50 p-4 rounded-lg border border-white/5">
                                    <div>
                                        <label className="text-xs text-slate-500 uppercase font-bold block mb-1">Requester</label>
                                        <div className="text-white font-medium">{selectedItem.requestedBy?.name}</div>
                                        <div className="text-xs text-slate-400">{selectedItem.requestedBy?.email}</div>
                                    </div>
                                    <div>
                                        <label className="text-xs text-slate-500 uppercase font-bold block mb-1">Department</label>
                                        <div className="text-white font-medium">{selectedItem.requestedBy?.department || 'N/A'}</div>
                                        <div className="text-xs text-slate-400">{selectedItem.requestedBy?.position || 'Employee'}</div>
                                    </div>
                                </div>

                                {/* Asset Details */}
                                <div>
                                    <h3 className="text-sm font-bold text-slate-300 uppercase mb-3 border-b border-white/5 pb-2">Asset Information</h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-xs text-slate-500 uppercase block mb-1">Asset Type</label>
                                            <div className="text-white">{selectedItem.assetType}</div>
                                        </div>
                                        <div>
                                            <label className="text-xs text-slate-500 uppercase block mb-1">Model / Specs</label>
                                            <div className="text-white">{selectedItem.asset_model || selectedItem.details || 'Standard Configuration'}</div>
                                        </div>
                                        {selectedItem.os_version && (
                                            <div>
                                                <label className="text-xs text-slate-500 uppercase block mb-1">OS Version</label>
                                                <div className="text-white">{selectedItem.os_version}</div>
                                            </div>
                                        )}
                                        {selectedItem.cost_estimate && (
                                            <div>
                                                <label className="text-xs text-slate-500 uppercase block mb-1">Cost Estimate</label>
                                                <div className="text-emerald-400 font-mono font-bold">${selectedItem.cost_estimate}</div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Justification */}
                                <div>
                                    <h3 className="text-sm font-bold text-slate-300 uppercase mb-3 border-b border-white/5 pb-2">Business Case</h3>
                                    <div className="bg-slate-800 p-4 rounded-lg border border-white/5">
                                        <label className="text-xs text-slate-500 uppercase block mb-2">Justification</label>
                                        <div className="text-slate-300 text-sm whitespace-pre-wrap leading-relaxed max-w-prose">
                                            {selectedItem.justification || "No justification provided."}
                                        </div>
                                        {selectedItem.business_justification && selectedItem.business_justification !== selectedItem.justification && (
                                            <div className="mt-4 pt-4 border-t border-white/5">
                                                <label className="text-xs text-slate-500 uppercase block mb-2">Detailed Business Justification</label>
                                                <div className="text-slate-300 text-sm whitespace-pre-wrap leading-relaxed">
                                                    {selectedItem.business_justification}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Approval History */}
                                {selectedItem.manager_approvals && selectedItem.manager_approvals.length > 0 && (
                                    <div>
                                        <h3 className="text-sm font-bold text-slate-300 uppercase mb-3 border-b border-white/5 pb-2">Approval History</h3>
                                        <div className="space-y-2">
                                            {selectedItem.manager_approvals.map((approval, idx) => (
                                                <div key={idx} className="flex justify-between items-start text-xs bg-slate-800/30 p-2 rounded">
                                                    <div>
                                                        <span className="font-bold text-slate-300">{approval.reviewer_name}</span>
                                                        <span className="text-slate-500 mx-1">({approval.type || 'Review'})</span>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className={`font-bold ${approval.decision?.includes('REJECT') ? 'text-rose-400' : 'text-emerald-400'}`}>
                                                            {approval.decision}
                                                        </div>
                                                        <div className="text-slate-600">{new Date(approval.timestamp).toLocaleString()}</div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="p-4 bg-slate-800 border-t border-white/10 flex justify-end gap-3 shrink-0">
                                <button
                                    onClick={() => {
                                        const reason = prompt("Enter rejection reason:");
                                        if (reason) {
                                            itRejectRequest(selectedItem.id, reason);
                                            setActiveModal('PENDING'); // Go back to list
                                        }
                                    }}
                                    className="px-4 py-2 text-rose-400 hover:text-white border border-rose-500/30 hover:bg-rose-500/10 rounded-lg transition-colors"
                                >
                                    Reject Request
                                </button>
                                {selectedItem.status === 'IT_APPROVED' && selectedItem.assetType === 'BYOD' ? (
                                    <button
                                        onClick={() => {
                                            registerByod(selectedItem.id);
                                            setActiveModal('PENDING');
                                        }}
                                        className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold shadow-lg shadow-emerald-500/20 flex items-center gap-2"
                                    >
                                        <ShieldCheck size={18} /> Validate & Register BYOD
                                    </button>
                                ) : selectedItem.status === 'BYOD_COMPLIANCE_CHECK' && selectedItem.assetType === 'BYOD' ? (
                                    <>
                                        <button
                                            onClick={() => {
                                                registerByod(selectedItem.id);
                                                setActiveModal(null);
                                            }}
                                            className="px-6 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg font-bold shadow-lg shadow-sky-500/20 flex items-center gap-2"
                                        >
                                            <ShieldCheck size={18} /> Validate & Register BYOD
                                        </button>
                                        <button
                                            onClick={() => setComplianceModalOpen(true)}
                                            className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold shadow-lg shadow-emerald-500/20 flex items-center gap-2"
                                        >
                                            <CheckCircle size={18} /> Run Compliance Check
                                        </button>
                                    </>
                                ) : (
                                    <button
                                        onClick={() => {
                                            itApproveRequest(selectedItem.id);
                                            setActiveModal('PENDING');
                                        }}
                                        className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/40 transition-all flex items-center gap-2"
                                    >
                                        <CheckCircle size={18} /> Approve & Forward
                                    </button>
                                )}
                            </div>
                        </div>
                    )}

                    {/* ---- TICKET VIEW MODAL ---- */}
                    {activeModal === 'TICKET_VIEW' && selectedItem && (
                        <div className="bg-slate-900 border border-white/10 rounded-xl w-full max-w-lg shadow-2xl overflow-hidden animate-in scale-95 duration-200">
                            <div className="bg-slate-800 p-4 border-b border-white/10 flex justify-between items-center">
                                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                    <FileText size={18} className="text-indigo-400" />
                                    Ticket Details
                                </h2>
                                <button onClick={() => setActiveModal('TICKETS')} className="text-slate-400 hover:text-white p-2">
                                    <X size={18} />
                                </button>
                            </div>
                            <div className="p-6 space-y-4">
                                <div>
                                    <label className="text-xs text-slate-500 uppercase font-bold block mb-1">Subject</label>
                                    <div className="text-white font-medium">{selectedItem.subject}</div>
                                </div>
                                <div>
                                    <label className="text-xs text-slate-500 uppercase font-bold block mb-1">Description</label>
                                    <div className="text-slate-300 text-sm whitespace-pre-wrap">{selectedItem.description || '—'}</div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs text-slate-500 uppercase font-bold block mb-1">Status</label>
                                        <span className="text-sm text-slate-300">{selectedItem.status}</span>
                                    </div>
                                    <div>
                                        <label className="text-xs text-slate-500 uppercase font-bold block mb-1">Priority</label>
                                        <span className="text-sm text-slate-300">{selectedItem.priority || 'Medium'}</span>
                                    </div>
                                    <div>
                                        <label className="text-xs text-slate-500 uppercase font-bold block mb-1">Requestor</label>
                                        <div className="text-sm text-slate-300">{selectedItem.requestor_id || selectedItem.requestor_name || '—'}</div>
                                    </div>
                                    <div>
                                        <label className="text-xs text-slate-500 uppercase font-bold block mb-1">ID</label>
                                        <div className="text-xs font-mono text-slate-500">{selectedItem.id}</div>
                                    </div>
                                </div>
                            </div>
                            <div className="p-4 border-t border-white/10 flex justify-end">
                                <button
                                    onClick={() => { setActiveModal('TICKETS'); openResolveModal(selectedItem); }}
                                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium"
                                >
                                    Resolve Ticket
                                </button>
                            </div>
                        </div>
                    )}

                    {/* ---- ITEM VIEW (Deploy / Disposal) MODAL ---- */}
                    {activeModal === 'ITEM_VIEW' && selectedItem && (
                        <div className="bg-slate-900 border border-white/10 rounded-xl w-full max-w-lg shadow-2xl overflow-hidden animate-in scale-95 duration-200">
                            <div className="bg-slate-800 p-4 border-b border-white/10 flex justify-between items-center">
                                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                    <FileText size={18} className="text-indigo-400" />
                                    {selectedItem._viewType === 'deploy' ? 'Deployment Asset' : 'Disposal Asset'}
                                </h2>
                                <button onClick={() => setActiveModal(selectedItem._viewType === 'deploy' ? 'DEPLOY' : 'DISPOSAL')} className="text-slate-400 hover:text-white p-2">
                                    <X size={18} />
                                </button>
                            </div>
                            <div className="p-6 space-y-4">
                                <div>
                                    <label className="text-xs text-slate-500 uppercase font-bold block mb-1">Name</label>
                                    <div className="text-white font-medium">{selectedItem.name}</div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs text-slate-500 uppercase font-bold block mb-1">ID</label>
                                        <div className="text-xs font-mono text-slate-500">{selectedItem.id}</div>
                                    </div>
                                    {selectedItem._viewType === 'deploy' ? (
                                        <>
                                            <div>
                                                <label className="text-xs text-slate-500 uppercase font-bold block mb-1">Assigned To</label>
                                                <div className="text-slate-300 text-sm">{selectedItem.assignedUser || '—'}</div>
                                            </div>
                                            <div>
                                                <label className="text-xs text-slate-500 uppercase font-bold block mb-1">Location</label>
                                                <div className="text-slate-300 text-sm">{selectedItem.location || '—'}</div>
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <div>
                                                <label className="text-xs text-slate-500 uppercase font-bold block mb-1">Serial</label>
                                                <div className="text-slate-300 text-sm">{selectedItem.serial || '—'}</div>
                                            </div>
                                            <div>
                                                <label className="text-xs text-slate-500 uppercase font-bold block mb-1">Reason</label>
                                                <div className="text-slate-300 text-sm">{selectedItem.reason || '—'}</div>
                                            </div>
                                            <div>
                                                <label className="text-xs text-slate-500 uppercase font-bold block mb-1">Method</label>
                                                <div className="text-slate-300 text-sm">{selectedItem.method || '—'}</div>
                                            </div>
                                            <div>
                                                <label className="text-xs text-slate-500 uppercase font-bold block mb-1">Age</label>
                                                <div className="text-slate-300 text-sm">{selectedItem.age || '—'}</div>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ---- BYOD COMPLIANCE CHECK MODAL ---- */}
                    <ComplianceCheckModal
                        isOpen={complianceModalOpen}
                        onClose={() => setComplianceModalOpen(false)}
                        request={selectedItem}
                        onUpdate={() => refreshData()}
                    />

                    {/* ---- CONFIG WIZARD MODAL (5 STEPS) ---- */}
                    {activeModal === 'CONFIG' && selectedItem && (
                        <div className="bg-slate-900 border border-white/10 rounded-xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in scale-95 duration-200 flex flex-col max-h-[90vh]">
                            <div className="bg-gradient-to-r from-indigo-900/50 to-slate-900 p-6 border-b border-white/10 flex justify-between items-center shrink-0">
                                <div>
                                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                        <Terminal size={20} className="text-indigo-400" />
                                        Workstation Configuration
                                    </h2>
                                    <p className="text-sm text-indigo-300/60 mt-1">Ticket: {selectedItem.id}</p>
                                </div>
                                <div className="text-right">
                                    <span className="text-xs font-mono text-slate-500 block uppercase tracking-wider">Target User</span>
                                    <span className="text-sm font-bold text-white">{selectedItem.user}</span>
                                </div>
                            </div>

                            <div className="p-8 overflow-y-auto custom-scrollbar">
                                {/* Steps Indicator */}
                                <div className="flex justify-between mb-8 px-4">
                                    {[1, 2, 3, 4, 5].map(s => <ConfigStep key={s} step={s} current={configStep} />)}
                                </div>

                                {/* Step Content */}
                                <div className="bg-slate-800/30 rounded-xl p-6 border border-white/5 min-h-[300px]">

                                    {/* STEP 1: ASSET OVERVIEW */}
                                    {configStep === 1 && (
                                        <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
                                            <h3 className="text-lg font-bold text-white mb-4">Step 1: Asset Overview</h3>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="p-4 bg-slate-800 rounded-lg border border-white/5">
                                                    <span className="text-xs text-slate-500 uppercase">Model</span>
                                                    <div className="text-white font-medium">{selectedItem.model || 'Standard Workstation'}</div>
                                                </div>
                                                <div className="p-4 bg-slate-800 rounded-lg border border-white/5">
                                                    <span className="text-xs text-slate-500 uppercase">Serial Number</span>
                                                    <div className="text-white font-medium">{selectedItem.serial || 'Unknown'}</div>
                                                </div>
                                                <div className="p-4 bg-slate-800 rounded-lg border border-white/5 col-span-2">
                                                    <span className="text-xs text-slate-500 uppercase">Specs</span>
                                                    <div className="text-white font-medium">{selectedItem.details || 'Standard Configuration'}</div>
                                                </div>
                                            </div>
                                            <div className="mt-4 p-3 bg-indigo-500/10 border border-indigo-500/20 rounded text-indigo-200 text-sm flex gap-2">
                                                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                                                Please physically verify the serial number matches the asset tag before proceeding.
                                            </div>
                                        </div>
                                    )}

                                    {/* STEP 2: OS SELECTION (NOW SOFTWARE PROVISIONING) */}
                                    {configStep === 2 && (
                                        <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
                                            <h3 className="text-lg font-bold text-white mb-4">Step 2: OS & Image Selection</h3>
                                            <div className="grid grid-cols-1 gap-3">
                                                <label className="flex items-center gap-4 p-4 bg-slate-800 border-2 border-indigo-500 rounded-lg cursor-pointer">
                                                    <input type="radio" name="os" defaultChecked className="w-5 h-5 text-indigo-600" />
                                                    <div>
                                                        <div className="font-bold text-white">Windows 11 Enterprise 23H2 (Stable)</div>
                                                        <div className="text-xs text-slate-400">Standard Corporate Image v4.2</div>
                                                    </div>
                                                </label>
                                                <label className="flex items-center gap-4 p-4 bg-slate-800 border border-white/10 rounded-lg cursor-pointer opacity-60">
                                                    <input type="radio" name="os" className="w-5 h-5 text-indigo-600" />
                                                    <div>
                                                        <div className="font-bold text-white">Windows 10 Enterprise LTSC</div>
                                                        <div className="text-xs text-slate-400">Legacy Systems Only</div>
                                                    </div>
                                                </label>
                                            </div>
                                        </div>
                                    )}

                                    {/* STEP 3: SECURITY TOOLS */}
                                    {configStep === 3 && (
                                        <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
                                            <h3 className="text-lg font-bold text-white mb-4">Step 3: Security Tools Setup</h3>
                                            <p className="text-sm text-slate-400 mb-4">Manually verify installation or push via MDM.</p>
                                            <div className="space-y-2">
                                                <SoftwareInstallItem app="CrowdStrike Falcon Sensor" />
                                                <SoftwareInstallItem app="Zscaler Client Connector" />
                                                <SoftwareInstallItem app="Tanium Client" />
                                                <SoftwareInstallItem app="Local Admin Password Solution (LAPS)" />
                                            </div>
                                        </div>
                                    )}

                                    {/* STEP 4: NETWORK */}
                                    {configStep === 4 && (
                                        <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                                            <h3 className="text-lg font-bold text-white mb-4">Step 4: Network Configuration</h3>

                                            <div className="space-y-4">
                                                <div className="flex flex-col gap-1">
                                                    <label className="text-xs text-slate-400 uppercase font-bold">Domain Join</label>
                                                    <select className="bg-slate-900 border border-white/10 text-white p-3 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none">
                                                        <option>CORP.GLOBAL (Default)</option>
                                                        <option>DMZ.LOCAL</option>
                                                        <option>WORKGROUP</option>
                                                    </select>
                                                </div>

                                                <div className="flex flex-col gap-1">
                                                    <label className="text-xs text-slate-400 uppercase font-bold">VLAN Assignment</label>
                                                    <select className="bg-slate-900 border border-white/10 text-white p-3 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none">
                                                        <option>VLAN 100 - Employee Workstations</option>
                                                        <option>VLAN 200 - Developers</option>
                                                        <option>VLAN 900 - Guest</option>
                                                    </select>
                                                </div>

                                                <div className="flex items-center gap-2 text-emerald-400 bg-emerald-500/10 p-3 rounded border border-emerald-500/20">
                                                    <CheckCircle size={16} />
                                                    <span>DHCP Reservation Found: 10.20.4.112</span>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* STEP 5: FINAL VALIDATION */}
                                    {configStep === 5 && (
                                        <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
                                            <h3 className="text-lg font-bold text-white mb-4">Step 5: Final Validation</h3>
                                            <div className="space-y-3">
                                                {[
                                                    "BIOS Password Set",
                                                    "Physical Damage Check",
                                                    "BitLocker Encryption Active",
                                                    "Windows Activated",
                                                    "Latest Windows Updates Applied"
                                                ].map((check, i) => (
                                                    <label key={i} className="flex items-center gap-3 p-3 bg-slate-800 rounded border border-white/5 cursor-pointer hover:bg-slate-700 transition-colors">
                                                        <input type="checkbox" defaultChecked={i < 3} className="w-5 h-5 rounded text-indigo-600 bg-slate-700 border-slate-600 focus:ring-indigo-500" />
                                                        <span className="text-slate-200">{check}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="mt-6 flex justify-end gap-3">
                                    {configStep < 5 ? (
                                        <>
                                            <button
                                                onClick={() => setActiveModal(null)}
                                                className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                onClick={handleConfigStepComplete}
                                                className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-semibold shadow-lg shadow-indigo-500/20 flex items-center gap-2"
                                            >
                                                {configStep === 4 ? 'Validate & Finish' : 'Next Step'} <ArrowRight size={16} />
                                            </button>
                                        </>
                                    ) : (
                                        <button
                                            onClick={handleConfigStepComplete}
                                            className="w-full px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-semibold shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 animate-pulse"
                                        >
                                            <CheckCircle size={20} /> Complete Configuration
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}



                    {/* ---- QUEUE MODALS ---- */}

                    {['PENDING', 'TICKETS', 'DEPLOY', 'DISPOSAL'].includes(activeModal) && (
                        <div className="bg-slate-900 border border-white/10 rounded-xl w-full max-w-5xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in slide-in-from-bottom-4 duration-300">
                            <div className="p-4 border-b border-white/10 bg-white/5 flex justify-between items-center shrink-0">
                                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                    {activeModal === 'PENDING' && 'Pending Setup Assets'}
                                    {activeModal === 'TICKETS' && 'Active IT Support Tickets'}
                                    {activeModal === 'DEPLOY' && 'Ready for Deployment'}
                                    {activeModal === 'DISPOSAL' && 'Disposal & Secure Wipe Queue'}
                                </h2>
                                <button onClick={() => setActiveModal(null)} className="text-slate-400 hover:text-white p-2">
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="p-0 overflow-auto flex-1 custom-scrollbar">
                                <table className="w-full text-left border-collapse">
                                    <thead className="bg-slate-800/80 sticky top-0 z-10 backdrop-blur-sm shadow-sm">
                                        <tr>
                                            <th className="p-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Asset / ID</th>
                                            <th className="p-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Context</th>
                                            <th className="p-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Status</th>
                                            <th className="p-4 text-xs font-semibold text-slate-400 uppercase tracking-wider text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {activeModal === 'PENDING' && (incomingRequests.length === 0 ? (
                                            <tr><td colSpan="4" className="p-4 text-slate-400 text-center">No incoming requests.</td></tr>
                                        ) : incomingRequests.map(req => (
                                            <tr key={req.id} className="hover:bg-white/5 transition-colors group">
                                                <td className="p-4">
                                                    <div className="font-bold text-white text-base flex items-center gap-2">
                                                        {req.assetType || req.title}
                                                        {req.assetType === 'BYOD' && <span className="text-[10px] bg-sky-500/20 text-sky-300 px-1.5 rounded border border-sky-500/30">BYOD</span>}
                                                    </div>
                                                    <div className="text-xs text-indigo-400 font-mono mt-1">{req.id}</div>
                                                </td>
                                                <td className="p-4">
                                                    <div className="text-sm text-slate-300 font-medium">{req.requestedBy.name}</div>
                                                    <div className="text-xs text-slate-500">{req.requestedBy.role} • {req.assetType}</div>
                                                </td>
                                                <td className="p-4">
                                                    <span className={`px-2 py-1 rounded text-xs font-bold ${req.urgency === 'High' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : 'bg-slate-700 text-slate-300'}`}>
                                                        {req.urgency ? req.urgency.toUpperCase() : 'STANDARD'}
                                                    </span>
                                                    <div className="text-xs text-slate-500 mt-1">{req.status}</div>
                                                </td>
                                                <td className="p-4 text-right">
                                                    <div className="flex justify-end gap-2">
                                                        <button
                                                            onClick={() => { setSelectedItem(req); setActiveModal('REQUEST_DETAILS'); }}
                                                            className="text-xs text-indigo-300 hover:text-white border border-indigo-500/30 hover:bg-indigo-500/20 px-3 py-1.5 rounded flex items-center gap-1 transition-colors"
                                                        >
                                                            <Eye size={14} /> View Details
                                                        </button>

                                                        <button
                                                            onClick={() => {
                                                                const reason = prompt("Enter rejection reason:");
                                                                if (reason) itRejectRequest(req.id, reason);
                                                            }}
                                                            className="text-xs text-rose-400 hover:text-white border border-rose-500/30 px-3 py-1.5 rounded flex items-center gap-1"
                                                        >
                                                            Reject
                                                        </button>
                                                        {req.status === 'IT_APPROVED' && req.assetType === 'BYOD' ? (
                                                            <button
                                                                onClick={() => registerByod(req.id)}
                                                                className="text-xs bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded font-medium shadow-lg shadow-emerald-500/10 transition-all flex items-center gap-1"
                                                            >
                                                                <ShieldCheck size={14} /> Validate & Register BYOD
                                                            </button>
                                                        ) : req.status === 'BYOD_COMPLIANCE_CHECK' && req.assetType === 'BYOD' ? (
                                                            <>
                                                                <button
                                                                    onClick={() => registerByod(req.id)}
                                                                    className="text-xs bg-sky-600 hover:bg-sky-500 text-white px-3 py-1.5 rounded font-medium shadow-lg shadow-sky-500/10 transition-all flex items-center gap-1"
                                                                >
                                                                    <ShieldCheck size={14} /> Register BYOD
                                                                </button>
                                                                <button
                                                                    onClick={() => { setSelectedItem(req); setComplianceModalOpen(true); }}
                                                                    className="text-xs bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded font-medium shadow-lg shadow-emerald-500/10 transition-all flex items-center gap-1"
                                                                >
                                                                    <CheckCircle size={14} /> Run Compliance
                                                                </button>
                                                            </>
                                                        ) : (
                                                            <button
                                                                onClick={() => itApproveRequest(req.id)}
                                                                className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded font-medium shadow-lg shadow-indigo-500/10 hover:shadow-indigo-500/30 transition-all"
                                                            >
                                                                {req.assetType === 'BYOD' ? 'Verify & Review BYOD' : 'Approve & Forward to Inventory'}
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        )))}

                                        {activeModal === 'TICKETS' && (activeTickets.length === 0 ? (
                                            <tr><td colSpan="4" className="p-4 text-slate-400 text-center">No active tickets.</td></tr>
                                        ) : activeTickets.map(item => (
                                            <tr key={item.id} className="hover:bg-white/5 transition-colors">
                                                <td className="p-4">
                                                    <div className="font-bold text-white">{item.subject}</div>
                                                    <div className="text-xs text-slate-500 font-mono mt-0.5">{item.id}</div>
                                                </td>
                                                <td className="p-4">
                                                    <div className="text-sm text-slate-300">{item.requestor_id || 'Unknown'}</div>
                                                    <div className="text-xs text-slate-500">User</div>
                                                </td>
                                                <td className="p-4">
                                                    <div className="flex items-center gap-2">
                                                        <span className={`w-2 h-2 rounded-full ${item.priority?.toUpperCase() === 'HIGH' ? 'bg-rose-500' : 'bg-amber-500'}`}></span>
                                                        <span className="text-sm text-slate-300">{item.status}</span>
                                                    </div>
                                                </td>
                                                <td className="p-4 text-right">
                                                    <div className="flex justify-end gap-2">
                                                        <button
                                                            onClick={() => { setSelectedItem(item); setActiveModal('TICKET_VIEW'); }}
                                                            className="text-xs text-indigo-300 hover:text-white border border-indigo-500/30 hover:bg-indigo-500/20 px-3 py-1.5 rounded flex items-center gap-1 transition-colors"
                                                        >
                                                            <Eye size={14} /> View
                                                        </button>
                                                        {(item.status?.toUpperCase() === 'OPEN') && (
                                                            <button
                                                                onClick={() => acknowledgeTicket(item.id)}
                                                                className="text-xs border border-blue-500/30 text-blue-400 hover:bg-blue-500/10 px-3 py-1.5 rounded flex items-center gap-1 transition-colors"
                                                            >
                                                                <CheckCircle size={14} /> Acknowledge
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={() => openResolveModal(item)}
                                                            className="text-xs border border-white/10 hover:bg-white/10 text-slate-300 px-4 py-2 rounded flex items-center gap-2 transition-colors ml-auto"
                                                        >
                                                            <CheckCircle size={14} /> Resolve Ticket
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        )))}

                                        {activeModal === 'DEPLOY' && deployedArgs.map(item => (
                                            <tr key={item.id} className="hover:bg-white/5 transition-colors">
                                                <td className="p-4">
                                                    <div className="font-medium text-white">{item.name}</div>
                                                    <div className="text-xs text-slate-500">{item.id}</div>
                                                </td>
                                                <td className="p-4">
                                                    <div className="text-sm text-slate-300">{item.assignedUser}</div>
                                                    <div className="text-xs text-slate-500">{item.location}</div>
                                                </td>
                                                <td className="p-4">
                                                    <div className="flex items-center gap-2">
                                                        <div className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-xs border border-emerald-500/20">Configured</div>
                                                        <div className="text-xs text-emerald-500">Secure</div>
                                                    </div>
                                                </td>
                                                <td className="p-4 text-right">
                                                    <div className="flex justify-end gap-2">
                                                        <button
                                                            onClick={() => { setSelectedItem({ ...item, _viewType: 'deploy' }); setActiveModal('ITEM_VIEW'); }}
                                                            className="text-xs text-indigo-300 hover:text-white border border-indigo-500/30 hover:bg-indigo-500/20 px-3 py-1.5 rounded flex items-center gap-1 transition-colors"
                                                        >
                                                            <Eye size={14} /> View
                                                        </button>
                                                        <button onClick={() => handleGenerateAck(item)} className="text-xs text-slate-400 hover:text-white border border-white/10 px-3 py-1.5 rounded flex items-center gap-1">
                                                            <Printer size={12} /> Ack Form
                                                        </button>
                                                        <button onClick={() => handleHandover(item)} className="text-xs bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded">
                                                            Hand Over
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}

                                        {activeModal === 'DISPOSAL' && disposalItems.map(item => (
                                            <tr key={item.id} className="hover:bg-white/5 transition-colors">
                                                <td className="p-4">
                                                    <div className="font-medium text-white">{item.name}</div>
                                                    <div className="text-xs text-slate-500">{item.serial}</div>
                                                </td>
                                                <td className="p-4">
                                                    <div className="text-sm text-slate-300">{item.reason}</div>
                                                    <div className="text-xs text-slate-500">Age: {item.age}</div>
                                                </td>
                                                <td className="p-4">
                                                    <div className="text-xs text-amber-500 font-bold">{item.method}</div>
                                                    <div className="text-[10px] text-slate-500">Pending Cert</div>
                                                </td>
                                                <td className="p-4 text-right">
                                                    <div className="flex justify-end gap-2">
                                                        <button
                                                            onClick={() => { setSelectedItem({ ...item, _viewType: 'disposal' }); setActiveModal('ITEM_VIEW'); }}
                                                            className="text-xs text-indigo-300 hover:text-white border border-indigo-500/30 hover:bg-indigo-500/20 px-3 py-1.5 rounded flex items-center gap-1 transition-colors"
                                                        >
                                                            <Eye size={14} /> View
                                                        </button>
                                                        <button onClick={() => handleStartWipe(item.id)} className="text-xs border border-rose-500/30 text-rose-400 hover:bg-rose-500/10 px-3 py-1.5 rounded flex items-center gap-1">
                                                            <Activity size={12} /> Wipe
                                                        </button>
                                                        <button onClick={() => handleMarkDisposed(item.id)} className="text-xs bg-slate-700 hover:bg-slate-600 text-white px-3 py-1.5 rounded">
                                                            Mark Disposed
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* ---- TICKET RESOLUTION WIZARD (3 STEPS) ---- */}
                    {activeModal === 'RESOLVE_TICKET' && selectedItem && (
                        <div className="bg-slate-900 border border-white/10 rounded-xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
                            <div className="p-6 border-b border-white/10 bg-slate-800/50">
                                <h3 className="text-lg font-bold text-white flex items-center justify-between">
                                    <span>Resolve Incident: {selectedItem.id}</span>
                                    <span className="text-xs font-mono text-slate-500 bg-slate-800 px-2 py-1 rounded">Step {configStep} of 3</span>
                                </h3>
                                <p className="text-slate-400 text-sm mt-1">{selectedItem.subject}</p>
                            </div>

                            <div className="p-6 overflow-y-auto custom-scrollbar flex-1">

                                {/* STEP 1: DIAGNOSIS */}
                                {configStep === 1 && (
                                    <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
                                        <h4 className="text-md font-bold text-white mb-2">1. Issue Diagnosis</h4>
                                        <div className="space-y-2">
                                            <label className="text-sm text-slate-300">Problem Description & Root Cause</label>
                                            <textarea
                                                className="w-full bg-slate-950 border border-white/10 rounded-lg p-3 text-white focus:ring-2 focus:ring-indigo-500 outline-none min-h-[120px]"
                                                placeholder="Describe the technical issue and identified root cause..."
                                                value={resolutionNotes}
                                                onChange={(e) => setResolutionNotes(e.target.value)}
                                            ></textarea>
                                        </div>
                                    </div>
                                )}

                                {/* STEP 2: RESOLUTION CHECKLIST */}
                                {configStep === 2 && (
                                    <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
                                        <div className="flex justify-between items-center mb-2">
                                            <h4 className="text-md font-bold text-white">2. Create Resolution Checklist</h4>
                                            <span className="text-xs text-indigo-400 font-bold">{activeChecklist.length > 0 ? Math.round((activeChecklist.filter(i => i.checked).length / activeChecklist.length) * 100) : 0}% Complete</span>
                                        </div>

                                        {/* Add Item Input */}
                                        <div className="flex gap-2 mb-4">
                                            <input
                                                type="text"
                                                placeholder="Add verification step..."
                                                className="flex-1 bg-slate-950 border border-white/10 rounded-lg p-2 text-white text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter' && e.target.value.trim()) {
                                                        setActiveChecklist([...activeChecklist, { text: e.target.value.trim(), checked: false }]);
                                                        e.target.value = '';
                                                    }
                                                }}
                                                id="checklist-input"
                                            />
                                            <button
                                                onClick={() => {
                                                    const input = document.getElementById('checklist-input');
                                                    if (input && input.value.trim()) {
                                                        setActiveChecklist([...activeChecklist, { text: input.value.trim(), checked: false }]);
                                                        input.value = '';
                                                    }
                                                }}
                                                className="bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-2 rounded-lg text-sm"
                                            >
                                                Add
                                            </button>
                                        </div>

                                        {/* Progress Bar */}
                                        <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden mb-4">
                                            <div
                                                className="h-full bg-indigo-500 transition-all duration-500"
                                                style={{ width: `${activeChecklist.length > 0 ? (activeChecklist.filter(i => i.checked).length / activeChecklist.length) * 100 : 0}%` }}
                                            ></div>
                                        </div>

                                        {activeChecklist.length === 0 && (
                                            <div className="text-center py-6 text-slate-500 text-sm border border-dashed border-white/10 rounded-lg">
                                                No checklist items added. Add steps to verify resolution.
                                            </div>
                                        )}

                                        <div className="space-y-2">
                                            {activeChecklist.map((item, idx) => (
                                                <div key={idx} className={`flex items-start gap-3 p-3 rounded border transition-colors group ${item.checked ? 'bg-indigo-500/10 border-indigo-500/30' : 'bg-slate-800 border-white/5 hover:border-white/10'}`}>
                                                    <label className="flex items-start gap-3 flex-1 cursor-pointer">
                                                        <input
                                                            type="checkbox"
                                                            checked={item.checked}
                                                            onChange={() => {
                                                                const newChecklist = [...activeChecklist];
                                                                newChecklist[idx].checked = !newChecklist[idx].checked;
                                                                setActiveChecklist(newChecklist);
                                                            }}
                                                            className="mt-1 w-4 h-4 rounded text-indigo-600 bg-slate-700 border-slate-600 focus:ring-indigo-500"
                                                        />
                                                        <div>
                                                            <div className={`text-sm font-medium ${item.checked ? 'text-white' : 'text-slate-300'}`}>{item.text}</div>
                                                        </div>
                                                    </label>
                                                    <button
                                                        onClick={() => {
                                                            const newChecklist = [...activeChecklist];
                                                            newChecklist.splice(idx, 1);
                                                            setActiveChecklist(newChecklist);
                                                        }}
                                                        className="text-slate-500 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity"
                                                    >
                                                        <X size={14} />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* STEP 3: FINAL REVIEW */}
                                {configStep === 3 && (
                                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                                        <div className="text-center py-4">
                                            <div className="w-20 h-20 rounded-full bg-emerald-500/10 text-emerald-400 border-2 border-emerald-500/20 flex items-center justify-center mx-auto mb-4">
                                                <CheckCircle size={40} />
                                            </div>
                                            <h3 className="text-xl font-bold text-white">Ready to Resolve</h3>
                                            <p className="text-slate-400 text-sm mt-1">Completion Score: <span className={`font-bold ${activeChecklist.every(i => i.checked) ? 'text-emerald-400' : 'text-amber-400'}`}>
                                                {activeChecklist.length > 0 ? Math.round((activeChecklist.filter(i => i.checked).length / activeChecklist.length) * 100) : 0}%
                                            </span></p>
                                        </div>

                                        <div className="bg-slate-800/50 rounded-lg p-4 border border-white/5 space-y-3">
                                            <div>
                                                <span className="text-xs text-slate-500 uppercase">Diagnosis</span>
                                                <p className="text-sm text-slate-300 mt-1">{resolutionNotes}</p>
                                            </div>
                                            <div>
                                                <span className="text-xs text-slate-500 uppercase">Resolution Steps</span>
                                                <p className="text-sm text-slate-300 mt-1">
                                                    {activeChecklist.filter(i => i.checked).length} of {activeChecklist.length} checks completed.
                                                </p>
                                            </div>
                                            <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded text-indigo-200 text-xs flex gap-2">
                                                <Activity size={14} className="shrink-0 mt-0.5" />
                                                Upon confirmation, the user will be notified via email with this resolution summary.
                                            </div>
                                        </div>
                                    </div>
                                )}

                            </div>

                            <div className="p-6 border-t border-white/10 flex justify-between items-center bg-white/5 shrink-0">
                                <div className="flex gap-2">
                                    <button onClick={() => setActiveModal(null)} className="px-4 py-2 text-slate-400 hover:text-white transition-colors">Cancel</button>
                                    <button
                                        onClick={saveDraft}
                                        className="px-4 py-2 text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-2 border border-indigo-500/20 rounded-lg hover:bg-indigo-500/5"
                                    >
                                        <ShieldCheck size={14} /> Save Draft
                                    </button>
                                </div>

                                <div className="flex gap-3">
                                    {configStep === 1 && (
                                        <button
                                            onClick={() => {
                                                if (!resolutionNotes) { toast.error("Please enter a diagnosis."); return; }
                                                // Save progress silently when moving to next step
                                                const percentage = activeChecklist.length > 0 ? (activeChecklist.filter(i => i.checked).length / activeChecklist.length) * 100 : 10;
                                                updateProgress(selectedItem.id, resolutionNotes, activeChecklist, percentage, true);
                                                setConfigStep(2);
                                            }}
                                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-semibold shadow-lg shadow-indigo-500/20"
                                        >
                                            Next: Checklist
                                        </button>
                                    )}
                                    {configStep === 2 && (
                                        <>
                                            <button onClick={() => setConfigStep(1)} className="px-4 py-2 text-slate-400 hover:text-white transition-colors">Back</button>
                                            <button
                                                onClick={() => {
                                                    const total = activeChecklist.length;
                                                    const checked = activeChecklist.filter(i => i.checked).length;
                                                    const percentage = total > 0 ? Math.max(10, (checked / total) * 100) : 10;
                                                    updateProgress(selectedItem.id, resolutionNotes, activeChecklist, percentage, true);

                                                    if (activeChecklist.some(i => !i.checked)) {
                                                        if (!confirm("Checklist is incomplete. Do you want to proceed to final verification?")) return;
                                                    }
                                                    setConfigStep(3);
                                                }}
                                                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-semibold shadow-lg shadow-indigo-500/20"
                                            >
                                                Next: Verify
                                            </button>
                                        </>
                                    )}
                                    {configStep === 3 && (
                                        <>
                                            <button onClick={() => setConfigStep(2)} className="px-4 py-2 text-slate-400 hover:text-white transition-colors">Back</button>
                                            <button
                                                onClick={submitProgress}
                                                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-semibold shadow-lg shadow-indigo-500/20"
                                            >
                                                Update Progress & Notify
                                            </button>
                                            <button
                                                onClick={submitResolution}
                                                className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-semibold shadow-lg shadow-emerald-500/20 flex items-center gap-2"
                                            >
                                                Resolve & Close <ArrowRight size={16} />
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ---- BYOD EXIT DETAILS ---- */}
                    {activeModal === 'BYOD_EXIT_DETAILS' && selectedItem && (
                        <div className="bg-slate-900 border border-white/10 rounded-xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in scale-95 duration-200 flex flex-col max-h-[90vh]">
                            <div className="bg-slate-800 p-6 border-b border-white/10 flex justify-between items-center shrink-0">
                                <div>
                                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                        <ShieldCheck size={20} className="text-blue-400" />
                                        BYOD Exit Details
                                    </h2>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="text-xs font-mono text-slate-400 uppercase tracking-wider">{selectedItem.id}</span>
                                    </div>
                                </div>
                                <button onClick={() => setActiveModal(null)} className="text-slate-400 hover:text-white p-2">
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="p-6 overflow-y-auto custom-scrollbar space-y-6">
                                {/* User Info */}
                                <div className="grid grid-cols-2 gap-4 bg-slate-800/50 p-4 rounded-lg border border-white/5">
                                    <div>
                                        <label className="text-xs text-slate-500 uppercase font-bold block mb-1">Employee</label>
                                        <div className="text-white font-medium">{selectedItem.user_name || 'Unknown'}</div>
                                        <div className="text-xs text-slate-400">{selectedItem.user_email || selectedItem.user_id}</div>
                                    </div>
                                    <div>
                                        <label className="text-xs text-slate-500 uppercase font-bold block mb-1">Department</label>
                                        <div className="text-white font-medium">{selectedItem.user_department || 'N/A'}</div>
                                    </div>
                                </div>

                                {/* BYOD Devices Snapshot */}
                                <div>
                                    <h3 className="text-sm font-bold text-slate-300 uppercase mb-3 border-b border-white/5 pb-2">Registered Personal Devices</h3>
                                    {selectedItem.byod_snapshot && selectedItem.byod_snapshot.length > 0 ? (
                                        <div className="space-y-3">
                                            {selectedItem.byod_snapshot.map((device, idx) => (
                                                <div key={idx} className="bg-slate-800 p-3 rounded border border-white/5 flex justify-between items-center">
                                                    <div>
                                                        <div className="font-medium text-white">{device.device_model}</div>
                                                        <div className="text-xs text-slate-400">Serial: {device.serial_number}</div>
                                                    </div>
                                                    <div className="text-xs bg-slate-700 text-slate-300 px-2 py-1 rounded">
                                                        {device.os_version}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-slate-500 text-sm italic">No BYOD devices found in snapshot.</div>
                                    )}
                                </div>
                            </div>

                            <div className="p-4 bg-slate-800 border-t border-white/10 flex justify-end gap-3 shrink-0">
                                <button
                                    onClick={() => setActiveModal(null)}
                                    className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={async () => {
                                        if (confirm(`Confirm MDM unenrollment and data wipe for BYOD devices belonging to ${selectedItem.user_name || selectedItem.user_id}?`)) {
                                            await processExitByod(selectedItem.id);
                                            setActiveModal(null);
                                        }
                                    }}
                                    className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold shadow-lg shadow-blue-500/20 flex items-center gap-2"
                                >
                                    <ShieldCheck size={18} /> Confirm De-registration
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* EXIT WORKFLOW: BYOD De-registration (NEW) */}
            {exitRequests.filter(r => r.status === 'OPEN' || r.status === 'ASSETS_PROCESSED').length > 0 && (
                <div className="glass-panel p-6 animate-in slide-in-from-right-4 duration-500">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-xl font-bold text-white flex items-center gap-3">
                            <ShieldCheck className="text-blue-400" />
                            BYOD Exit Compliance
                            <span className="bg-blue-500/10 text-blue-400 text-xs px-2 py-1 rounded-full border border-blue-500/20">
                                {exitRequests.filter(r => r.status === 'OPEN' || r.status === 'ASSETS_PROCESSED').length} Pending
                            </span>
                        </h3>
                    </div>

                    <div className="space-y-4">
                        {exitRequests.filter(r => r.status === 'OPEN' || r.status === 'ASSETS_PROCESSED').map(req => (
                            <div key={req.id} className="p-4 bg-white/5 border border-white/10 rounded-xl flex justify-between items-center group hover:border-blue-500/30 transition-all">
                                <div>
                                    <div className="text-white font-bold">{req.user_id}</div>
                                    <div className="text-xs text-slate-500 flex items-center gap-2 mt-1">
                                        <Clock size={12} /> Exit Request: {req.id}
                                    </div>
                                    <div className="mt-3 flex gap-2">
                                        {req.byod_snapshot?.map((d, i) => (
                                            <span key={i} className="text-[10px] px-2 py-0.5 bg-slate-800 text-slate-400 rounded border border-white/5">
                                                {d.device_model} ({d.serial_number})
                                            </span>
                                        ))}
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => { setSelectedItem(req); setActiveModal('BYOD_EXIT_DETAILS'); }}
                                        className="px-4 py-2 text-blue-400 hover:text-white border border-blue-500/30 hover:bg-blue-500/10 rounded-xl text-xs font-bold transition-all flex items-center gap-2"
                                    >
                                        <Eye size={14} /> View Details
                                    </button>
                                    <button
                                        onClick={async () => {
                                            if (confirm(`Confirm MDM unenrollment and data wipe for BYOD devices belonging to ${req.user_id}?`)) {
                                                await processExitByod(req.id);
                                            }
                                        }}
                                        className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-blue-500/20"
                                    >
                                        De-register
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
