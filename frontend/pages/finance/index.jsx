import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Wallet, LayoutDashboard, Activity } from 'lucide-react';
import AuthGuard from '@/components/AuthGuard';
import FinanceDashboard from '@/components/dashboards/FinanceDashboard';
import { useAssetContext } from '@/contexts/AssetContext';
import WorkflowProgressBar from '@/components/WorkflowProgressBar';
import { getStatusLabel } from '@/lib/statusLabels';

function FinancePortalContent() {
    const [viewMode, setViewMode] = useState('dashboard');
    const { requests } = useAssetContext();

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
        if (role === 'FINANCE' && (stage === 'PO_CREATED' || stage === 'PO_UPLOADED')) return 'BUDGET_ANALYSIS_QUEUE';
        if (stage === 'FINANCE_APPROVED') return 'FUNDS_COMMITTED';
        if (stage === 'FINANCE_REJECTED' || stage === 'REJECTED') return 'BUDGET_REJECT_PROTOCOL';
        if (stage === 'PO_CREATED' || stage === 'PO_UPLOADED') return 'AWAITING_FINANCE_SYNC';
        return (getStatusLabel(req.status) || (stage && stage.replace(/_/g, ' ')) || 'UNKNOWN').toUpperCase().replace(/ /g, '_');
    };

    return (
        <AuthGuard profileCheck>
            <div className="min-h-screen bg-app-void text-app-text font-['Space_Grotesk'] overflow-hidden relative selection:bg-app-secondary/30">
                <div className="absolute top-0 left-0 w-full h-[2px] bg-app-secondary/20 shadow-[0_0_15px_rgba(var(--color-kinetic-secondary-rgb),0.3)] animate-scan z-50 pointer-events-none"></div>

                <div className="w-full px-4 md:px-12 flex flex-col min-h-screen relative z-10 pt-8">
                    <div className="shrink-0 mb-8 flex justify-between items-center">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 border-2 border-app-secondary flex items-center justify-center relative overflow-hidden">
                                <Wallet size={28} className="text-app-secondary" />
                            </div>
                            <div>
                                <h1 className="text-3xl font-bold tracking-[0.2em] uppercase text-app-text">
                                    Finance_{viewMode === 'dashboard' ? 'Governance' : 'Updates'}
                                </h1>
                                <p className="text-app-text-muted text-[10px] tracking-widest uppercase font-medium">Sector: Capital_Management / {viewMode === 'dashboard' ? 'Strategic_Audit' : 'Budget_Relay'}</p>
                            </div>
                        </div>

                        <div className="flex bg-white/5 border border-white/10 p-1">
                            <button
                                onClick={() => setViewMode('dashboard')}
                                className={`flex items-center gap-2 px-4 py-1.5 text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'dashboard' ? 'bg-app-secondary text-app-void' : 'text-app-text-muted hover:text-white'}`}
                            >
                                <LayoutDashboard size={14} /> Analytics
                            </button>
                            <button
                                onClick={() => setViewMode('stream')}
                                className={`flex items-center gap-2 px-4 py-1.5 text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'stream' ? 'bg-app-secondary text-app-void' : 'text-app-text-muted hover:text-white'}`}
                            >
                                <Activity size={14} /> Signal_Stream
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 pb-12 overflow-y-auto custom-scrollbar">
                        {viewMode === 'dashboard' ? (
                            <FinanceDashboard />
                        ) : financeRelated.length === 0 ? (
                            <div className="glass-panel !rounded-none border-app-border/30 bg-app-surface/40 p-16 text-center animate-in zoom-in-95 duration-700">
                                <h3 className="text-xl font-bold tracking-widest uppercase">Null_Signal</h3>
                                <p className="text-app-text-muted text-xs tracking-widest">No active financial signals detected.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                {financeRelated.map((req) => (
                                    <div key={req.id} className="glass-panel !rounded-none border-app-border/30 bg-app-surface-soft p-6">
                                        <div className="flex justify-between items-start mb-4">
                                            <span className="font-mono text-[10px] text-app-secondary uppercase tracking-tighter">ID: {req.id}</span>
                                            <span className="text-sm font-bold text-app-text uppercase tracking-widest">{req.assetType || 'ASSET_OBJECT'}</span>
                                        </div>
                                        <div className="mb-4 text-[10px] font-bold uppercase tracking-widest text-app-text-muted italic">
                                            STATUS: <strong className="text-app-text">{stepLabel(req)}</strong>
                                        </div>
                                        <WorkflowProgressBar compact currentStatus={req.status} isByod={req.assetType === 'BYOD'} />
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

export default function FinancePortalPage() {
    return <FinancePortalContent />;
}
