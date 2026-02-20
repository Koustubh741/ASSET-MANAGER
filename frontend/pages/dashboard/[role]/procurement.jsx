import { useRouter } from 'next/router';
import Link from 'next/link';
import { ShoppingBag, ArrowLeft, FileText, User, Package, ChevronRight, Clock } from 'lucide-react';
import { useAssetContext } from '@/contexts/AssetContext';
import WorkflowProgressBar from '@/components/WorkflowProgressBar';
import { getStatusLabel } from '@/lib/statusLabels';
import AuthGuard from '@/components/AuthGuard';

/**
 * Admin-only: read-only view of Procurement workflow updates (each step).
 * URL: /dashboard/system-admin/procurement
 * Does NOT link to Procurement Hub; shows only status/step updates.
 * Layout is provided by _app.jsx — do not wrap in Layout here to avoid double sidebar.
 */
function ProcurementUpdatesContent() {
    const router = useRouter();
    const { requests } = useAssetContext();

    // Requests that are in or have passed through procurement/finance segment
    const procurementRelated = requests.filter((r) => {
        const status = r.status || '';
        const role = r.currentOwnerRole || '';
        const stage = r.procurementStage || '';
        return (
            status === 'PROCUREMENT_REQUIRED' ||
            role === 'PROCUREMENT' ||
            role === 'FINANCE' ||
            status === 'QC_PENDING' ||
            (stage && stage !== 'AWAITING_DECISION' && ['PO_CREATED', 'PO_UPLOADED', 'FINANCE_APPROVED', 'DELIVERED', 'REJECTED', 'FINANCE_REJECTED'].includes(stage))
        );
    });

    const stepLabel = (req) => {
        const s = req.status || '';
        const stage = req.procurementStage || '';
        const role = req.currentOwnerRole || '';
        if (role === 'PROCUREMENT' && (!stage || stage === 'AWAITING_DECISION')) return 'Awaiting PO / decision';
        if (stage === 'PO_CREATED' || stage === 'PO_UPLOADED') return role === 'FINANCE' ? 'Budget review' : 'PO created / uploaded';
        if (stage === 'FINANCE_APPROVED') return 'Awaiting delivery confirmation';
        if (stage === 'DELIVERED' || s === 'QC_PENDING') return 'QC / delivery';
        if (stage === 'REJECTED' || stage === 'FINANCE_REJECTED') return 'Rejected';
        return getStatusLabel(s) || s.replace(/_/g, ' ');
    };

    return (
        <AuthGuard>
            <div className="h-full flex flex-col bg-slate-950/80 light:bg-slate-100 min-h-0">
                <div className="max-w-5xl mx-auto w-full px-4 flex flex-col flex-1 min-h-0">
                    <div className="shrink-0 py-4 md:py-6">
                        <Link
                            href="/dashboard/system-admin"
                            className="inline-flex items-center gap-2 text-slate-400 hover:text-white light:hover:text-slate-800 text-sm font-medium"
                        >
                            <ArrowLeft size={18} /> Back to System Admin
                        </Link>
                        <header className="mt-4">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                                    <ShoppingBag size={28} className="text-amber-400" />
                                </div>
                                <h1 className="text-2xl font-bold text-white light:text-slate-900">Procurement updates</h1>
                            </div>
                            <p className="text-slate-400 light:text-slate-600 text-sm">
                                Read-only view of each request’s current step in the Procurement then Finance workflow (separate roles). No actions here — use the Procurement Hub for operations.
                            </p>
                        </header>
                    </div>

                    <div className="flex-1 min-h-0 overflow-auto pb-6">
                        {procurementRelated.length === 0 ? (
                            <div className="rounded-xl border border-white/10 light:border-slate-200 bg-white/5 light:bg-slate-50 p-8 text-center text-slate-400 light:text-slate-600">
                                <FileText size={40} className="mx-auto mb-3 opacity-50" />
                                <p className="font-medium">No requests in Procurement or Finance flow</p>
                                <p className="text-sm mt-1">New requests will appear here once they are routed to Procurement.</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {procurementRelated.map((req) => (
                                    <div
                                        key={req.id}
                                        className="rounded-xl border border-white/10 light:border-slate-200 bg-white/5 light:bg-slate-50 overflow-hidden hover:border-amber-500/20 transition-colors"
                                    >
                                        <div className="p-5 flex flex-col sm:flex-row sm:items-center gap-4">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex flex-wrap items-center gap-2 mb-1">
                                                    <span className="font-mono text-xs text-amber-400/90 bg-amber-500/10 px-2 py-0.5 rounded">
                                                        {req.id}
                                                    </span>
                                                    <span className="text-sm font-medium text-white light:text-slate-900">
                                                        {req.assetType || 'Asset'}
                                                    </span>
                                                </div>
                                                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 light:text-slate-600">
                                                    <span className="flex items-center gap-1">
                                                        <User size={12} /> {req.requestedBy?.name || '—'}
                                                    </span>
                                                    <span className="flex items-center gap-1">
                                                        <Clock size={12} />
                                                        Current step: <strong className="text-slate-300 light:text-slate-700">{stepLabel(req)}</strong>
                                                    </span>
                                                    {req.procurementStage && (
                                                        <span className="px-1.5 py-0.5 rounded bg-white/10 text-slate-300">
                                                            Stage: {req.procurementStage.replace(/_/g, ' ')}
                                                        </span>
                                                    )}
                                                    {req.currentOwnerRole && (
                                                        <span className="px-1.5 py-0.5 rounded bg-white/10 text-slate-300">
                                                            Owner: {req.currentOwnerRole.replace(/_/g, ' ')}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="w-full sm:w-72 flex-shrink-0">
                                                <WorkflowProgressBar
                                                    compact
                                                    currentStatus={req.status === 'PROCUREMENT_REQUIRED' ? 'PROCUREMENT_REQUESTED' : req.status}
                                                    isByod={req.assetType === 'BYOD'}
                                                />
                                            </div>
                                        </div>
                                        <div className="px-5 py-2 border-t border-white/5 light:border-slate-200 flex justify-end">
                                            <Link
                                                href={`/asset-requests?id=${req.id}`}
                                                className="text-xs font-medium text-amber-400 hover:text-amber-300 flex items-center gap-1"
                                            >
                                                View request <ChevronRight size={14} />
                                            </Link>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </AuthGuard>
    );
}

export default function ProcurementUpdatesPage() {
    return <ProcurementUpdatesContent />;
}
