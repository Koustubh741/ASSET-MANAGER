import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, FileText, User, ChevronRight, Clock, Wallet, LayoutDashboard, Activity } from 'lucide-react';
import { useAssetContext } from '@/contexts/AssetContext';
import WorkflowProgressBar from '@/components/WorkflowProgressBar';
import { getStatusLabel } from '@/lib/statusLabels';
import AuthGuard from '@/components/AuthGuard';
import FinanceDashboard from '@/components/dashboards/FinanceDashboard';

const NeuralMatrixFinance = () => {
    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
            <div className="absolute inset-0 pixel-grid-overlay opacity-30" />
            <div className="flex flex-wrap gap-1 p-2">
                {Array.from({ length: 150 }).map((_, i) => (
                    <span key={i} className="font-mono text-[10px] text-emerald-500/20" style={{ animation: `flicker ${2 + Math.random() * 3}s infinite` }}>
                        {Math.random() > 0.5 ? '0' : '1'}
                    </span>
                ))}
            </div>
        </div>
    );
};

function FinanceUpdatesContent() {
    const { requests } = useAssetContext();
    const [viewMode, setViewMode] = useState('dashboard'); // Default to dashboard for premium feel

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

    const displayName = (req) => {
        const name = req.requestedBy?.name;
        if (!name) return '—';
        if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(name))) return 'AGENT_SECURE';
        return name.toUpperCase().replace(/ /g, '_');
    };

    return (
        <AuthGuard>
            <div className="min-h-screen zenith-vacuum text-app-text font-['Space_Grotesk'] overflow-hidden relative selection:bg-emerald-500/30">
                <NeuralMatrixFinance />
                
                {/* Visual Header / Scanline */}
                <div className="absolute top-0 left-0 w-full h-[1px] bg-emerald-500/40 shadow-[0_0_15px_var(--emerald-500)] z-50 pointer-events-none opacity-50"></div>

                <div className="w-full px-4 md:px-12 flex flex-col min-h-screen relative z-10 pt-8">
                    
                    {/* TOP NAVIGATION / HEADER */}
                    <div className="shrink-0 mb-8 animate-in fade-in slide-in-from-top-4 duration-700">
                        <div className="flex justify-between items-center">
                            <Link
                                href="/dashboard/system-admin"
                                className="inline-flex items-center gap-2 text-app-text-muted hover:text-emerald-400 transition-colors text-[10px] font-bold uppercase tracking-widest border border-white/5 px-4 py-2 bg-white/5 backdrop-blur-sm"
                            >
                                <ArrowLeft size={16} /> [REVERT_TO_ADMIN_CONTROL]
                            </Link>

                            {/* VIEW TOGGLE */}
                            <div className="flex bg-white/5 border border-white/10 p-1">
                                <button
                                    onClick={() => setViewMode('dashboard')}
                                    className={`flex items-center gap-2 px-4 py-1.5 text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'dashboard' ? 'bg-emerald-600 text-white shadow-[0_0_15px_rgba(16,185,129,0.4)]' : 'text-app-text-muted hover:text-white'}`}
                                >
                                    <LayoutDashboard size={14} /> Strategic_Audit
                                </button>
                                <button
                                    onClick={() => setViewMode('stream')}
                                    className={`flex items-center gap-2 px-4 py-1.5 text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'stream' ? 'bg-emerald-600 text-white shadow-[0_0_15_rgba(16,185,129,0.4)]' : 'text-app-text-muted hover:text-white'}`}
                                >
                                    <Activity size={14} /> Signal_Stream
                                </button>
                            </div>
                        </div>
                        
                        <div className="mt-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
                            <header>
                                <div className="flex items-center gap-4 mb-3">
                                    <div className="w-12 h-12 border-2 border-emerald-500 flex items-center justify-center relative overflow-hidden group">
                                        <Wallet size={28} className="text-emerald-500 glow-text-emerald" />
                                        <div className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-white"></div>
                                    </div>
                                    <div>
                                        <h1 className="text-3xl font-black italic tracking-tighter uppercase text-white">
                                            Capital_Command_{viewMode === 'dashboard' ? 'Audit' : 'Grid'}
                                        </h1>
                                        <div className="flex items-center gap-2 mt-1">
                                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]"></div>
                                            <p className="text-emerald-500/40 text-[10px] tracking-[0.3em] uppercase font-mono">Status: Fiscal_Stability_Synced</p>
                                        </div>
                                    </div>
                                </div>
                            </header>
                        </div>
                    </div>

                    {/* MAIN CONTENT AREA */}
                    <div className="flex-1 pb-12 overflow-y-auto custom-scrollbar pr-2">
                        {viewMode === 'dashboard' ? (
                            <div className="animate-in fade-in duration-700">
                                <FinanceDashboard />
                            </div>
                        ) : financeRelated.length === 0 ? (
                            <div className="glass-panel p-16 text-center border-white/5 bg-white/5">
                                <div className="w-16 h-16 border border-white/10 flex items-center justify-center mx-auto mb-6 opacity-30">
                                    <FileText size={40} className="text-emerald-500" />
                                </div>
                                <h3 className="text-white/40 font-black italic tracking-tighter uppercase mb-2">Null_Fiscal_Burst</h3>
                                <p className="text-[10px] font-mono text-white/20 uppercase tracking-widest">No active financial signals detected in current telemetry window.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                {financeRelated.map((req, idx) => (
                                    <div
                                        key={req.id}
                                        className="fui-status-card group relative overflow-hidden p-6 hover:border-emerald-500/40 transition-all border-white/5 bg-white/2"
                                    >
                                        <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500/20 group-hover:bg-emerald-500 transition-all" />
                                        
                                        <div className="flex justify-between items-start gap-4 mb-6 relative z-10">
                                            <div className="min-w-0">
                                                <div className="flex flex-wrap items-center gap-2 mb-2">
                                                    <span className="font-mono text-[10px] text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 uppercase tracking-tighter">
                                                        FISCAL_ID: {req.id.slice(0, 8)}
                                                    </span>
                                                    <h4 className="text-lg font-bold text-white tracking-tight uppercase">
                                                        {req.assetType || 'ASSET_OBJECT'}
                                                    </h4>
                                                </div>
                                                <div className="flex items-center gap-4 mt-3 text-[9px] font-mono text-white/40 uppercase tracking-widest">
                                                    <div className="flex items-center gap-2">
                                                        <User size={12} className="text-emerald-500" /> 
                                                        <span>{displayName(req)}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2 border-l border-white/10 pl-4">
                                                        <Clock size={12} className="text-emerald-500/60" />
                                                        <span>VECTOR: <span className="text-white">{stepLabel(req)}</span></span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="w-full bg-black/40 p-5 border border-white/5 relative overflow-hidden">
                                            <div className="absolute top-0 left-0 w-1 h-1 border-t border-l border-emerald-500/40"></div>
                                            <div className="mb-3 flex justify-between items-center">
                                                <span className="text-[8px] font-mono tracking-[0.3em] uppercase text-emerald-500/40">Capital_Workflow_Encryption</span>
                                                <span className="text-[8px] font-mono text-emerald-400 group-hover:animate-pulse">SECURE_HANDSHAKE_V1</span>
                                            </div>
                                            <WorkflowProgressBar
                                                compact
                                                currentStatus={req.status === 'PROCUREMENT_REQUIRED' ? 'PROCUREMENT_REQUESTED' : req.status}
                                                isByod={req.assetType === 'BYOD'}
                                            />
                                        </div>

                                        <div className="mt-6 flex justify-between items-center relative z-10">
                                            <div className="text-[8px] font-mono text-white/10 uppercase tracking-widest">SIG_AUTH: VERIFIED_0x71F</div>
                                            <Link
                                                href={`/asset-requests?id=${req.id}`}
                                                className="px-4 py-2 bg-emerald-600/10 border border-emerald-500/20 text-emerald-400 text-[9px] font-bold uppercase tracking-[0.3em] hover:bg-emerald-600/20 hover:border-emerald-500 transition-all flex items-center gap-2"
                                            >
                                                [ACCESS_FISCAL_RECORDS] <ChevronRight size={14} className="group-hover:translate-x-1" />
                                            </Link>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <style jsx>{`
                    @keyframes scan {
                        0% { transform: translateY(-100%); opacity: 0; }
                        10% { opacity: 1; }
                        90% { opacity: 1; }
                        100% { transform: translateY(100vh); opacity: 0; }
                    }
                    .animate-scan {
                        animation: scan 4s linear infinite;
                    }
                    .custom-scrollbar::-webkit-scrollbar {
                        width: 4px;
                    }
                    .custom-scrollbar::-webkit-scrollbar-track {
                        background: rgba(var(--color-kinetic-secondary-rgb), 0.05);
                    }
                    .custom-scrollbar::-webkit-scrollbar-thumb {
                        background: rgba(var(--color-kinetic-secondary-rgb), 0.2);
                    }
                    .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                        background: rgba(var(--color-kinetic-secondary-rgb), 0.4);
                    }
                `}</style>
            </div>
        </AuthGuard>
    );
}

export default function FinanceUpdatesPage() {
    return <FinanceUpdatesContent />;
}
