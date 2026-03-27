import React from 'react';
import { X, Info, ShieldCheck, Server, Laptop, HelpCircle, Network, Smartphone, AppWindow, HardDrive, Monitor, Cloud, Cpu } from 'lucide-react';

export default function SmartIdGuideModal({ isOpen, onClose }) {
    if (!isOpen) return null;

    const assetMappings = [
        { letter: 'S', label: 'Server', icon: Server, color: 'text-rose-500' },
        { letter: 'L', label: 'Laptop', icon: Laptop, color: 'text-blue-500' },
        { letter: 'D', label: 'Desktop', icon: Monitor, color: 'text-indigo-500' },
        { letter: 'N', label: 'Network', icon: Network, color: 'text-emerald-500' },
        { letter: 'M', label: 'Mobile', icon: Smartphone, color: 'text-amber-500' },
        { letter: 'A', label: 'Software', icon: AppWindow, color: 'text-purple-500' },
        { letter: 'T', label: 'Storage', icon: HardDrive, color: 'text-cyan-500' },
        { letter: 'P', label: 'Peripheral', icon: Monitor, color: 'text-pink-500' },
        { letter: 'V', label: 'Virtual/VM', icon: Cloud, color: 'text-sky-500' },
        { letter: 'H', label: 'Hardware', icon: Cpu, color: 'text-orange-500' },
        { letter: 'O', label: 'Other', icon: HelpCircle, color: 'text-app-text-muted' }
    ];

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-50 dark:bg-slate-950/60 backdrop-blur-xl animate-in fade-in duration-300">
            <div className="glass-panel w-full max-w-2xl max-h-[90vh] flex flex-col border border-slate-300 border-app-border shadow-2xl rounded-3xl overflow-hidden bg-white dark:bg-slate-900">

                <div className="p-6 md:p-8 border-b border-app-border bg-slate-50 dark:bg-white/[0.02] flex justify-between items-center shrink-0">
                    <div>
                        <h3 className="text-2xl font-['Outfit'] font-bold text-app-text tracking-tight flex items-center gap-3">
                            <Info size={24} className="text-indigo-500" />
                            Smart ID Legend
                        </h3>
                        <p className="text-[10px] text-app-text-muted font-black uppercase tracking-[0.2em] mt-1">
                            Identifier Anatomy Guide
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-3 bg-slate-200 dark:bg-white/[0.03] hover:bg-slate-300 dark:hover:bg-white/[0.08] text-app-text-muted hover:text-slate-900 dark:hover:text-app-text rounded-2xl border border-slate-300 border-app-border transition-all"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 md:p-8 overflow-y-auto custom-scrollbar flex-1 space-y-8 bg-white dark:bg-slate-900">

                    {/* Structure Section */}
                    <div>
                        <label className="text-[10px] font-black text-app-text-muted uppercase tracking-widest block mb-4">Anatomy of a Smart ID</label>
                        <div className="p-4 md:p-6 bg-slate-50 dark:bg-white/[0.03] rounded-3xl border border-app-border shadow-sm dark:shadow-inner text-center">
                            <div className="text-xl md:text-2xl font-mono font-bold text-slate-800 dark:text-slate-200 tracking-widest flex items-center justify-center gap-2 flex-wrap">
                                <span className="px-3 py-1 bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 rounded-xl" title="Department">HR</span>
                                <span className="text-app-text-muted">-</span>
                                <span className="px-3 py-1 bg-rose-100 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 rounded-xl" title="Asset & Priority">L1</span>
                                <span className="text-app-text-muted">-</span>
                                <span className="px-3 py-1 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-xl" title="Date (YYMMDD)">260309</span>
                                <span className="text-app-text-muted">-</span>
                                <span className="px-3 py-1 bg-app-surface text-app-text-muted rounded-xl" title="UUID Snippet">8F3A</span>
                            </div>

                            <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4 text-left">
                                <div>
                                    <div className="text-xs font-bold text-indigo-600 dark:text-indigo-400 mb-1">1. Dept</div>
                                    <div className="text-[10px] text-app-text-muted">First 3 letters of Requester's Dept (or GEN).</div>
                                </div>
                                <div>
                                    <div className="text-xs font-bold text-rose-600 dark:text-rose-400 mb-1">2. Target</div>
                                    <div className="text-[10px] text-app-text-muted">Asset Letter + Priority Num (1=Hi, 2=Med, 3=Lo).</div>
                                </div>
                                <div>
                                    <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400 mb-1">3. Date</div>
                                    <div className="text-[10px] text-app-text-muted">Created At (YYMMDD).</div>
                                </div>
                                <div>
                                    <div className="text-xs font-bold text-app-text-muted mb-1">4. UUID</div>
                                    <div className="text-[10px] text-app-text-muted">First 4 letters of Unique Identifier.</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Mapping Matrix Section */}
                    <div>
                        <label className="text-[10px] font-black text-app-text-muted uppercase tracking-widest block mb-4">Asset Letter Matrix</label>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                            {assetMappings.map((asset, idx) => {
                                const Icon = asset.icon;
                                return (
                                    <div key={idx} className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-white/[0.02] border border-app-border rounded-2xl">
                                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center bg-white dark:bg-slate-800 shadow-sm border border-slate-100 border-app-border ${asset.color}`}>
                                            <span className="font-black font-mono">{asset.letter}</span>
                                        </div>
                                        <div>
                                            <div className="text-xs font-bold text-app-text-muted">{asset.label}</div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Neural Classification Legend */}
                    <div>
                        <label className="text-[10px] font-black text-app-text-muted uppercase tracking-widest block mb-4">Neural Classification Tags</label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="p-4 bg-slate-50 dark:bg-white/[0.03] rounded-2xl border border-app-border flex items-center justify-between">
                                <div className="text-xs font-bold text-app-text-muted">Hardware & Assets</div>
                                <div className="text-[10px] font-black text-app-text-muted bg-slate-100 bg-app-surface px-2 py-1 rounded-md border border-app-border italic">HWD-AX7</div>
                            </div>
                            <div className="p-4 bg-slate-50 dark:bg-white/[0.03] rounded-2xl border border-app-border flex items-center justify-between">
                                <div className="text-xs font-bold text-app-text-muted">Network & Connection</div>
                                <div className="text-[10px] font-black text-app-text-muted bg-slate-100 bg-app-surface px-2 py-1 rounded-md border border-app-border italic">NET-AX7</div>
                            </div>
                            <div className="p-4 bg-slate-50 dark:bg-white/[0.03] rounded-2xl border border-app-border flex items-center justify-between">
                                <div className="text-xs font-bold text-app-text-muted">Software & Applications</div>
                                <div className="text-[10px] font-black text-app-text-muted bg-slate-100 bg-app-surface px-2 py-1 rounded-md border border-app-border italic">SFT-AX7</div>
                            </div>
                            <div className="p-4 bg-slate-50 dark:bg-white/[0.03] rounded-2xl border border-app-border flex items-center justify-between">
                                <div className="text-xs font-bold text-app-text-muted">Security & Access</div>
                                <div className="text-[10px] font-black text-app-text-muted bg-slate-100 bg-app-surface px-2 py-1 rounded-md border border-app-border italic">SEC-AX7</div>
                            </div>
                            <div className="p-4 bg-slate-50 dark:bg-white/[0.03] rounded-2xl border border-app-border flex items-center justify-between md:col-span-2">
                                <div className="text-xs font-bold text-app-text-muted">General Operations</div>
                                <div className="text-[10px] font-black text-app-text-muted bg-slate-100 bg-app-surface px-2 py-1 rounded-md border border-app-border italic">OPS-AX7</div>
                            </div>
                        </div>
                    </div>

                    {/* Examples Section */}
                    <div>
                        <label className="text-[10px] font-black text-app-text-muted uppercase tracking-widest block mb-4">Live Scenarios</label>
                        <div className="space-y-3">
                            <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-white/[0.02] border border-app-border rounded-2xl">
                                <div>
                                    <div className="text-sm font-bold text-slate-700 dark:text-slate-200">Server Crash • IT Dept • High Prio</div>
                                    <div className="text-xs text-app-text-muted">Created: March 9, 2026</div>
                                </div>
                                <div className="font-mono font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 px-3 py-1.5 rounded-xl border border-indigo-200 dark:border-indigo-500/20">IT-S1-260309-A1B2</div>
                            </div>

                            <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-white/[0.02] border border-app-border rounded-2xl">
                                <div>
                                    <div className="text-sm font-bold text-slate-700 dark:text-slate-200">Laptop Slow • HR Dept • Med Prio</div>
                                    <div className="text-xs text-app-text-muted">Created: Feb 14, 2026</div>
                                </div>
                                <div className="font-mono font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 px-3 py-1.5 rounded-xl border border-blue-200 dark:border-blue-500/20">HUM-L2-260214-C3D4</div>
                            </div>

                            <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-white/[0.02] border border-app-border rounded-2xl">
                                <div>
                                    <div className="text-sm font-bold text-slate-700 dark:text-slate-200">Network Down • Finance • Low Prio</div>
                                    <div className="text-xs text-app-text-muted">Created: March 1, 2026</div>
                                </div>
                                <div className="font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-200 dark:border-emerald-500/20">FIN-N3-260301-E5F6</div>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}
