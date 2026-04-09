import React from 'react';
import { X, Info, Clock, Zap, CheckCircle, BarChart3, AlertCircle, HelpCircle, ShieldCheck, RefreshCcw, ShoppingCart, Trash2 } from 'lucide-react';

export default function WorkflowGuideModal({ isOpen, onClose }) {
    if (!isOpen) return null;

    const stages = [
        { 
            label: 'Asset Renewals', 
            icon: <RefreshCcw size={20} className="text-indigo-500" />, 
            color: 'text-indigo-500', 
            bg: 'bg-indigo-500/10', 
            border: 'border-indigo-500/20', 
            desc: 'How it lands here:',
            logic: 'Assets automatically enter this stage when their warranty_expiry, contract_expiry, or license_expiry is within the next 90 days.' 
        },
        { 
            label: 'Procurement Gate', 
            icon: <ShoppingCart size={20} className="text-amber-500" />, 
            color: 'text-amber-500', 
            bg: 'bg-amber-500/10', 
            border: 'border-amber-500/20', 
            desc: 'How it lands here:',
            logic: 'Triggered when a Purchase Order (PO) PDF is uploaded. The extraction engine populates vendor and cost data for your final validation.' 
        },
        { 
            label: 'Asset Disposal', 
            icon: <Trash2 size={20} className="text-rose-500" />, 
            color: 'text-rose-500', 
            bg: 'bg-rose-500/10', 
            border: 'border-rose-500/20', 
            desc: 'How it lands here:',
            logic: 'Assets appear here when their status is set to "Retired" or "Disposed", ensuring a final audit of data wiping and physical recycling.' 
        }
    ];

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-50/10 dark:bg-slate-950/40 backdrop-blur-md animate-in fade-in duration-300">
            <div className="glass-panel w-full max-w-2xl max-h-[85vh] flex flex-col border border-slate-300 border-app-border shadow-2xl rounded-[2.5rem] overflow-hidden bg-white dark:bg-slate-900 font-['Outfit']">

                <div className="p-6 md:p-8 border-b border-app-border bg-slate-50 dark:bg-white/[0.02] flex justify-between items-center shrink-0">
                    <div>
                        <h3 className="text-2xl font-bold text-app-text tracking-tight flex items-center gap-3">
                            <Info size={24} className="text-indigo-500" />
                            Workflow Engine Guide
                        </h3>
                        <p className="text-[10px] text-app-text-muted font-black uppercase tracking-[0.2em] mt-1">
                            Asset Lifecycle Approval Logic
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

                    {/* Entry Points Section */}
                    <div>
                        <label className="text-[10px] font-black text-app-text-muted uppercase tracking-widest block mb-4">Lifecycle Entry Points</label>
                        <div className="space-y-4">
                            {stages.map((s, idx) => (
                                <div key={idx} className="p-6 bg-slate-50 dark:bg-white/[0.03] rounded-none border border-app-border shadow-sm group hover:border-indigo-500/30 transition-all">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className={`w-10 h-10 rounded-none flex items-center justify-center ${s.bg} ${s.border} border`}>
                                            {s.icon}
                                        </div>
                                        <span className="font-bold text-lg text-app-text">{s.label}</span>
                                    </div>
                                    <div className="space-y-2">
                                        <div className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">{s.desc}</div>
                                        <p className="text-xs text-slate-600 text-app-text-muted leading-relaxed">
                                            {s.logic}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Approval Gate Logic */}
                    <div>
                        <label className="text-[10px] font-black text-app-text-muted uppercase tracking-widest block mb-4">The Approval Gate</label>
                        <div className="p-6 bg-slate-900 border border-white/10 rounded-[2rem] relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-8 text-white/5 group-hover:text-indigo-500/20 transition-colors duration-700">
                                <ShieldCheck size={120} />
                            </div>
                            <div className="relative z-10 text-white">
                                <h4 className="text-lg font-bold mb-3">Immutable Auditability</h4>
                                <p className="text-xs text-slate-400 max-w-md leading-relaxed mb-6">
                                    Every action taken in this engine is recorded in the **Global Audit Log**. This includes the identity of the approver, the timestamp, and any optional notes provided during the gate review.
                                </p>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="flex items-center gap-2 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 py-1.5 px-3 rounded-full border border-emerald-500/20">
                                        <CheckCircle size={12} /> APPROVE: Sets state to ACTIVE
                                    </div>
                                    <div className="flex items-center gap-2 text-[10px] font-bold text-rose-400 bg-rose-500/10 py-1.5 px-3 rounded-full border border-rose-500/20">
                                        <AlertCircle size={12} /> REJECT: Marks for DISPOSAL
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Pro-Tip Section */}
                    <div className="flex items-start gap-4 p-5 bg-indigo-500/5 border border-indigo-500/20 rounded-none">
                        <HelpCircle className="text-indigo-500 shrink-0 mt-0.5" size={20} />
                        <div>
                            <div className="text-sm font-bold text-app-text mb-1">Administrative Tip</div>
                            <p className="text-xs text-slate-600 text-app-text-muted leading-relaxed">
                                Use the **Renewals** tab to identify high-cost hardware cycles before they happen. Regular audits of the **Disposal** tab ensure your environmental and data-security compliance targets are being met.
                            </p>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}
