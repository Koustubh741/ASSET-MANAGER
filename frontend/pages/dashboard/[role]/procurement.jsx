import { useRouter } from 'next/router';
import Link from 'next/link';
import { ShoppingBag, ArrowLeft, FileText, User, Package, ChevronRight, Clock, Disc } from 'lucide-react';
import { useAssetContext } from '@/contexts/AssetContext';
import WorkflowProgressBar from '@/components/WorkflowProgressBar';
import { getStatusLabel } from '@/lib/statusLabels';
import AuthGuard from '@/components/AuthGuard';

function ProcurementUpdatesContent() {
    const router = useRouter();
    const { requests } = useAssetContext();

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
        if (role === 'PROCUREMENT' && (!stage || stage === 'AWAITING_DECISION')) return 'AWAITING_PO_DECISION';
        if (stage === 'PO_CREATED' || stage === 'PO_UPLOADED') return role === 'FINANCE' ? 'BUDGET_REVIEW' : 'PO_PENDING_UPLOAD';
        if (stage === 'FINANCE_APPROVED') return 'DELIVERY_DISPATCHED';
        if (stage === 'DELIVERED' || s === 'QC_PENDING') return 'QUALITY_CONTROL_STAGE';
        if (stage === 'REJECTED' || stage === 'FINANCE_REJECTED') return 'REJECT_PROTOCOL';
        return s.toUpperCase().replace(/ /g, '_');
    };

    return (
        <AuthGuard>
            <div className="min-h-screen bg-app-bg text-app-text font-['Space_Grotesk'] overflow-hidden relative selection:bg-primary/30">
                
                {/* BACKGROUND TELEMETRY LAYERS */}
                <div className="absolute inset-0 pointer-events-none opacity-20 select-none">
                    <div className="absolute top-10 left-10 text-[10px] space-y-1 text-primary/50 uppercase tracking-tight font-mono">
                        <div>LAT: 40.7128° N</div>
                        <div>LNG: 74.0060° W</div>
                        <div>ALT: 42.0m</div>
                    </div>
                    <div className="absolute top-10 right-10 text-[10px] text-success/50 uppercase tracking-tight font-mono text-right">
                        <div>SYSTEM: AEGIS-V4</div>
                        <div>ENCRYPTION: AES-256-GCM</div>
                        <div>STATUS: OPERATIONAL</div>
                    </div>
                    <div className="absolute bottom-10 left-10 w-32 h-[1px] bg-gradient-to-r from-primary/50 to-transparent"></div>
                    <div className="absolute bottom-10 right-10 flex gap-2">
                        <div className="w-1 h-1 bg-success animate-pulse"></div>
                        <div className="text-[10px] text-success/50 font-mono uppercase tracking-widest">{new Date().toISOString().split('T')[1].slice(0, 8)} UTC</div>
                    </div>
                </div>

                {/* SCANNING LINE */}
                <div className="absolute top-0 left-0 w-full h-[2px] bg-primary/20 shadow-[0_0_15px_rgba(var(--color-primary),0.3)] animate-scan z-50 pointer-events-none"></div>

                <div className="w-full px-4 md:px-12 flex flex-col h-screen relative z-10 pt-8">
                    
                    {/* TOP NAVIGATION / HEADER */}
                    <div className="shrink-0 mb-8 animate-in fade-in slide-in-from-top-4 duration-700">
                        <Link
                            href="/dashboard/system-admin"
                            className="inline-flex items-center gap-2 text-app-text-muted hover:text-primary transition-colors text-[10px] font-bold uppercase tracking-widest border border-white/5 px-4 py-2 bg-white/5 backdrop-blur-sm"
                        >
                            <ArrowLeft size={16} /> [REVERT_TO_ADMIN_CONTROL]
                        </Link>
                        
                        <div className="mt-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
                            <header>
                                <div className="flex items-center gap-4 mb-3">
                                    <div className="w-12 h-12 border-2 border-warning flex items-center justify-center relative overflow-hidden">
                                        <ShoppingBag size={28} className="text-warning" />
                                        <div className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-app-text"></div>
                                    </div>
                                    <div>
                                        <h1 className="text-3xl font-bold tracking-[0.2em] uppercase text-app-text">
                                            Procurement_Updates
                                        </h1>
                                        <div className="flex items-center gap-2 mt-1">
                                            <div className="w-2 h-2 rounded-full bg-warning animate-pulse shadow-[0_0_8px_var(--color-warning)]"></div>
                                            <p className="text-app-text-muted text-[10px] tracking-widest uppercase font-medium">Sector: Logistics / Supply_Chain_Relay</p>
                                        </div>
                                    </div>
                                </div>
                            </header>
                            
                            <div className="glass-panel !rounded-none border-warning/20 bg-warning/5 p-4 max-w-md">
                                <p className="text-[10px] text-warning/80 leading-relaxed font-medium uppercase tracking-wider">
                                    READ-ONLY: Monitoring active supply chain signal bursts. 
                                    Cross-referencing Procurement/Finance status protocols. 
                                    Unauthorized overrides disabled in this sector.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* MAIN CONTENT GRID */}
                    <div className="flex-1 min-h-0 overflow-auto pb-12 custom-scrollbar pr-2">
                        {procurementRelated.length === 0 ? (
                            <div className="glass-panel !rounded-none border-app-border/30 bg-app-surface/40 p-16 text-center animate-in zoom-in-95 duration-700">
                                <div className="w-16 h-16 border border-app-text/10 flex items-center justify-center mx-auto mb-6 opacity-30">
                                    <FileText size={40} className="text-app-text" />
                                </div>
                                <h3 className="text-xl font-bold tracking-widest uppercase mb-2">Null_Signal</h3>
                                <p className="text-app-text-muted text-xs tracking-widest uppercase">No active procurement related signals detected in current cycle.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                {procurementRelated.map((req, idx) => (
                                    <div
                                        key={req.id}
                                        className="relative group animate-in fade-in slide-in-from-bottom-4 duration-500"
                                        style={{ animationDelay: `${idx * 100}ms` }}
                                    >
                                        <div className="glass-panel !rounded-none border-app-border/30 bg-app-surface/50 overflow-hidden hover:border-primary/50 transition-all group-hover:bg-app-surface/80 group-hover:translate-x-1">
                                            {/* Accent Left Border */}
                                            <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-warning/40 group-hover:bg-primary transition-colors"></div>
                                            
                                            <div className="p-6">
                                                <div className="flex justify-between items-start gap-4 mb-6">
                                                    <div className="min-w-0">
                                                        <div className="flex flex-wrap items-center gap-2 mb-2">
                                                            <span className="font-mono text-[10px] text-warning bg-warning/10 border border-warning/20 px-2 py-0.5 uppercase tracking-tighter">
                                                                ID: {req.id}
                                                            </span>
                                                            <span className="text-sm font-bold text-app-text uppercase tracking-widest truncate">
                                                                {req.assetType || 'ASSET_OBJECT'}
                                                            </span>
                                                        </div>
                                                        <div className="grid grid-cols-2 gap-x-6 gap-y-2 mt-4 text-[10px] font-bold uppercase tracking-widest text-app-text-muted">
                                                            <div className="flex items-center gap-2">
                                                                <User size={12} className="text-primary/60" /> 
                                                                <span className="truncate">{req.requestedBy?.name || 'UNKNOWN_AGENT'}</span>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <Package size={12} className="text-primary/60" /> 
                                                                <span>{req.assetType || 'ASSET'}</span>
                                                            </div>
                                                            <div className="col-span-2 flex items-center gap-2 border-t border-white/5 pt-2 mt-1">
                                                                <Clock size={12} className="text-warning/60" />
                                                                <span>STATUS: <strong className="text-app-text">{stepLabel(req)}</strong></span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    
                                                    {/* Technical Detail Badge */}
                                                    <div className="shrink-0 flex flex-col items-end gap-1">
                                                        <div className="text-[9px] font-mono text-primary/40 uppercase tracking-tighter">Owner_Role: {req.currentOwnerRole || 'NA'}</div>
                                                        <div className="text-[9px] font-mono text-primary/40 uppercase tracking-tighter">Stage: {req.procurementStage || 'NONE'}</div>
                                                    </div>
                                                </div>

                                                <div className="w-full bg-white/5 p-4 border border-white/5 relative overflow-hidden">
                                                    <div className="absolute top-0 left-0 w-1 h-1 border-t border-l border-primary/40"></div>
                                                    <div className="mb-2 flex justify-between items-center">
                                                        <span className="text-[9px] font-bold tracking-[0.2em] uppercase text-app-text-muted/60">Deployment_Workflow_Relay</span>
                                                        <span className="text-[9px] font-mono text-primary/60">ACT_V4.02</span>
                                                    </div>
                                                    <WorkflowProgressBar
                                                        compact
                                                        currentStatus={req.status === 'PROCUREMENT_REQUIRED' ? 'PROCUREMENT_REQUESTED' : req.status}
                                                        isByod={req.assetType === 'BYOD'}
                                                    />
                                                </div>

                                                <div className="mt-6 flex justify-end">
                                                    <Link
                                                        href={`/asset-requests?id=${req.id}`}
                                                        className="text-[10px] font-bold text-primary hover:text-white flex items-center gap-2 uppercase tracking-[0.3em] transition-all group-hover:gap-3"
                                                    >
                                                        [ACCESS_FULL_SIGNAL] <ChevronRight size={14} className="group-hover:translate-x-1" />
                                                    </Link>
                                                </div>
                                            </div>
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
                        background: rgba(var(--color-primary), 0.05);
                    }
                    .custom-scrollbar::-webkit-scrollbar-thumb {
                        background: rgba(var(--color-primary), 0.2);
                    }
                    .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                        background: rgba(var(--color-primary), 0.4);
                    }
                `}</style>
            </div>
        </AuthGuard>
    );
}

export default function ProcurementUpdatesPage() {
    return <ProcurementUpdatesContent />;
}
