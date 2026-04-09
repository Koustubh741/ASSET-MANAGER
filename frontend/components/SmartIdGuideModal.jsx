import React from 'react';
import { X, Info, ShieldCheck, Server, Laptop, HelpCircle, Network, Smartphone, AppWindow, HardDrive, Monitor, Cloud, Cpu } from 'lucide-react';

export default function SmartIdGuideModal({ isOpen, onClose }) {
    if (!isOpen) return null;

    const assetMappings = [
        { letter: 'S', label: 'Server', icon: Server, color: 'text-app-rose' },
        { letter: 'L', label: 'Laptop', icon: Laptop, color: 'text-app-primary' },
        { letter: 'D', label: 'Desktop', icon: Monitor, color: 'text-app-primary' },
        { letter: 'N', label: 'Network', icon: Network, color: 'text-app-secondary' },
        { letter: 'M', label: 'Mobile', icon: Smartphone, color: 'text-app-gold' },
        { letter: 'A', label: 'Software', icon: AppWindow, color: 'text-app-primary' },
        { letter: 'T', label: 'Storage', icon: HardDrive, color: 'text-app-secondary' },
        { letter: 'P', label: 'Peripheral', icon: Monitor, color: 'text-app-rose' },
        { letter: 'V', label: 'Virtual/VM', icon: Cloud, color: 'text-app-primary' },
        { letter: 'H', label: 'Hardware', icon: Cpu, color: 'text-app-gold' },
        { letter: 'O', label: 'Other', icon: HelpCircle, color: 'text-app-text-muted' }
    ];

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-app-void/90 backdrop-blur-3xl animate-in fade-in duration-500">
            <div className="glass-panel w-full max-w-2xl max-h-[90vh] flex flex-col border border-app-border shadow-[0_0_100px_rgba(0,0,0,0.8)] rounded-none overflow-hidden bg-app-obsidian relative">
                <div className="kinetic-scan-line" />

                <div className="p-8 border-b border-app-border bg-app-void flex justify-between items-center shrink-0">
                    <div>
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-app-primary flex items-center justify-center text-app-void">
                                <Info size={24} />
                            </div>
                            <div>
                                <h3 className="text-2xl font-black text-app-text tracking-tighter uppercase italic">Smart ID Legend</h3>
                                <p className="text-[10px] text-app-text-muted font-black uppercase tracking-[0.4em] mt-1 opacity-40">Identifier Anatomy Protocol v2.1</p>
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-3 bg-app-void hover:bg-app-rose hover:text-app-void text-app-text-muted rounded-none border border-app-border transition-all shadow-xl active:scale-95"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="p-8 overflow-y-auto custom-scrollbar flex-1 space-y-12 bg-app-obsidian">

                    {/* Structure Section */}
                    <div>
                        <label className="text-[10px] font-black text-app-primary uppercase tracking-[0.3em] block mb-6 border-l-2 border-app-primary pl-3">Identifier Architecture</label>
                        <div className="p-8 bg-app-void rounded-none border border-app-border relative overflow-hidden group/anatomy">
                            <div className="absolute top-0 right-0 p-4 font-mono text-xs opacity-5">ANATOMY_SCAN_ACTIVE</div>
                            <div className="text-2xl md:text-3xl font-mono font-black tracking-widest flex items-center justify-center gap-4 flex-wrap">
                                <span className="px-5 py-2 bg-app-primary/10 text-app-primary border border-app-primary/20 rounded-none shadow-lg shadow-app-primary/5" title="Department">OPS</span>
                                <span className="text-app-text-muted opacity-20">-</span>
                                <span className="px-5 py-2 bg-app-rose/10 text-app-rose border border-app-rose/20 rounded-none shadow-lg shadow-app-rose/5" title="Asset & Priority">L1</span>
                                <span className="text-app-text-muted opacity-20">-</span>
                                <span className="px-5 py-2 bg-app-secondary/10 text-app-secondary border border-app-secondary/20 rounded-none shadow-lg shadow-app-secondary/5" title="Date (YYMMDD)">260331</span>
                                <span className="text-app-text-muted opacity-20">-</span>
                                <span className="px-5 py-2 bg-app-obsidian text-app-text-muted border border-app-border rounded-none" title="UUID Snippet">7F2D</span>
                            </div>

                            <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-8 text-left border-t border-app-border pt-8">
                                <div>
                                    <div className="text-[10px] font-black text-app-primary mb-2 uppercase tracking-widest">01. DOMAIN_SECTOR</div>
                                    <div className="text-[9px] text-app-text-muted uppercase leading-relaxed font-bold tracking-tight">Origin department vector (e.g., OPS, FIN, GEN).</div>
                                </div>
                                <div>
                                    <div className="text-[10px] font-black text-app-rose mb-2 uppercase tracking-widest">02. TARGET_PRIO</div>
                                    <div className="text-[9px] text-app-text-muted uppercase leading-relaxed font-bold tracking-tight">Asset Type prefix + Criticality Index (1-3).</div>
                                </div>
                                <div>
                                    <div className="text-[10px] font-black text-app-secondary mb-2 uppercase tracking-widest">03. TEMPORAL_STAMP</div>
                                    <div className="text-[9px] text-app-text-muted uppercase leading-relaxed font-bold tracking-tight">Canonical system timestamp (YYMMDD).</div>
                                </div>
                                <div>
                                    <div className="text-[10px] font-black text-app-text-muted mb-2 uppercase tracking-widest opacity-40">04. NEURAL_HASH</div>
                                    <div className="text-[9px] text-app-text-muted uppercase leading-relaxed font-bold tracking-tight opacity-40">High-entropy unique collision residue.</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Mapping Matrix Section */}
                    <div>
                        <label className="text-[10px] font-black text-app-secondary uppercase tracking-[0.3em] block mb-6 border-l-2 border-app-secondary pl-3">Asset Classification Matrix</label>
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                            {assetMappings.map((asset, idx) => {
                                const Icon = asset.icon;
                                return (
                                    <div key={idx} className="flex items-center gap-4 p-4 bg-app-void border border-app-border rounded-none hover:bg-white/[0.03] transition-all group/cell">
                                        <div className={`w-10 h-10 rounded-none flex items-center justify-center bg-app-obsidian border border-app-border ${asset.color} group-hover/cell:scale-110 transition-transform`}>
                                            <span className="font-black font-mono text-xl">{asset.letter}</span>
                                        </div>
                                        <div>
                                            <div className="text-[10px] font-black text-app-text uppercase tracking-widest">{asset.label}</div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Neural Classification Legend */}
                    <div>
                        <label className="text-[10px] font-black text-app-primary uppercase tracking-[0.3em] block mb-6 border-l-2 border-app-primary pl-3">Neural Tactical Tags</label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="p-5 bg-app-void rounded-none border border-app-border flex items-center justify-between group/tag">
                                <div className="text-[10px] font-black text-app-text-muted uppercase tracking-widest">Hardware_Core</div>
                                <div className="text-[10px] font-black text-app-primary bg-app-primary/10 px-3 py-1 rounded-none border border-app-primary/20 italic group-hover/tag:bg-app-primary group-hover/tag:text-app-void transition-all">HWD-AX7</div>
                            </div>
                            <div className="p-5 bg-app-void rounded-none border border-app-border flex items-center justify-between group/tag">
                                <div className="text-[10px] font-black text-app-text-muted uppercase tracking-widest">Neural_Nexus</div>
                                <div className="text-[10px] font-black text-app-secondary bg-app-secondary/10 px-3 py-1 rounded-none border border-app-secondary/20 italic group-hover/tag:bg-app-secondary group-hover/tag:text-app-void transition-all">NET-AX7</div>
                            </div>
                            <div className="p-5 bg-app-void rounded-none border border-app-border flex items-center justify-between group/tag">
                                <div className="text-[10px] font-black text-app-text-muted uppercase tracking-widest">Logic_Array</div>
                                <div className="text-[10px] font-black text-app-primary bg-app-primary/10 px-3 py-1 rounded-none border border-app-primary/20 italic group-hover/tag:bg-app-primary group-hover/tag:text-app-void transition-all">SFT-AX7</div>
                            </div>
                            <div className="p-5 bg-app-void rounded-none border border-app-border flex items-center justify-between group/tag">
                                <div className="text-[10px] font-black text-app-text-muted uppercase tracking-widest">Security_Veil</div>
                                <div className="text-[10px] font-black text-app-rose bg-app-rose/10 px-3 py-1 rounded-none border border-app-rose/20 italic group-hover/tag:bg-app-rose group-hover/tag:text-app-void transition-all">SEC-AX7</div>
                            </div>
                        </div>
                    </div>

                    {/* Examples Section */}
                    <div>
                        <label className="text-[10px] font-black text-app-gold uppercase tracking-[0.3em] block mb-6 border-l-2 border-app-gold pl-3">Operational Scenarios</label>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-5 bg-app-void border border-app-border rounded-none relative overflow-hidden group/scenario">
                                <div className="absolute top-0 left-0 w-1 h-full bg-app-primary opacity-20" />
                                <div>
                                    <div className="text-xs font-black text-app-text uppercase tracking-tight italic">Server Detonation • IT_SECTION • High_Prio</div>
                                    <div className="text-[10px] text-app-text-muted font-bold opacity-30 uppercase mt-1">LOGGED: 2026_03_31_1100Z</div>
                                </div>
                                <div className="font-mono font-black text-app-primary bg-app-primary/5 px-4 py-2 rounded-none border border-app-primary/20 shadow-lg shadow-app-primary/10">IT-S1-260331-7F2D</div>
                            </div>

                            <div className="flex items-center justify-between p-5 bg-app-void border border-app-border rounded-none relative overflow-hidden group/scenario">
                                <div className="absolute top-0 left-0 w-1 h-full bg-app-secondary opacity-20" />
                                <div>
                                    <div className="text-xs font-black text-app-text uppercase tracking-tight italic">Terminal Latency • HR_DPT • Med_Prio</div>
                                    <div className="text-[10px] text-app-text-muted font-bold opacity-30 uppercase mt-1">LOGGED: 2026_02_14_0900Z</div>
                                </div>
                                <div className="font-mono font-black text-app-primary bg-app-primary/5 px-4 py-2 rounded-none border border-app-primary/20 shadow-lg shadow-app-primary/10">HUM-L2-260214-C3D4</div>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}
