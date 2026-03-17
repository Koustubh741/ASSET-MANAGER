import { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Archive, TrendingDown, AlertOctagon, CheckCircle, Package, Eye, X, ShieldCheck, FileText } from 'lucide-react';
import { useAssetContext } from '@/contexts/AssetContext';
import { useRole } from '@/contexts/RoleContext';
import ActionsNeededBanner from '@/components/common/ActionsNeededBanner';

export default function InventoryManagerDashboard() {
    const { user } = useRole();
    const { requests, inventoryCheckAvailable, inventoryCheckNotAvailable, inventoryAllocateDelivered, performQC, assets, exitRequests, processExitAssets } = useAssetContext();
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [selectedForQC, setSelectedForQC] = useState(null);
    const [selectedExitRequest, setSelectedExitRequest] = useState(null);

    // ENTERPRISE: Requests awaiting inventory check (exclude fulfilled/closed)
    const awaitingStockCheck = requests.filter(r => {
        const shouldShow = r.currentOwnerRole === 'ASSET_MANAGER' &&
            r.status !== 'FULFILLED' &&
            r.status !== 'CLOSED' &&
            r.procurementStage !== 'DELIVERED';

        // Debug logging
        if (r.currentOwnerRole === 'ASSET_MANAGER') {
            console.log(`[Inventory Filter] Request ${r.id}: status=${r.status}, shouldShow=${shouldShow}`);
        }

        return shouldShow;
    });

    // ENTERPRISE: Delivered items awaiting final allocation (exclude fulfilled/closed)
    const awaitingAllocation = requests.filter(r =>
        (r.currentOwnerRole === 'ASSET_MANAGER' && r.procurementStage === 'DELIVERED') ||
        (r.status === 'QC_PENDING')
    ).filter(r => r.status !== 'FULFILLED' && r.status !== 'CLOSED');

    // REAL DATA: Calculate stock stats from context assets
    const stockStats = assets.reduce((acc, asset) => {
        const type = asset.type || 'Other';
        if (!acc[type]) acc[type] = { name: type, stock: 0, min: 5 }; // Mock min threshold
        if (asset.status === 'In Stock' || asset.status === 'Available') {
            acc[type].stock += 1;
        }
        return acc;
    }, {});

    const realStockData = Object.values(stockStats).sort((a, b) => b.stock - a.stock);
    const displayStockData = realStockData.length > 0 ? realStockData : [
        { name: 'Laptops', stock: 0, min: 5 },
        { name: 'Monitors', stock: 0, min: 5 }
    ];

    const totalSKUs = new Set(assets.map(a => a.type)).size;
    const criticalShortages = realStockData.filter(i => i.stock < i.min).length;

    const exitPending = exitRequests.filter(r => r.status === 'OPEN' || r.status === 'BYOD_PROCESSED').length;

    return (
        <div className="space-y-6">
            <header>
                <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Stock Control</h1>
                <p className="text-slate-500 dark:text-slate-400 mt-1 font-medium">Inventory levels and replenishment alerts</p>
            </header>

            <ActionsNeededBanner
                title="Actions needed"
                items={[
                    ...(awaitingStockCheck.length > 0 ? [{ label: 'Stock check', count: awaitingStockCheck.length, icon: Package, variant: 'primary' }] : []),
                    ...(awaitingAllocation.length > 0 ? [{ label: 'Allocate delivered', count: awaitingAllocation.length, icon: CheckCircle, variant: 'success' }] : []),
                    ...(criticalShortages > 0 ? [{ label: 'Critical shortages', count: criticalShortages, icon: AlertOctagon, variant: 'warning' }] : []),
                    ...(exitPending > 0 ? [{ label: 'Exit reclamations', count: exitPending, icon: Archive, variant: 'info' }] : []),
                ]}
            />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="glass-card p-6 border border-slate-200 dark:border-white/10 hover:shadow-lg transition-all group">
                    <div className="flex justify-between">
                        <div>
                            <p className="text-slate-500 dark:text-slate-400 text-[10px] uppercase font-black tracking-widest">Total SKUs</p>
                            <h3 className="text-xl font-black text-slate-900 dark:text-white mt-1">{totalSKUs}</h3>
                        </div>
                        <div className="p-3 bg-blue-500/10 rounded-xl group-hover:scale-110 transition-transform">
                            <Archive size={20} className="text-blue-500" />
                        </div>
                    </div>
                </div>
                <div className="glass-card p-6 border border-slate-200 dark:border-white/10 hover:shadow-lg transition-all group">
                    <div className="flex justify-between">
                        <div>
                            <p className="text-slate-500 dark:text-slate-400 text-[10px] uppercase font-black tracking-widest">Critical Shortages</p>
                            <h3 className="text-xl font-black text-rose-500 mt-1">{criticalShortages}</h3>
                        </div>
                        <div className="p-3 bg-rose-500/10 rounded-xl group-hover:scale-110 transition-transform">
                            <AlertOctagon size={20} className="text-rose-500" />
                        </div>
                    </div>
                </div>
                <div className="glass-card p-6 border border-slate-200 dark:border-white/10 hover:shadow-lg transition-all group">
                    <div className="flex justify-between">
                        <div>
                            <p className="text-slate-500 dark:text-slate-400 text-[10px] uppercase font-black tracking-widest">To Reorder</p>
                            <h3 className="text-xl font-black text-amber-500 mt-1">{requests.filter(r => r.status === 'PROCUREMENT_REQUIRED').length}</h3>
                        </div>
                        <div className="p-3 bg-amber-500/10 rounded-xl group-hover:scale-110 transition-transform">
                            <TrendingDown size={20} className="text-amber-500" />
                        </div>
                    </div>
                </div>
            </div>

            {/* FULFILLMENT QUEUE (NEW) */}
            <div className="glass-panel p-6 border border-slate-200 dark:border-white/10">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Package className="text-emerald-500 dark:text-emerald-400" />
                        Inventory Stock Check
                        <span className="bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs px-2 py-0.5 rounded-full border border-blue-500/20 font-black">{awaitingStockCheck.length}</span>
                    </h3>
                </div>

                {awaitingStockCheck.length === 0 ? (
                    <div className="p-8 text-center bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-dashed border-slate-200 dark:border-white/10 shadow-sm dark:shadow-inner">
                        <p className="text-slate-900 dark:text-white font-black text-lg">Inventory Clear</p>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 italic">IT-approved requests will be routed here for inventory verification.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto -mx-2 md:mx-0">
                        <table className="w-full text-left min-w-[640px] md:min-w-0">
                            <thead className="bg-slate-50 dark:bg-white/5 text-slate-500 dark:text-slate-400 text-[10px] font-black uppercase tracking-widest border-b border-slate-200 dark:border-white/10">
                                <tr>
                                    <th className="p-3">Asset Request</th>
                                    <th className="p-3">Requested By</th>
                                    <th className="p-3">Approval</th>
                                    <th className="p-3 text-right">Stock Decision</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {awaitingStockCheck.map(req => (
                                    <tr key={req.id} className="hover:bg-slate-50 dark:hover:bg-slate-100 dark:bg-white/5 transition-colors group">
                                        <td className="p-3">
                                            <div className="text-slate-900 dark:text-white font-bold">{req.assetType}</div>
                                            <div className="text-[10px] font-mono font-bold text-slate-500 dark:text-slate-400">{req.id}</div>
                                            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium italic opacity-80 group-hover:opacity-100 transition-opacity">"{req.justification}"</div>
                                        </td>
                                        <td className="p-3">
                                            <div className="text-slate-900 dark:text-white font-bold text-sm">{req.requestedBy.name}</div>
                                            <div className="text-[10px] uppercase font-black tracking-widest text-slate-500 dark:text-slate-400">{req.requestedBy.role}</div>
                                        </td>
                                        <td className="p-3">
                                            <span className="text-[10px] px-2 py-0.5 rounded font-black uppercase tracking-widest bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                                IT APPROVED
                                            </span>
                                        </td>
                                        <td className="p-3 text-right">
                                            <div className="flex justify-end gap-2">
                                                <button
                                                    onClick={() => setSelectedRequest(req)}
                                                    className="bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-slate-200 dark:bg-white/10 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-900 dark:text-white p-2 rounded-xl transition-all border border-slate-200 dark:border-white/10 flex items-center justify-center shadow-sm"
                                                    title="View Details"
                                                >
                                                    <Eye size={16} />
                                                </button>
                                                <button
                                                    onClick={async () => {
                                                        const assetId = prompt(`Enter available asset ID for ${req.assetType}:`, "AST-" + Math.floor(Math.random() * 1000));
                                                        if (assetId) await inventoryCheckAvailable(req.id, assetId, user.name || 'Inventory Manager');
                                                    }}
                                                    className="bg-emerald-600 hover:bg-emerald-500 text-slate-900 dark:text-white text-[10px] uppercase font-black tracking-widest px-4 py-2 rounded-xl shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-2"
                                                >
                                                    <CheckCircle size={14} /> Asset Available
                                                </button>
                                                <button
                                                    onClick={async () => await inventoryCheckNotAvailable(req.id, user.name || 'Inventory Manager')}
                                                    className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white text-[10px] uppercase font-black tracking-widest px-4 py-2 rounded-xl shadow-lg shadow-slate-900/20 transition-all"
                                                >
                                                    Procure New
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* SECTION 2: Allocate Delivered Items */}
            {awaitingAllocation.length > 0 && (
                <div className="glass-panel p-6 border border-slate-200 dark:border-white/10">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <CheckCircle className="text-emerald-500 dark:text-emerald-400" />
                            Delivered Items - Final Allocation
                            <span className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs px-2 py-0.5 rounded-full border border-emerald-500/20 font-black">{awaitingAllocation.length}</span>
                        </h3>
                    </div>

                    <div className="overflow-x-auto -mx-2 md:mx-0">
                        <table className="w-full text-left min-w-[640px] md:min-w-0">
                            <thead className="bg-slate-50 dark:bg-white/5 text-slate-500 dark:text-slate-400 text-[10px] font-black uppercase tracking-widest border-b border-slate-200 dark:border-white/10">
                                <tr>
                                    <th className="p-3">Asset Request</th>
                                    <th className="p-3">Requested By</th>
                                    <th className="p-3">Procurement</th>
                                    <th className="p-3 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {awaitingAllocation.map(req => (
                                    <tr key={req.id} className="hover:bg-slate-50 dark:hover:bg-slate-100 dark:bg-white/5 transition-colors">
                                        <td className="p-3">
                                            <div className="text-slate-900 dark:text-white font-bold">{req.assetType}</div>
                                            <div className="text-[10px] font-mono font-bold text-slate-500 dark:text-slate-400">{req.id}</div>
                                        </td>
                                        <td className="p-3">
                                            <div className="text-slate-900 dark:text-white font-bold text-sm">{req.requestedBy.name}</div>
                                            <div className="text-[10px] uppercase font-black tracking-widest text-slate-500 dark:text-slate-400">{req.requestedBy.role}</div>
                                        </td>
                                        <td className="p-3">
                                            <span className="text-[10px] px-2 py-0.5 rounded font-black uppercase tracking-widest bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                                ✓ DELIVERED
                                            </span>
                                        </td>
                                        <td className="p-3 text-right">
                                            <div className="flex justify-end gap-2">
                                                <button
                                                    onClick={() => setSelectedRequest(req)}
                                                    className="bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-slate-200 dark:bg-white/10 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-900 dark:text-white p-2 rounded-xl transition-all border border-slate-200 dark:border-white/10 flex items-center justify-center shadow-sm"
                                                    title="View Details"
                                                >
                                                    <Eye size={16} />
                                                </button>

                                                {req.status === 'QC_PENDING' ? (
                                                    <button
                                                        onClick={() => setSelectedForQC(req)}
                                                        className="bg-indigo-600 hover:bg-indigo-500 text-slate-900 dark:text-white text-[10px] uppercase font-black tracking-widest px-4 py-2 rounded-xl shadow-lg shadow-indigo-500/20 transition-all flex items-center gap-2"
                                                    >
                                                        <ShieldCheck size={14} /> Perform QC Check
                                                    </button>
                                                ) : (
                                                    <button
                                                        onClick={async () => {
                                                            const assetId = prompt(`Enter asset ID to allocate for ${req.assetType}:`, req.assetId || ("AST-" + Math.floor(Math.random() * 1000)));
                                                            if (assetId) await inventoryAllocateDelivered(req.id, assetId, user.name || 'Inventory Manager');
                                                        }}
                                                        className="bg-emerald-600 hover:bg-emerald-500 text-slate-900 dark:text-white text-[10px] uppercase font-black tracking-widest px-4 py-2 rounded-xl shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-2"
                                                    >
                                                        <CheckCircle size={14} /> Allocate Asset
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* SECTION 3: Exit Reclamations (NEW) */}
            {exitRequests.filter(r => r.status === 'OPEN' || r.status === 'BYOD_PROCESSED').length > 0 && (
                <div className="glass-panel p-6 border border-slate-200 dark:border-white/10">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <Archive className="text-orange-500" />
                            Asset Reclamation (Employee Exit)
                            <span className="bg-orange-500/10 text-orange-600 dark:text-orange-400 text-xs px-2 py-0.5 rounded-full border border-orange-500/20 font-black">
                                {exitRequests.filter(r => r.status === 'OPEN' || r.status === 'BYOD_PROCESSED').length}
                            </span>
                        </h3>
                    </div>

                    <div className="overflow-x-auto -mx-2 md:mx-0">
                        <table className="w-full text-left min-w-[640px] md:min-w-0">
                            <thead className="bg-slate-50 dark:bg-white/5 text-slate-500 dark:text-slate-400 text-[10px] font-black uppercase tracking-widest border-b border-slate-200 dark:border-white/10">
                                <tr>
                                    <th className="p-3">User</th>
                                    <th className="p-3">Assets to Reclaim</th>
                                    <th className="p-3">Status</th>
                                    <th className="p-3 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {exitRequests.filter(r => r.status === 'OPEN' || r.status === 'BYOD_PROCESSED').map(req => (
                                    <tr key={req.id} className="hover:bg-slate-50 dark:hover:bg-slate-100 dark:bg-white/5 transition-colors">
                                        <td className="p-3">
                                            <div className="text-slate-900 dark:text-white font-bold">{req.user_id}</div>
                                            <div className="text-[10px] font-mono font-bold text-slate-500 dark:text-slate-400">Exit ID: {req.id}</div>
                                        </td>
                                        <td className="p-3">
                                            <div className="text-slate-900 dark:text-white text-sm font-bold">
                                                {req.assets_snapshot?.length || 0} Physical Assets
                                            </div>
                                            <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono font-bold italic tracking-tighter">
                                                {req.assets_snapshot?.map(a => a.asset_id).join(', ')}
                                            </div>
                                        </td>
                                        <td className="p-3">
                                            <span className="text-[10px] px-2 py-0.5 rounded font-black uppercase tracking-widest bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20">
                                                {req.status}
                                            </span>
                                        </td>
                                        <td className="p-3 text-right">
                                            <div className="flex justify-end gap-2">
                                                <button
                                                    onClick={() => setSelectedExitRequest(req)}
                                                    className="bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-slate-200 dark:bg-white/10 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-900 dark:text-white p-2 rounded-xl transition-all border border-slate-200 dark:border-white/10 flex items-center gap-1.5 shadow-sm"
                                                    title="View Details"
                                                >
                                                    <Eye size={16} />
                                                    <span className="text-[10px] font-black uppercase tracking-widest">View</span>
                                                </button>
                                                <button
                                                    onClick={async () => {
                                                        if (confirm(`Confirm receipt and QC of all company assets for user ${req.user_id}?`)) {
                                                            await processExitAssets(req.id);
                                                        }
                                                    }}
                                                    className="bg-orange-600 hover:bg-orange-500 text-slate-900 dark:text-white text-[10px] uppercase font-black tracking-widest px-4 py-2 rounded-xl shadow-lg shadow-orange-500/20 transition-all"
                                                >
                                                    Process Returns
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

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="glass-panel p-6 lg:col-span-2 border border-slate-200 dark:border-white/10">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6">Stock Levels by Category</h3>
                    <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={displayStockData}>
                                <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', color: '#1e293b', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                                    cursor={{ fill: 'rgba(0,0,0,0.02)' }}
                                />
                                <Bar dataKey="stock" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="glass-panel p-6 border border-slate-200 dark:border-white/10">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Stock Alerts</h3>
                    <div className="space-y-4">
                        {displayStockData.filter(i => i.stock < i.min).map(item => (
                            <div key={item.name} className="p-4 bg-rose-500/5 dark:bg-rose-500/10 border border-rose-500/10 dark:border-rose-500/20 rounded-xl">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="font-black text-rose-600 dark:text-rose-400 uppercase tracking-widest text-[10px]">{item.name}</span>
                                    <span className="text-[10px] font-black uppercase tracking-widest bg-rose-500 text-slate-900 dark:text-white px-2 py-0.5 rounded-full shadow-sm">Critical</span>
                                </div>
                                <div className="w-full bg-slate-100 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden shadow-sm dark:shadow-inner">
                                    <div className="bg-rose-500 h-full" style={{ width: `${Math.min(100, (item.stock / item.min) * 100)}%` }}></div>
                                </div>
                                <div className="flex justify-between mt-2 text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                                    <span>Stock: {item.stock}</span>
                                    <span>Min: {item.min}</span>
                                </div>
                                <button className="mt-3 w-full py-2 text-[10px] font-black uppercase tracking-widest text-slate-900 dark:text-white bg-rose-600 rounded-lg hover:bg-rose-500 transition-colors shadow-lg shadow-rose-500/20">
                                    Restock Now
                                </button>
                            </div>
                        ))}
                        <div className="p-4 bg-slate-50 dark:bg-white/5 rounded-xl text-center cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-200 dark:bg-white/10 transition-colors border border-dashed border-slate-200 dark:border-white/10">
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">+ View Reconciliation Report</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* EXIT REQUEST DETAILS MODAL */}
            {selectedExitRequest && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-white dark:bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
                        <div className="p-6 border-b border-slate-200 dark:border-white/5 flex justify-between items-center bg-slate-50 dark:bg-white/[0.02]">
                            <h3 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-3">
                                <Eye className="text-orange-500" size={24} />
                                Exit Details
                            </h3>
                            <button
                                onClick={() => setSelectedExitRequest(null)}
                                className="p-2 hover:bg-slate-200 dark:hover:bg-slate-200 dark:bg-white/10 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-900 dark:text-white transition-all shadow-sm"
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-8 space-y-6">
                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <p className="text-[10px] uppercase tracking-widest font-black text-slate-500 dark:text-slate-400 mb-1">Requester</p>
                                    <p className="text-slate-900 dark:text-white font-bold text-lg">{selectedExitRequest.user_id}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] uppercase tracking-widest font-black text-slate-500 dark:text-slate-400 mb-1">Exit ID</p>
                                    <p className="text-sm font-mono font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-lg w-fit">{selectedExitRequest.id}</p>
                                </div>
                            </div>
                            <div>
                                <p className="text-[10px] uppercase tracking-widest font-black text-slate-500 dark:text-slate-400 mb-1">Current Status</p>
                                <span className="text-[10px] px-3 py-1 rounded-full font-black uppercase tracking-widest bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20 shadow-sm">
                                    {selectedExitRequest.status}
                                </span>
                            </div>
                            <div className="p-5 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm dark:shadow-inner">
                                <p className="text-[10px] uppercase tracking-widest font-black text-slate-500 dark:text-slate-400 mb-2">Assets to Reclaim</p>
                                <div className="text-slate-900 dark:text-white font-black text-sm mb-2 flex items-center gap-2">
                                    <Package size={16} className="text-indigo-500" />
                                    {selectedExitRequest.assets_snapshot?.length || 0} Physical Assets Linked
                                </div>
                                <div className="text-[10px] font-mono font-bold text-slate-500 dark:text-slate-400 dark:text-slate-400 bg-white dark:bg-slate-900/50 p-3 rounded-xl border border-slate-200 dark:border-white/5">
                                    {selectedExitRequest.assets_snapshot?.map(a => a.asset_id).join(', ') || 'NONE DETECTED'}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* REQUEST DETAILS MODAL */}
            {selectedRequest && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-white dark:bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
                        <div className="p-6 border-b border-slate-200 dark:border-white/5 flex justify-between items-center bg-slate-50 dark:bg-white/[0.02]">
                            <div>
                                <h3 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-3">
                                    <Eye className="text-blue-600 dark:text-blue-500" size={24} />
                                    Request Specification
                                </h3>
                                <p className="text-[10px] font-mono font-black text-slate-500 dark:text-slate-400 mt-1 uppercase tracking-widest">{selectedRequest.id}</p>
                            </div>
                            <button
                                onClick={() => setSelectedRequest(null)}
                                className="p-2 hover:bg-slate-200 dark:hover:bg-slate-200 dark:bg-white/10 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-900 dark:text-white transition-all shadow-sm"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        <div className="p-8 space-y-8 max-h-[75vh] overflow-y-auto custom-scrollbar">
                            <div className="grid grid-cols-2 gap-8">
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Asset Category</p>
                                    <p className="text-slate-900 dark:text-white font-bold text-lg">{selectedRequest.assetType}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Urgency Level</p>
                                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm border ${selectedRequest.urgency === 'High' ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-white/5'}`}>
                                        {selectedRequest.urgency || 'Standard'}
                                    </span>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Requester Profile</p>
                                    <p className="text-slate-900 dark:text-white font-bold">{selectedRequest.requestedBy?.name}</p>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">{selectedRequest.requestedBy?.department} • {selectedRequest.requestedBy?.position || selectedRequest.requestedBy?.role}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Workflow Status</p>
                                    <p className="text-blue-600 dark:text-blue-400 font-bold flex items-center gap-2">
                                        <TrendingDown size={14} className="rotate-180" />
                                        {selectedRequest.status}
                                    </p>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 italic">{selectedRequest.procurementStage}</p>
                                </div>
                            </div>

                            <div className="p-6 bg-slate-50 dark:bg-white/[0.03] rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm dark:shadow-inner">
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-2">Business Rationale</p>
                                <p className="text-slate-700 dark:text-slate-300 text-sm font-medium leading-relaxed italic border-l-4 border-slate-200 dark:border-slate-700 pl-4 py-1">
                                    {selectedRequest.justification || 'No formal justification documented.'}
                                </p>
                            </div>

                            {selectedRequest.assetId && (
                                <div className="p-5 bg-emerald-500/5 dark:bg-emerald-500/10 rounded-2xl border border-emerald-500/20 flex items-center justify-between shadow-lg shadow-emerald-500/5">
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-500/70 mb-1">Assigned Asset ID</p>
                                        <p className="text-emerald-700 dark:text-emerald-400 font-mono font-black text-lg">{selectedRequest.assetId}</p>
                                    </div>
                                    <CheckCircle size={32} className="text-emerald-500/40" />
                                </div>
                            )}
                            {['PO_UPLOADED', 'PO_VALIDATED', 'FINANCE_APPROVED', 'DELIVERED'].includes(selectedRequest.procurementStage) && (
                                <div className="p-5 bg-indigo-500/5 dark:bg-indigo-500/10 rounded-2xl border border-indigo-500/20 flex items-center justify-between mt-4 shadow-lg shadow-indigo-500/5">
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-500/70 mb-1">Procurement Artifacts</p>
                                        <button
                                            type="button"
                                            onClick={() => window.open(apiClient.getPOViewUrl(selectedRequest.id), '_blank')}
                                            className="text-indigo-600 dark:text-indigo-400 font-black hover:underline flex items-center gap-2 transition-all"
                                        >
                                            <FileText size={18} /> View Signed Purchase Order
                                        </button>
                                    </div>
                                    <FileText size={32} className="text-indigo-500/40" />
                                </div>
                            )}
                        </div>

                        <div className="p-6 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-200 dark:border-white/5 flex justify-end">
                            <button
                                onClick={() => setSelectedRequest(null)}
                                className="px-8 py-3 bg-white dark:bg-slate-900 dark:bg-white hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-100 text-slate-900 dark:text-white dark:text-slate-900 text-xs font-black uppercase tracking-widest rounded-xl transition-all shadow-xl shadow-slate-900/20 dark:shadow-white/5"
                            >
                                Dismiss Details
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* QC PERFORMANCE MODAL */}
            {selectedForQC && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-white dark:bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
                        <div className="p-6 border-b border-slate-200 dark:border-white/5 flex justify-between items-center bg-indigo-500/10">
                            <div>
                                <h3 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-3">
                                    <ShieldCheck className="text-indigo-600 dark:text-indigo-400" size={24} />
                                    Quality Assurance Check
                                </h3>
                                <p className="text-[10px] text-indigo-500 font-mono font-black mt-1 uppercase tracking-widest">{selectedForQC.id}</p>
                            </div>
                            <button
                                onClick={() => setSelectedForQC(null)}
                                className="p-2 hover:bg-indigo-500/10 rounded-xl text-indigo-500 transition-all"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={async (e) => {
                            e.preventDefault();
                            const formData = new FormData(e.target);
                            const status = formData.get('qc_status');
                            const notes = formData.get('qc_notes');
                            if (confirm(`Confirm ${status} result for ${selectedForQC.assetType}?`)) {
                                await performQC(selectedForQC.id, status, notes);
                                setSelectedForQC(null);
                            }
                        }} className="p-6 space-y-6">
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-3">Verification Summary</label>
                                    <div className="grid grid-cols-2 gap-4">
                                        <label className="relative flex items-center p-5 bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl cursor-pointer hover:border-emerald-500/30 has-[:checked]:border-emerald-500 has-[:checked]:bg-emerald-500/5 transition-all group shadow-sm">
                                            <input type="radio" name="qc_status" value="PASSED" defaultChecked className="hidden" />
                                            <div className="flex items-center gap-3">
                                                <div className="w-5 h-5 rounded-full border-2 border-slate-300 dark:border-slate-600 group-has-[:checked]:border-emerald-500 group-has-[:checked]:border-[6px] transition-all" />
                                                <span className="font-black text-xs uppercase tracking-widest text-slate-700 dark:text-white">Passed</span>
                                            </div>
                                        </label>
                                        <label className="relative flex items-center p-5 bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl cursor-pointer hover:border-rose-500/30 has-[:checked]:border-rose-500 has-[:checked]:bg-rose-500/5 transition-all group shadow-sm">
                                            <input type="radio" name="qc_status" value="FAILED" className="hidden" />
                                            <div className="flex items-center gap-3">
                                                <div className="w-5 h-5 rounded-full border-2 border-slate-300 dark:border-slate-600 group-has-[:checked]:border-rose-500 group-has-[:checked]:border-[6px] transition-all" />
                                                <span className="font-black text-xs uppercase tracking-widest text-slate-700 dark:text-white">Failed</span>
                                            </div>
                                        </label>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-2">Technical Discrepancies / Observations</label>
                                    <textarea
                                        name="qc_notes"
                                        required
                                        rows={4}
                                        placeholder="Identify any hardware defects or configuration notes..."
                                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 text-slate-900 dark:text-white placeholder:text-slate-500 dark:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all resize-none font-medium shadow-sm dark:shadow-inner"
                                    ></textarea>
                                </div>
                            </div>

                            <div className="bg-amber-500/10 border border-amber-500/20 p-5 rounded-2xl flex gap-4 text-[10px] font-black uppercase tracking-widest leading-relaxed text-amber-700 dark:text-amber-300 shadow-sm">
                                <AlertOctagon size={20} className="shrink-0 text-amber-500" />
                                <p>Approval facilitates immediate asset transit to User Acceptance. Rejection triggers a procurement dispute workflow.</p>
                            </div>

                            <div className="flex justify-between items-center pt-6 border-t border-slate-200 dark:border-white/5">
                                <button
                                    type="button"
                                    onClick={() => setSelectedForQC(null)}
                                    className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-900 dark:text-white transition-all shadow-sm"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-8 py-3 bg-indigo-600 hover:bg-indigo-500 text-slate-900 dark:text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-xl shadow-indigo-500/30"
                                >
                                    Log Result
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
