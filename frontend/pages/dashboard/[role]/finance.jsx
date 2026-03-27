import Link from 'next/link';
import { ArrowLeft, FileText, User, ChevronRight, Clock, Wallet } from 'lucide-react';
import { useAssetContext } from '@/contexts/AssetContext';
import WorkflowProgressBar from '@/components/WorkflowProgressBar';
import { getStatusLabel } from '@/lib/statusLabels';
import AuthGuard from '@/components/AuthGuard';

/**
 * Admin-only: read-only view of Finance workflow updates (each step).
 * URL: /dashboard/system-admin/finance
 * Does NOT link to Finance Portal; shows only status/step updates.
 * Layout is provided by _app.jsx — do not wrap in Layout here to avoid double sidebar.
 */
function FinanceUpdatesContent() {
    const { requests } = useAssetContext();

    // Requests that are in or have passed through the Finance segment (budget queue / approved / rejected)
    const financeRelated = requests.filter((r) => {
        const role = r.currentOwnerRole || '';
        const stage = r.procurementStage || '';
        return (
            role === 'FINANCE' ||
            ['PO_CREATED', 'PO_UPLOADED', 'FINANCE_APPROVED', 'FINANCE_REJECTED'].includes(stage)
        );
    });

    const stepLabel = (req) => {
        const stage = req.procurementStage || '';
        const role = req.currentOwnerRole || '';
        if (role === 'FINANCE' && (stage === 'PO_CREATED' || stage === 'PO_UPLOADED')) return 'Budget review';
        if (stage === 'FINANCE_APPROVED') return 'Budget approved — with Procurement';
        if (stage === 'FINANCE_REJECTED' || stage === 'REJECTED') return 'Budget rejected';
        if (stage === 'PO_CREATED' || stage === 'PO_UPLOADED') return 'Awaiting budget review';
        return getStatusLabel(req.status) || (stage && stage.replace(/_/g, ' ')) || '—';
    };

    const displayName = (req) => {
        const name = req.requestedBy?.name;
        if (!name) return '—';
        if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(name))) return 'Requester';
        return name;
    };

    return (
        <AuthGuard>
            <div className="h-full flex flex-col bg-slate-100 dark:bg-slate-950/80 min-h-screen">
                <div className="w-full px-4 md:px-8 flex flex-col flex-1 min-h-0">
                    <div className="shrink-0 py-4 md:py-6">
                        <Link
                            href="/dashboard/system-admin"
                            className="inline-flex items-center gap-2 text-app-text-muted hover:text-slate-900 dark:hover:text-white dark:text-slate-800 text-sm font-medium"
                        >
                            <ArrowLeft size={18} /> Back to System Admin
                        </Link>
                        <header className="mt-4">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                                    <Wallet size={28} className="text-emerald-400" />
                                </div>
                                <h1 className="text-2xl font-bold text-app-text">Finance updates</h1>
                            </div>
                            <p className="text-app-text-muted text-app-text-muted text-sm">
                                Read-only view of each request’s current step in the finance (budget) workflow. No actions here — use the Finance Portal for operations.
                            </p>
                        </header>
                    </div>

                    <div className="flex-1 min-h-0 overflow-auto pb-6">
                        {financeRelated.length === 0 ? (
                            <div className="rounded-xl border border-app-border bg-app-surface-soft p-8 text-center text-app-text-muted text-app-text-muted">
                                <FileText size={40} className="mx-auto mb-3 opacity-50" />
                                <p className="font-medium">No requests in finance (budget) flow</p>
                                <p className="text-sm mt-1">Requests will appear here when they reach the budget queue (PO created/uploaded).</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {financeRelated.map((req) => (
                                    <div
                                        key={req.id}
                                        className="rounded-xl border border-app-border bg-app-surface-soft overflow-hidden hover:border-emerald-500/20 transition-colors"
                                    >
                                        <div className="p-5 flex flex-col sm:flex-row sm:items-center gap-4">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex flex-wrap items-center gap-2 mb-1">
                                                    <span className="font-mono text-xs text-emerald-400/90 bg-emerald-500/10 px-2 py-0.5 rounded">
                                                        {req.id}
                                                    </span>
                                                    <span className="text-sm font-medium text-app-text">
                                                        {req.assetType || 'Asset'}
                                                    </span>
                                                </div>
                                                <div className="flex flex-wrap items-center gap-3 text-xs text-app-text-muted text-app-text-muted">
                                                    <span className="flex items-center gap-1">
                                                        <User size={12} /> {displayName(req)}
                                                    </span>
                                                    <span className="flex items-center gap-1">
                                                        <Clock size={12} />
                                                        Current step: <strong className="text-slate-700 dark:text-slate-700">{stepLabel(req)}</strong>
                                                    </span>
                                                    {req.procurementStage && (
                                                        <span className="px-1.5 py-0.5 rounded bg-app-surface text-app-text-muted">
                                                            Stage: {req.procurementStage.replace(/_/g, ' ')}
                                                        </span>
                                                    )}
                                                    {req.currentOwnerRole && (
                                                        <span className="px-1.5 py-0.5 rounded bg-app-surface text-app-text-muted">
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
                                        <div className="px-5 py-2 border-t border-app-border flex justify-end">
                                            <Link
                                                href={`/asset-requests?id=${req.id}`}
                                                className="text-xs font-medium text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
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

export default function FinanceUpdatesPage() {
    return <FinanceUpdatesContent />;
}
