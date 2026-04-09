import { useState, useEffect } from 'react';
import { Package, CheckCircle, Clock, AlertTriangle, X } from 'lucide-react';
import { useRouter } from 'next/router';
import { useToast } from '@/components/common/Toast';
import ActionsNeededBanner from '@/components/common/ActionsNeededBanner';
import apiClient from '@/lib/apiClient';

export default function AssetOwnerDashboard() {
    const router = useRouter();
    const toast = useToast();

    // Return reason modal state
    const [returnModal, setReturnModal] = useState({ open: false, asset: null });
    const [returnReason, setReturnReason] = useState('');
    const [viewAllModal, setViewAllModal] = useState(false);

    // Dynamic State
    const [myAssets, setMyAssets] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchMyAssets = async () => {
        try {
            setIsLoading(true);
            const response = await apiClient.get('/assets/my-assets');
            setMyAssets(response.data || []);
        } catch (error) {
            console.error('Failed to fetch user assets:', error);
            toast.error('Failed to load your assigned assets');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchMyAssets();
    }, []);

    // Filter Assets based on Acceptance Status
    const verificationPending = myAssets.filter(
        asset => asset.status === 'Active' && (!asset.acceptance_status || asset.acceptance_status === 'PENDING')
    );
    const activeAssets = myAssets.filter(
        asset => asset.status === 'Active' && asset.acceptance_status === 'ACCEPTED'
    );

    // Counts
    const totalAssigned = myAssets.length;
    const activeIssues = 0; // Keeping as 0 until we have a ticket integration for 'My Tickets'

    // ====== BUTTON LOGIC ======

    // 1. ACCEPT BUTTON
    const handleAccept = async (asset) => {
        try {
            await apiClient.patch(`/assets/${asset.id}/verification`, {
                acceptance_status: 'ACCEPTED'
            });
            toast.success(`Asset "${asset.name}" verified and accepted!`);
            fetchMyAssets(); // Refresh list
        } catch (error) {
            console.error('Acceptance failed:', error);
            toast.error(error.response?.data?.detail || 'Failed to verify asset');
        }
    };

    // 2. REPORT BUTTON
    const handleReport = async (asset) => {
        const reason = window.prompt(`Please briefly describe the issue with "${asset.name}":`, "");
        if (reason === null) return; // Cancelled
        try {
            await apiClient.patch(`/assets/${asset.id}/verification`, {
                acceptance_status: 'REJECTED',
                reason: reason || "No description provided"
            });
            // Auto open a ticket
            await apiClient.post('/tickets', {
                title: `Asset Verification Issue: ${asset.name}`,
                description: `User reported an issue during verification. Reason: ${reason || "No description provided"}`,
                category: "Hardware",
                priority: "High",
                asset_id: asset.id
            });
            toast.success(`Issue reported for "${asset.name}". A support ticket has been opened.`);
            fetchMyAssets(); // Refresh list
        } catch (error) {
            console.error('Reporting failed:', error);
            toast.error(error.response?.data?.detail || 'Failed to report issue');
        }
    };

    // 3. RETURN BUTTON
    const handleReturnClick = (asset) => {
        setReturnModal({ open: true, asset });
        setReturnReason('');
    };

    const handleReturnSubmit = async () => {
        if (!returnReason.trim()) {
            toast.error('Please provide a reason for return');
            return;
        }

        const asset = returnModal.asset;

        try {
            await apiClient.post('/tickets', {
                title: `Hardware Return Request: ${asset.name}`,
                description: `User requested to return asset. Reason: ${returnReason}`,
                category: "Hardware Pickup/Return",
                priority: "Medium",
                asset_id: asset.id
            });
            toast.success(`Return request submitted for "${asset.name}".`);
            setReturnModal({ open: false, asset: null });
            setReturnReason('');
        } catch (error) {
            console.error('Return request failed:', error);
            toast.error(error.response?.data?.detail || 'Failed to submit return request');
        }
    };

    // 4. VIEW ALL BUTTON - Show only active assets modal
    const handleViewAll = () => {
        setViewAllModal(true);
    };

    return (
        <div className="space-y-6 neural-compact">
            <header>
                <h1 className="text-xl font-bold text-app-text">My Asset Responsibility</h1>
                <p className="text-app-text-muted">Manage your assigned equipment and verification requests</p>
            </header>

            <ActionsNeededBanner
                title="Actions needed"
                items={[
                    ...(verificationPending.length > 0 ? [{ label: 'Pending verification', count: verificationPending.length, icon: Clock, variant: 'warning' }] : []),
                ]}
            />

            {/* KPI Cards - LIVE COUNTS */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="glass-card p-6 border-l-4 border-blue-500">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-app-text-muted text-xs uppercase tracking-wider">Total Assigned</p>
                            <h3 className="text-xl font-bold text-app-text mt-1">{totalAssigned}</h3>
                        </div>
                        <Package className="text-blue-500" />
                    </div>
                </div>
                <div className="glass-card p-6 border-l-4 border-amber-500">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-app-text-muted text-xs uppercase tracking-wider">Pending Verification</p>
                            <h3 className="text-xl font-bold text-app-text mt-1">{verificationPending.length}</h3>
                        </div>
                        <Clock className="text-amber-500" />
                    </div>
                </div>
                <div className="glass-card p-6 border-l-4 border-emerald-500">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-app-text-muted text-xs uppercase tracking-wider">Active Issues</p>
                            <h3 className="text-xl font-bold text-app-text mt-1">{activeIssues}</h3>
                        </div>
                        <CheckCircle className="text-emerald-500" />
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Verification Queue */}
                <div className="glass-panel p-6 border border-app-border">
                    <h3 className="text-lg font-bold text-app-text mb-4 flex items-center gap-2">
                        <AlertTriangle size={18} className="text-amber-400" />
                        Verification Required
                    </h3>
                    <div className="space-y-3">
                        {verificationPending.length === 0 ? (
                            <div className="bg-app-surface-soft p-4 rounded-none text-center text-app-text-muted text-sm border border-app-border">
                                No pending verifications
                            </div>
                        ) : (
                            verificationPending.map(item => (
                                <div key={item.id} className="bg-app-surface-soft p-4 rounded-none flex justify-between items-center hover:bg-slate-100 dark:hover:bg-app-surface border border-app-border transition-colors">
                                    <div>
                                        <p className="font-medium text-app-text">{item.name}</p>
                                        <p className="text-xs text-app-text-muted">Assigned: {item.assigned_date}</p>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handleAccept(item)}
                                            className="px-3 py-1.5 bg-emerald-500/10 text-emerald-400 rounded text-sm hover:bg-emerald-500/20 transition-colors font-medium"
                                        >
                                            Accept
                                        </button>
                                        <button
                                            onClick={() => handleReport(item)}
                                            className="px-3 py-1.5 bg-rose-500/10 text-rose-400 rounded text-sm hover:bg-rose-500/20 transition-colors font-medium"
                                        >
                                            Report
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* My Assets */}
                <div className="glass-panel p-6 border border-app-border">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-bold text-app-text">My Active Assets</h3>
                        <button
                            onClick={handleViewAll}
                            className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-500 transition-colors font-medium"
                        >
                            View All
                        </button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-app-text-muted">
                            <thead className="text-xs uppercase bg-app-surface-soft text-app-text-muted border-b border-app-border">
                                <tr>
                                    <th className="px-4 py-3">Asset</th>
                                    <th className="px-4 py-3">Tag</th>
                                    <th className="px-4 py-3">Due Date</th>
                                    <th className="px-4 py-3">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                                {activeAssets.length === 0 ? (
                                    <tr>
                                        <td colSpan="4" className="px-4 py-6 text-center text-app-text-muted">
                                            No active assets
                                        </td>
                                    </tr>
                                ) : (
                                    activeAssets.map(asset => (
                                        <tr key={asset.id} className="hover:bg-slate-50 dark:hover:bg-app-surface-soft transition-colors">
                                            <td className="px-4 py-3 font-medium text-app-text">{asset.name}</td>
                                            <td className="px-4 py-3">{asset.asset_tag}</td>
                                            <td className="px-4 py-3">{asset.warranty_expiry}</td>
                                            <td className="px-4 py-3">
                                                <button
                                                    onClick={() => handleReturnClick(asset)}
                                                    className="text-xs text-rose-400 hover:text-rose-300 border border-current px-2 py-0.5 rounded transition-colors"
                                                >
                                                    Return
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* VIEW ALL ACTIVE ASSETS MODAL */}
            {viewAllModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-50 dark:bg-slate-950/60 dark:bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-slate-900 border border-app-border rounded-none w-full max-w-3xl shadow-2xl animate-in zoom-in-95 duration-200 max-h-[80vh] flex flex-col">
                        <div className="p-6 border-b border-app-border flex justify-between items-center">
                            <div>
                                <h3 className="text-xl font-bold text-app-text">My Active Assets</h3>
                                <p className="text-sm text-app-text-muted mt-1">All verified assets currently assigned to you</p>
                            </div>
                            <button
                                onClick={() => setViewAllModal(false)}
                                className="text-app-text-muted hover:text-slate-900 dark:hover:text-white p-1 rounded-none hover:bg-slate-200 hover:text-slate-900 dark:hover:bg-app-surface transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto">
                            <div className="grid gap-4">
                                {activeAssets.map(asset => (
                                    <div key={asset.id} className="bg-app-surface-soft border border-app-border rounded-none p-4 hover:bg-slate-100 dark:hover:bg-app-surface transition-colors">
                                        <div className="flex justify-between items-start mb-3">
                                            <div>
                                                <h4 className="text-lg font-bold text-app-text mb-1">{asset.name}</h4>
                                                <div className="flex gap-3 text-sm text-app-text-muted">
                                                    <span>Tag: <span className="text-blue-400 font-mono">{asset.asset_tag}</span></span>
                                                    <span>•</span>
                                                    <span>Warranty: <span className="text-app-text-muted">{asset.warranty_expiry}</span></span>
                                                </div>
                                            </div>
                                            <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full text-xs font-medium">
                                                ✓ VERIFIED
                                            </span>
                                        </div>

                                        <div className="pt-3 border-t border-app-border flex justify-end">
                                            <button
                                                onClick={() => {
                                                    setViewAllModal(false);
                                                    handleReturnClick(asset);
                                                }}
                                                className="px-4 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded-none text-sm font-medium transition-colors"
                                            >
                                                Return Asset
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="p-4 border-t border-app-border bg-app-surface-soft rounded-b-2xl">
                            <p className="text-xs text-app-text-muted text-center">
                                Showing {activeAssets.length} active asset{activeAssets.length !== 1 ? 's' : ''}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* RETURN REASON MODAL */}
            {returnModal.open && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-50 dark:bg-slate-950/60 dark:bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-slate-900 border border-app-border rounded-none w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-app-border flex justify-between items-center">
                            <h3 className="text-xl font-bold text-app-text">Return Asset</h3>
                            <button
                                onClick={() => setReturnModal({ open: false, asset: null })}
                                className="text-app-text-muted hover:text-slate-900 dark:hover:text-white p-1 rounded-none hover:bg-slate-200 hover:text-slate-900 dark:hover:bg-app-surface transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-6">
                            <div className="mb-4">
                                <p className="text-app-text-muted text-sm mb-2">Asset: <span className="text-app-text font-medium">{returnModal.asset?.name}</span></p>
                                <p className="text-app-text-muted text-sm">Tag: <span className="text-app-text font-medium">{returnModal.asset?.asset_tag}</span></p>
                            </div>

                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-700 mb-2">
                                Reason for Return <span className="text-rose-400">*</span>
                            </label>
                            <textarea
                                value={returnReason}
                                onChange={(e) => setReturnReason(e.target.value)}
                                placeholder="Please provide a reason for returning this asset..."
                                className="w-full bg-slate-50 dark:bg-slate-800 border border-app-border rounded-none px-4 py-3 text-app-text placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                                rows="4"
                                required
                            />
                        </div>

                        <div className="p-6 border-t border-app-border flex gap-3 justify-end">
                            <button
                                onClick={() => setReturnModal({ open: false, asset: null })}
                                className="px-4 py-2 bg-slate-100 bg-app-surface hover:bg-white/20 text-app-text rounded-none font-medium transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleReturnSubmit}
                                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-app-text rounded-none font-medium shadow-lg shadow-rose-500/10 transition-all"
                            >
                                Submit Return Request
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
