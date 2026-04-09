import React from 'react';
import { X, Info, Clock, Zap, CheckCircle, BarChart3, AlertCircle, HelpCircle, ShieldCheck } from 'lucide-react';

export default function SLAGuideModal({ isOpen, onClose }) {
    if (!isOpen) return null;

    const priorities = [
        { label: 'Critical', color: 'text-rose-500', bg: 'bg-rose-500/10', border: 'border-rose-500/20', desc: 'Urgent system-wide outages or major data loss.' },
        { label: 'High', color: 'text-amber-500', bg: 'bg-amber-500/10', border: 'border-amber-500/20', desc: 'Significant functional degradation for multiple users.' },
        { label: 'Medium', color: 'text-indigo-500', bg: 'bg-indigo-500/10', border: 'border-indigo-500/20', desc: 'Normal service requests or minor functional bugs.' },
        { label: 'Low', color: 'text-emerald-500', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', desc: 'Information requests or minor aesthetic adjustments.' }
    ];

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-50/10 dark:bg-slate-950/40 backdrop-blur-md animate-in fade-in duration-300">
            <div className="glass-panel w-full max-w-2xl max-h-[85vh] flex flex-col border border-slate-300 border-app-border shadow-2xl rounded-[2.5rem] overflow-hidden bg-white dark:bg-slate-900">

                <div className="p-6 md:p-8 border-b border-app-border bg-slate-50 dark:bg-white/[0.02] flex justify-between items-center shrink-0">
                    <div>
                        <h3 className="text-2xl font-['Outfit'] font-bold text-app-text tracking-tight flex items-center gap-3">
                            <ShieldCheck size={24} className="text-indigo-500" />
                            SLA Compliance Guide
                        </h3>
                        <p className="text-[10px] text-app-text-muted font-black uppercase tracking-[0.2em] mt-1">
                            Operational Excellence Standards
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-3 bg-slate-200 dark:bg-white/[0.03] hover:bg-slate-300 dark:hover:bg-white/[0.08] text-app-text-muted rounded-none border border-slate-300 border-app-border transition-all"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 md:p-8 overflow-y-auto custom-scrollbar flex-1 space-y-10 bg-white dark:bg-slate-900">

                    {/* Core Metrics Section */}
                    <div>
                        <label className="text-[10px] font-black text-app-text-muted uppercase tracking-widest block mb-4">Core Performance Metrics</label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="p-5 bg-slate-50 dark:bg-white/[0.03] rounded-none border border-app-border shadow-sm">
                                <div className="flex items-center gap-3 mb-3 text-indigo-500">
                                    <Clock size={20} />
                                    <span className="font-bold text-sm">Response Target</span>
                                </div>
                                <p className="text-xs text-slate-600 text-app-text-muted leading-relaxed">
                                    The maximum time allowed for an agent to **acknowledge** or **first-reply** to a new ticket. Measured from the moment of submission.
                                </p>
                            </div>
                            <div className="p-5 bg-slate-50 dark:bg-white/[0.03] rounded-none border border-app-border shadow-sm">
                                <div className="flex items-center gap-3 mb-3 text-emerald-500">
                                    <Zap size={20} />
                                    <span className="font-bold text-sm">Resolution Target</span>
                                </div>
                                <p className="text-xs text-slate-600 text-app-text-muted leading-relaxed">
                                    The maximum end-to-end time allowed to **resolve** or **close** a ticket. Includes all investigation and fix durations.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Priority Matrix */}
                    <div>
                        <label className="text-[10px] font-black text-app-text-muted uppercase tracking-widest block mb-4">SLA Priority Matrix</label>
                        <div className="space-y-3">
                            {priorities.map((p, idx) => (
                                <div key={idx} className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-white/[0.02] border border-app-border rounded-none hover:bg-white dark:hover:bg-white/[0.04] transition-colors group">
                                    <div className={`w-12 h-12 rounded-none flex items-center justify-center shrink-0 ${p.bg} ${p.border} border`}>
                                        <AlertCircle size={20} className={p.color} />
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className={`text-xs font-black uppercase tracking-widest ${p.color}`}>{p.label}</span>
                                        </div>
                                        <p className="text-[11px] text-app-text-muted leading-tight">{p.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Compliance Engine Logic */}
                    <div className="p-6 bg-slate-900 border border-white/10 rounded-[2rem] relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-8 text-white/5 group-hover:text-indigo-500/20 transition-colors duration-700">
                            <BarChart3 size={120} />
                        </div>
                        <div className="relative z-10">
                            <div className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-2">Algorithm Insights</div>
                            <h4 className="text-lg font-bold text-white mb-3">The Compliance Engine</h4>
                            <p className="text-xs text-slate-400 max-w-md leading-relaxed mb-6">
                                We calculate the **98.2% Average Compliance** by aggregating all active tickets and comparing their timestamps against the assigned policy targets. 
                                <br /><br />
                                If a ticket exceeds its **Response Time Limit** or **Resolution Time Limit**, it is flagged as a "Breach", lowering your overall operational score.
                            </p>
                            <div className="flex gap-4">
                                <div className="flex items-center gap-2 text-[10px] font-bold text-slate-300 bg-white/5 py-1.5 px-3 rounded-full border border-white/5">
                                    <CheckCircle size={12} className="text-emerald-500" /> Real-time Sync
                                </div>
                                <div className="flex items-center gap-2 text-[10px] font-bold text-slate-300 bg-white/5 py-1.5 px-3 rounded-full border border-white/5">
                                    <CheckCircle size={12} className="text-indigo-500" /> Historic Weighted
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Pro-Tip Section */}
                    <div className="flex items-start gap-4 p-5 bg-indigo-500/5 border border-indigo-500/20 rounded-none">
                        <HelpCircle className="text-indigo-500 shrink-0 mt-0.5" size={20} />
                        <div>
                            <div className="text-sm font-bold text-app-text mb-1">Provisioning Best Practices</div>
                            <p className="text-xs text-slate-600 text-app-text-muted leading-relaxed">
                                Always start with a "Global Default" policy to catch outliers. More granular policies (based on specific categories or assets) will automatically override the default when matching criteria are met.
                            </p>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}
