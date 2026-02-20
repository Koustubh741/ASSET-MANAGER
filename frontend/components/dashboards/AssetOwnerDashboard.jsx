import { useState } from 'react';
import { Package, CheckCircle, Clock, AlertTriangle, X } from 'lucide-react';
import { useRouter } from 'next/router';
import { useToast } from '@/components/common/Toast';
import ActionsNeededBanner from '@/components/common/ActionsNeededBanner';

export default function AssetOwnerDashboard() {
    const router = useRouter();
    const toast = useToast();

    // Return reason modal state
    const [returnModal, setReturnModal] = useState({ open: false, asset: null });
    const [returnReason, setReturnReason] = useState('');
    const [viewAllModal, setViewAllModal] = useState(false);

    // ====== HARDCODED MOCK DATA ======

    // PENDING VERIFICATION
    const verificationPending = [
        { id: 61, name: 'MacBook Pro M3', asset_tag: 'MOB-001', assigned_date: '2024-03-10', verificationStatus: 'PENDING' },
        { id: 62, name: 'Dell 27" Monitor', asset_tag: 'MON-045', assigned_date: '2024-03-12', verificationStatus: 'PENDING' }
    ];

    // ACTIVE ASSETS
    const activeAssets = [
        { id: 63, name: 'iPhone 15 Pro', asset_tag: 'MOB-882', warranty_expiry: '2025-01-10', verificationStatus: 'VERIFIED' },
        { id: 64, name: 'Ergonomic Chair', asset_tag: 'FUR-104', warranty_expiry: 'N/A', verificationStatus: 'VERIFIED' }
    ];

    // Counts
    const totalAssigned = verificationPending.length + activeAssets.length;
    const activeIssues = 0;

    // ====== BUTTON LOGIC ======

    // Helper function to send notification to IT Admin
    const sendNotificationToITAdmin = (type, asset, details = '') => {
        // Get existing notifications or create new array
        const notifications = JSON.parse(localStorage.getItem('itAdminNotifications') || '[]');

        const notification = {
            id: `NOTIF-${Date.now()}`,
            type: type, // 'RETURN_REQUEST' or 'VERIFICATION_ISSUE'
            assetId: asset.id,
            assetName: asset.name,
            assetTag: asset.asset_tag,
            fromUser: 'prakhyatsrivastava2001',
            details: details,
            timestamp: new Date().toISOString(),
            status: 'UNREAD'
        };

        notifications.unshift(notification); // Add to beginning
        localStorage.setItem('itAdminNotifications', JSON.stringify(notifications));

    };

    // 1. ACCEPT BUTTON
    const handleAccept = (asset) => {
        toast.success(`Asset "${asset.name}" verified and accepted! Asset has been moved to your Active Assets.`);
        // In real implementation, this would update the asset status
    };

    // 2. REPORT BUTTON
    const handleReport = (asset) => {
        // Send notification to IT Admin
        sendNotificationToITAdmin('VERIFICATION_ISSUE', asset, 'Verification issue reported - requires IT review');

        toast.success(`Issue reported for "${asset.name}". Notification sent to IT Admin. The IT Support team will review shortly.`);
    };

    // 3. RETURN BUTTON
    const handleReturnClick = (asset) => {
        setReturnModal({ open: true, asset });
        setReturnReason('');
    };

    const handleReturnSubmit = () => {
        if (!returnReason.trim()) {
            toast.error('Please provide a reason for return');
            return;
        }

        const asset = returnModal.asset;

        // Send notification to IT Admin
        sendNotificationToITAdmin('RETURN_REQUEST', asset, returnReason);

        toast.success(`Return request submitted for "${asset.name}". Notification sent to IT Admin. Reason: ${returnReason}`);

        setReturnModal({ open: false, asset: null });
        setReturnReason('');
    };

    // 4. VIEW ALL BUTTON - Show only active assets modal
    const handleViewAll = () => {
        setViewAllModal(true);
    };

    return (
        <div className="space-y-6">
            <header>
                <h1 className="text-3xl font-bold text-white light:text-slate-800">My Asset Responsibility</h1>
                <p className="text-slate-400">Manage your assigned equipment and verification requests</p>
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
                            <p className="text-slate-400 text-xs uppercase tracking-wider">Total Assigned</p>
                            <h3 className="text-3xl font-bold text-white light:text-slate-800 mt-1">{totalAssigned}</h3>
                        </div>
                        <Package className="text-blue-500" />
                    </div>
                </div>
                <div className="glass-card p-6 border-l-4 border-amber-500">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-slate-400 text-xs uppercase tracking-wider">Pending Verification</p>
                            <h3 className="text-3xl font-bold text-white light:text-slate-800 mt-1">{verificationPending.length}</h3>
                        </div>
                        <Clock className="text-amber-500" />
                    </div>
                </div>
                <div className="glass-card p-6 border-l-4 border-emerald-500">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-slate-400 text-xs uppercase tracking-wider">Active Issues</p>
                            <h3 className="text-3xl font-bold text-white light:text-slate-800 mt-1">{activeIssues}</h3>
                        </div>
                        <CheckCircle className="text-emerald-500" />
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Verification Queue */}
                <div className="glass-panel p-6">
                    <h3 className="text-lg font-bold text-white light:text-slate-800 mb-4 flex items-center gap-2">
                        <AlertTriangle size={18} className="text-amber-400" />
                        Verification Required
                    </h3>
                    <div className="space-y-3">
                        {verificationPending.length === 0 ? (
                            <div className="bg-white/5 p-4 rounded-lg text-center text-slate-400 light:text-slate-600 text-sm">
                                No pending verifications
                            </div>
                        ) : (
                            verificationPending.map(item => (
                                <div key={item.id} className="bg-white/5 p-4 rounded-lg flex justify-between items-center hover:bg-white/10 transition-colors">
                                    <div>
                                        <p className="font-medium text-white">{item.name}</p>
                                        <p className="text-xs text-slate-400">Assigned: {item.assigned_date}</p>
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
                <div className="glass-panel p-6">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-bold text-white light:text-slate-800">My Active Assets</h3>
                        <button
                            onClick={handleViewAll}
                            className="text-sm text-blue-400 hover:text-blue-300 transition-colors font-medium"
                        >
                            View All
                        </button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-slate-400">
                            <thead className="text-xs uppercase bg-white/5 light:bg-slate-50 text-slate-300 light:text-slate-700">
                                <tr>
                                    <th className="px-4 py-3">Asset</th>
                                    <th className="px-4 py-3">Tag</th>
                                    <th className="px-4 py-3">Due Date</th>
                                    <th className="px-4 py-3">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {activeAssets.length === 0 ? (
                                    <tr>
                                        <td colSpan="4" className="px-4 py-6 text-center text-slate-500">
                                            No active assets
                                        </td>
                                    </tr>
                                ) : (
                                    activeAssets.map(asset => (
                                        <tr key={asset.id} className="hover:bg-white/5 transition-colors">
                                            <td className="px-4 py-3 font-medium text-white">{asset.name}</td>
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
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-slate-900 border border-white/10 light:border-slate-200 rounded-2xl w-full max-w-3xl shadow-2xl animate-in zoom-in-95 duration-200 max-h-[80vh] flex flex-col">
                        <div className="p-6 border-b border-white/10 light:border-slate-200 flex justify-between items-center">
                            <div>
                                <h3 className="text-xl font-bold text-white light:text-slate-800">My Active Assets</h3>
                                <p className="text-sm text-slate-400 light:text-slate-600 mt-1">All verified assets currently assigned to you</p>
                            </div>
                            <button
                                onClick={() => setViewAllModal(false)}
                                className="text-slate-400 hover:text-white light:hover:text-slate-900 p-1 rounded-lg hover:bg-white/10 transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto">
                            <div className="grid gap-4">
                                {activeAssets.map(asset => (
                                    <div key={asset.id} className="bg-white/5 border border-white/10 light:border-slate-200 rounded-xl p-4 hover:bg-white/10 transition-colors">
                                        <div className="flex justify-between items-start mb-3">
                                            <div>
                                                <h4 className="text-lg font-bold text-white light:text-slate-800 mb-1">{asset.name}</h4>
                                                <div className="flex gap-3 text-sm text-slate-400">
                                                    <span>Tag: <span className="text-blue-400 font-mono">{asset.asset_tag}</span></span>
                                                    <span>•</span>
                                                    <span>Warranty: <span className="text-slate-300">{asset.warranty_expiry}</span></span>
                                                </div>
                                            </div>
                                            <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full text-xs font-medium">
                                                ✓ VERIFIED
                                            </span>
                                        </div>

                                        <div className="pt-3 border-t border-white/5 light:border-slate-200 flex justify-end">
                                            <button
                                                onClick={() => {
                                                    setViewAllModal(false);
                                                    handleReturnClick(asset);
                                                }}
                                                className="px-4 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded-lg text-sm font-medium transition-colors"
                                            >
                                                Return Asset
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="p-4 border-t border-white/10 light:border-slate-200 bg-white/5 light:bg-slate-50 rounded-b-2xl">
                            <p className="text-xs text-slate-400 light:text-slate-600 text-center">
                                Showing {activeAssets.length} active asset{activeAssets.length !== 1 ? 's' : ''}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* RETURN REASON MODAL */}
            {returnModal.open && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-slate-900 border border-white/10 light:border-slate-200 rounded-2xl w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-white/10 light:border-slate-200 flex justify-between items-center">
                            <h3 className="text-xl font-bold text-white light:text-slate-800">Return Asset</h3>
                            <button
                                onClick={() => setReturnModal({ open: false, asset: null })}
                                className="text-slate-400 hover:text-white light:hover:text-slate-900 p-1 rounded-lg hover:bg-white/10 transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-6">
                            <div className="mb-4">
                                <p className="text-slate-400 text-sm mb-2">Asset: <span className="text-white font-medium">{returnModal.asset?.name}</span></p>
                                <p className="text-slate-400 text-sm">Tag: <span className="text-white font-medium">{returnModal.asset?.asset_tag}</span></p>
                            </div>

                            <label className="block text-sm font-medium text-slate-300 light:text-slate-700 mb-2">
                                Reason for Return <span className="text-rose-400">*</span>
                            </label>
                            <textarea
                                value={returnReason}
                                onChange={(e) => setReturnReason(e.target.value)}
                                placeholder="Please provide a reason for returning this asset..."
                                className="w-full bg-slate-800 border border-white/10 light:border-slate-200 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                                rows="4"
                                required
                            />
                        </div>

                        <div className="p-6 border-t border-white/10 light:border-slate-200 flex gap-3 justify-end">
                            <button
                                onClick={() => setReturnModal({ open: false, asset: null })}
                                className="px-4 py-2 bg-white/10 light:bg-slate-100 hover:bg-white/20 text-white rounded-lg font-medium transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleReturnSubmit}
                                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg font-medium shadow-lg shadow-rose-500/10 transition-all"
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
