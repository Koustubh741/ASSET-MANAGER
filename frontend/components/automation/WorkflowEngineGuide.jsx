import React from 'react';
import { 
    X, 
    Zap, 
    Shield, 
    Activity, 
    ArrowRight, 
    CheckCircle2, 
    Layers, 
    Cpu,
    Target,
    Filter
} from 'lucide-react';

export default function WorkflowEngineGuide({ isOpen, onClose }) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-app-bg/80 backdrop-blur-2xl animate-in fade-in duration-300">
            <div className="w-full max-w-3xl max-h-[90vh] flex flex-col border border-app-border shadow-2xl rounded-[2.5rem] overflow-hidden bg-app-surface">
                
                {/* Header */}
                <div className="p-8 border-b border-app-border bg-app-surface-soft flex justify-between items-center shrink-0">
                    <div>
                        <h3 className="text-2xl font-['Outfit'] font-black text-app-text tracking-tight uppercase flex items-center gap-3">
                            <Cpu size={28} className="text-indigo-500" />
                            Workflow <span className="text-indigo-500 italic">Blueprint</span>
                        </h3>
                        <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.3em] mt-1.5 flex items-center gap-2">
                             Protocol Documentation • v1.1
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-3 bg-app-surface-soft hover:bg-rose-500/20 text-app-text-muted hover:text-rose-500 rounded-none border border-app-border transition-all group"
                    >
                        <X size={20} className="group-hover:rotate-90 transition-transform duration-300" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-8 overflow-y-auto custom-scrollbar flex-1 space-y-10 scroll-smooth">
                    
                    {/* Hero: Order of Operations */}
                    <div className="space-y-6">
                        <label className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.2em] block">01. Order of Operations</label>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {[
                                { title: 'Priority Sort', desc: 'Rules are sorted numerically (Lowest = Highest Priority).', icon: Layers, color: 'indigo' },
                                { title: 'First-Match', desc: 'The engine stops at the first rule that meets all conditions.', icon: Zap, color: 'amber' },
                                { title: 'Deterministic', desc: 'Immutable logic ensures predictability across all tickets.', icon: Shield, color: 'emerald' }
                            ].map((step, i) => (
                                <div key={i} className="p-5 bg-app-surface-soft border border-app-border rounded-none group hover:border-indigo-500/30 transition-all">
                                    <div className={`w-10 h-10 rounded-none flex items-center justify-center bg-${step.color}-500/10 text-${step.color}-400 mb-4`}>
                                        <step.icon size={20} />
                                    </div>
                                    <h4 className="text-xs font-black text-app-text uppercase mb-2 tracking-tight">{step.title}</h4>
                                    <p className="text-[10px] text-app-text-muted leading-relaxed font-medium capitalize">{step.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Anatomy of a Rule */}
                    <div className="space-y-6">
                        <label className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.2em] block">02. Anatomy of a Rule</label>
                        <div className="p-8 bg-app-surface-soft border border-app-border rounded-[2rem] relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600/5 blur-[80px] rounded-full -translate-y-1/2 translate-x-1/2" />
                            
                            <div className="flex flex-col md:flex-row items-center justify-between gap-8 relative z-10">
                                {/* Condition Side */}
                                <div className="flex-1 space-y-4 w-full">
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                                        <span className="text-[10px] font-black text-app-text-muted uppercase tracking-widest">Logic Conditions</span>
                                    </div>
                                    <div className="p-4 bg-indigo-900/20 border border-indigo-500/30 rounded-none flex items-center justify-between">
                                        <div className="text-[11px] font-bold text-indigo-100 italic">IF: Requestor Department</div>
                                        <ArrowRight size={14} className="text-indigo-400" />
                                        <div className="text-[11px] font-black text-indigo-400 uppercase">IS: FINANCE</div>
                                    </div>
                                </div>

                                {/* Process Icon */}
                                <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-slate-500">
                                    <Activity size={20} className="animate-spin-slow" />
                                </div>

                                {/* Action Side */}
                                <div className="flex-1 space-y-4 w-full text-right md:text-left">
                                    <div className="flex items-center justify-end md:justify-start gap-2 mb-2">
                                        <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                        <span className="text-[10px] font-black text-app-text-muted uppercase tracking-widest text-right">Execution Actions</span>
                                    </div>
                                    <div className="p-4 bg-emerald-900/20 border border-emerald-500/30 rounded-none flex items-center justify-between flex-row-reverse md:flex-row">
                                        <div className="text-[11px] font-black text-emerald-400 uppercase">DO: ASSIGN ROLE</div>
                                        <ArrowRight size={14} className="text-emerald-400" />
                                        <div className="text-[11px] font-bold text-emerald-100 italic">FINANCE_MGR</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Logic Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Supported Fields */}
                        <div className="space-y-4">
                            <label className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.2em] flex items-center gap-2">
                                <Filter size={14} /> 03. Target Fields
                            </label>
                            <div className="space-y-2">
                                {[
                                    { name: 'Category', desc: 'Exact match of ITIL category' },
                                    { name: 'Priority', desc: 'Initial ticket priority' },
                                    { name: 'Subject Keywords', desc: 'Case-insensitive string match' },
                                    { name: 'Department', desc: 'Originating requestor dept' }
                                ].map((f, i) => (
                                    <div key={i} className="flex items-center justify-between p-3.5 bg-app-surface-soft border border-app-border rounded-none">
                                        <span className="text-[11px] font-bold text-app-text-muted">{f.name}</span>
                                        <span className="text-[9px] font-black text-slate-500 uppercase italic opacity-60">{f.desc}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Supported Actions */}
                        <div className="space-y-4">
                            <label className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.2em] flex items-center gap-2">
                                <Target size={14} /> 04. Actions
                            </label>
                            <div className="space-y-2">
                                {[
                                    { name: 'Assign to Role', desc: 'Auto-routes to role queue' },
                                    { name: 'Assign to ID', desc: 'Direct User/Group assign' },
                                    { name: 'Override Priority', desc: 'Elevates SLA levels' },
                                    { name: 'Override Status', desc: 'Instant status transition' }
                                ].map((f, i) => (
                                    <div key={i} className="flex items-center justify-between p-3.5 bg-app-surface-soft border border-app-border rounded-none">
                                        <span className="text-[11px] font-bold text-app-text-muted">{f.name}</span>
                                        <span className="text-[9px] font-black text-emerald-500 uppercase italic opacity-60">{f.desc}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Exclusions */}
                    <div className="p-6 bg-rose-500/5 border border-rose-500/20 rounded-none flex items-start gap-5">
                        <div className="p-3 bg-rose-500/10 text-rose-400 rounded-none border border-rose-500/20 shadow-lg shadow-rose-500/5">
                            <AlertCircle size={20} />
                        </div>
                        <div>
                            <h5 className="text-[11px] font-black text-rose-400 uppercase tracking-widest mb-1.5">System Exclusion Boundary</h5>
                            <p className="text-[10px] text-app-text-muted leading-relaxed font-medium">
                                Manual assignments bypass the engine. If a ticket is created with a specific agent or group already nominated, it will <span className="text-rose-600 text-app-text font-bold italic">never</span> undergo auto-routing to prevent protocol hijacking.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-app-border bg-app-surface flex justify-center">
                    <button
                        onClick={onClose}
                        className="px-8 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-[10px] uppercase tracking-[0.2em] rounded-none shadow-xl shadow-indigo-600/20 transition-all active:scale-95"
                    >
                        Acknowledge Protocol
                    </button>
                </div>
            </div>

            <style jsx>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: rgba(100, 116, 139, 0.2);
                    border-radius: 10px;
                }
                :global(.dark) .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: rgba(255, 255, 255, 0.1);
                }
                .animate-spin-slow {
                    animation: spin 8s linear infinite;
                }
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
}

function AlertCircle(props) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
    )
}
