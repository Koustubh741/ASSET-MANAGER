import { ShoppingCart, FileText, Calendar, CreditCard, CheckCircle, Truck, XCircle, Upload, Eye } from 'lucide-react';
import { useAssetContext } from '@/contexts/AssetContext';
import ProcurementActionModal from '../ProcurementActionModal';
import { useState } from 'react';
import ActionsNeededBanner from '@/components/common/ActionsNeededBanner';

export default function ProcurementManagerDashboard() {
    const { requests, procurementCreatePO, procurementConfirmDelivery, procurementApprove, procurementReject, procurementUploadPO } = useAssetContext();
    const [selectedRequest, setSelectedRequest] = useState(null);

    // ENTERPRISE: Requests needing PO creation (routed from Inventory)
    const awaitingPO = requests.filter(r =>
        r.currentOwnerRole === 'PROCUREMENT' &&
        r.status === 'PROCUREMENT_REQUIRED' &&
        (!r.procurementStage || r.procurementStage === 'AWAITING_DECISION')
    );

    // ... (rest of initial filter logic) ...

    // ENTERPRISE: Requests with finance approval awaiting delivery confirmation
    const awaitingDelivery = requests.filter(r => r.currentOwnerRole === 'PROCUREMENT' && r.procurementStage === 'FINANCE_APPROVED');

    return (
        <div className="space-y-6">
            <header className="flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-bold text-white">Procurement Hub</h1>
                    <p className="text-slate-400">Manage purchasing, vendors, and budgets</p>
                </div>
                <div className="text-right">
                    <p className="text-xs text-slate-400">Quarterly Budget Remaining</p>
                    <p className="text-2xl font-bold text-emerald-400">₹12,50,000</p>
                </div>
            </header>

            <ActionsNeededBanner
                title="Actions needed"
                items={[
                    ...(awaitingPO.length > 0 ? [{ label: 'Awaiting PO', count: awaitingPO.length, icon: ShoppingCart, variant: 'primary' }] : []),
                    ...(awaitingDelivery.length > 0 ? [{ label: 'Awaiting delivery', count: awaitingDelivery.length, icon: Truck, variant: 'warning' }] : []),
                ]}
            />

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="glass-card p-5">
                    <div className="flex items-center gap-4">
                        <div className="p-3 rounded-lg bg-blue-500/20 text-blue-400">
                            <ShoppingCart size={24} />
                        </div>
                        <div>
                            <h3 className="text-2xl font-bold text-white">{awaitingPO.length}</h3>
                            <p className="text-xs text-slate-400">Awaiting PO</p>
                        </div>
                    </div>
                </div>
                <div className="glass-card p-5">
                    <div className="flex items-center gap-4">
                        <div className="p-3 rounded-lg bg-amber-500/20 text-amber-400">
                            <FileText size={24} />
                        </div>
                        <div>
                            <h3 className="text-2xl font-bold text-white">{awaitingDelivery.length}</h3>
                            <p className="text-xs text-slate-400">Awaiting Delivery</p>
                        </div>
                    </div>
                </div>
                <div className="glass-card p-5">
                    <div className="flex items-center gap-4">
                        <div className="p-3 rounded-lg bg-purple-500/20 text-purple-400">
                            <Calendar size={24} />
                        </div>
                        <div>
                            <h3 className="text-2xl font-bold text-white">12</h3>
                            <p className="text-xs text-slate-400">Expected Deliveries</p>
                        </div>
                    </div>
                </div>
                <div className="glass-card p-5">
                    <div className="flex items-center gap-4">
                        <div className="p-3 rounded-lg bg-rose-500/20 text-rose-400">
                            <CreditCard size={24} />
                        </div>
                        <div>
                            <h3 className="text-2xl font-bold text-white">2</h3>
                            <p className="text-xs text-slate-400">Invoice Discrepancies</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* SECTION 1: Create Purchase Orders */}
            <div className="glass-panel p-6">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <ShoppingCart className="text-blue-400" />
                    Create Purchase Orders
                    <span className="bg-blue-500/10 text-blue-400 text-xs px-2 py-0.5 rounded-full border border-blue-500/20">{awaitingPO.length}</span>
                </h3>

                {awaitingPO.length === 0 ? (
                    <div className="p-8 text-center bg-white/5 rounded-xl border border-dashed border-white/10">
                        <p className="text-slate-400 font-medium">No requests awaiting PO creation</p>
                        <p className="text-sm text-slate-500 mt-1">Approved requests will appear here for purchase order creation.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto -mx-2 md:mx-0">
                    <table className="w-full text-sm text-left min-w-[640px] md:min-w-0">
                        <thead className="text-slate-400 border-b border-white/10 text-xs uppercase font-bold">
                            <tr>
                                <th className="pb-3">Request Details</th>
                                <th className="pb-3">Requested By</th>
                                <th className="pb-3">Justification</th>
                                <th className="pb-3">Status</th>
                                <th className="pb-3 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="text-slate-300 divide-y divide-white/5">
                            {awaitingPO.map(req => (
                                <tr key={req.id} className="hover:bg-white/5 transition-colors">
                                    <td className="py-3">
                                        <div className="font-medium text-white">{req.assetType}</div>
                                        <div className="text-xs text-slate-500 font-mono mt-0.5">{req.id}</div>
                                    </td>
                                    <td className="py-3">
                                        <div>{req.requestedBy.name}</div>
                                        <div className="text-xs text-slate-500">{req.requestedBy.role}</div>
                                    </td>
                                    <td className="py-3">
                                        <div className="text-xs text-slate-400 max-w-xs truncate">{req.justification}</div>
                                    </td>
                                    <td className="py-3">
                                        <span className="px-2 py-1 text-xs rounded font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                            PROCUREMENT REQUIRED
                                        </span>
                                    </td>
                                    <td className="py-3 text-right">
                                        <div className="flex justify-end gap-2">
                                            <button
                                                onClick={() => {
                                                    const reason = prompt("Enter rejection reason:");
                                                    if (reason) procurementReject(req.id, reason, "Procurement Officer");
                                                }}
                                                className="bg-rose-600 hover:bg-rose-500 text-white text-xs px-3 py-2 rounded-lg font-medium shadow-lg shadow-rose-500/10 transition-all flex items-center gap-2"
                                            >
                                                <XCircle size={14} /> Reject
                                            </button>
                                            <button
                                                onClick={() => setSelectedRequest(req)}
                                                className="bg-blue-600 hover:bg-blue-500 text-white text-xs px-4 py-2 rounded-lg font-medium shadow-lg shadow-blue-500/10 transition-all flex items-center gap-2"
                                            >
                                                <Eye size={14} /> Review & Approve
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

            {/* SECTION 2: Confirm Deliveries */}
            {awaitingDelivery.length > 0 && (
                <div className="glass-panel p-6">
                    <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                        <Truck className="text-emerald-400" />
                        Confirm Deliveries (Finance Approved)
                        <span className="bg-emerald-500/10 text-emerald-400 text-xs px-2 py-0.5 rounded-full border border-emerald-500/20">{awaitingDelivery.length}</span>
                    </h3>

                    <div className="overflow-x-auto -mx-2 md:mx-0">
                    <table className="w-full text-sm text-left min-w-[560px] md:min-w-0">
                        <thead className="text-slate-400 border-b border-white/10 text-xs uppercase font-bold">
                            <tr>
                                <th className="pb-3">Asset Type</th>
                                <th className="pb-3">For User</th>
                                <th className="pb-3">PO Stage</th>
                                <th className="pb-3 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="text-slate-300 divide-y divide-white/5">
                            {awaitingDelivery.map(req => (
                                <tr key={req.id} className="hover:bg-white/5 transition-colors">
                                    <td className="py-3">
                                        <div className="font-medium text-white">{req.assetType}</div>
                                        <div className="text-xs text-slate-500 font-mono">{req.id}</div>
                                    </td>
                                    <td className="py-3">{req.requestedBy.name}</td>
                                    <td className="py-3">
                                        <span className="px-2 py-1 text-xs rounded font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                            FINANCE APPROVED
                                        </span>
                                    </td>
                                    <td className="py-3 text-right">
                                        <div className="flex justify-end gap-2">
                                            <button
                                                onClick={() => setSelectedRequest(req)}
                                                className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-all"
                                                title="View Details"
                                            >
                                                <Eye size={18} />
                                            </button>
                                            <button
                                                onClick={() => setSelectedRequest(req)}
                                                className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs px-4 py-2 rounded-lg font-medium shadow-lg shadow-emerald-500/10 transition-all flex items-center gap-2"
                                            >
                                                <CheckCircle size={14} /> Confirm Delivery → Inventory
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
            {/* Procurement Details Modal */}
            <ProcurementActionModal
                isOpen={!!selectedRequest}
                onClose={() => setSelectedRequest(null)}
                request={selectedRequest}
                onUploadPO={procurementUploadPO}
                onReject={procurementReject}
                onConfirmDelivery={procurementConfirmDelivery}
            />
        </div>
    )
}
