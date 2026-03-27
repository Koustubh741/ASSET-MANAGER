import React, { memo } from 'react';
import { AlertCircle, Clock, ShieldAlert, ChevronRight } from 'lucide-react';

/**
 * CrisisMonitor Component
 * High-fidelity Major Incident tracker for CEO HUD.
 */
const CrisisMonitor = ({ incidents }) => {
    const activeIncidents = incidents || [];

    return (
        <div className="glass p-8 relative overflow-hidden group h-full">
            <div className="absolute inset-0 opacity-[0.05] dark:opacity-[0.1] bg-grid-slate-200 dark:bg-grid-slate-800 [mask-image:linear-gradient(to_bottom,white,transparent)] pointer-events-none" />
            
            <div className="flex items-center justify-between mb-8 relative z-10">
                <div>
                    <h4 className="text-lg font-['Outfit'] font-black flex items-center gap-3 text-app-text uppercase tracking-tighter">
                        <div className={`p-2 rounded-xl ${activeIncidents.length > 0 ? 'bg-rose-500/20 text-rose-500 animate-pulse border-rose-500/30' : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'} border shadow-inner`}>
                            {activeIncidents.length > 0 ? <ShieldAlert size={20} /> : <AlertCircle size={20} />}
                        </div>
                        Crisis Command Control
                    </h4>
                    <p className="text-[9px] text-app-text-muted font-black uppercase tracking-[0.3em] mt-2 opacity-60">Active Major Incidents (P1/P2)</p>
                </div>
                {activeIncidents.length > 0 && (
                    <div className="px-3 py-1 bg-rose-500/10 border border-rose-500/20 rounded-lg text-rose-500 text-[10px] font-black uppercase tracking-widest">
                        {activeIncidents.length} Critical
                    </div>
                )}
            </div>

            <div className="space-y-4 relative z-10">
                {activeIncidents.length > 0 ? (
                    activeIncidents.map((incident, i) => (
                        <div key={incident.id} className="p-4 bg-app-surface-soft/40 border border-app-border/40 rounded-xl hover:border-rose-500/40 hover:bg-rose-500/5 transition-all group/item cursor-pointer">
                            <div className="flex justify-between items-start mb-2">
                                <span className="text-[10px] font-black text-rose-500 font-mono tracking-widest uppercase flex items-center gap-1.5">
                                    <div className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
                                    Priority: {incident.priority}
                                </span>
                                <span className="text-[10px] font-black text-app-text font-mono opacity-50">{incident.id}</span>
                            </div>
                            <h5 className="text-xs font-black text-app-text uppercase tracking-tight group-hover/item:text-rose-400 transition-colors line-clamp-1 mb-3">
                                {incident.subject}
                            </h5>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3 opacity-60">
                                    <div className="flex items-center gap-1.5">
                                        <Clock size={12} className="text-rose-500/70" />
                                        <span className="text-[9px] font-black uppercase text-app-text tracking-widest">{incident.age_hours}h Active</span>
                                    </div>
                                </div>
                                <div className="text-[9px] font-black uppercase text-rose-500 flex items-center gap-1 opacity-0 group-hover/item:opacity-100 transition-opacity">
                                    Strategic Response <ChevronRight size={12} />
                                </div>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="py-12 flex flex-col items-center justify-center text-center">
                        <div className="w-16 h-16 rounded-full bg-emerald-500/5 flex items-center justify-center border border-emerald-500/10 mb-4">
                            <ShieldAlert size={32} className="text-emerald-500/20" />
                        </div>
                        <h5 className="text-xs font-black text-app-text uppercase tracking-widest">Horizon Clear</h5>
                        <p className="text-[9px] text-app-text-muted mt-2 uppercase tracking-[0.2em] font-medium max-w-[200px] mx-auto opacity-50 italic">
                            No service-impacting major incidents detected in current cycle.
                        </p>
                    </div>
                )}
            </div>
            
            <div className="mt-8 pt-6 border-t border-app-border/40 flex justify-between items-center opacity-40">
                <span className="text-[9px] font-black uppercase tracking-widest">Tactical Health: 100%</span>
                <span className="text-[9px] font-black uppercase tracking-widest">Scan active</span>
            </div>
        </div>
    );
};

export default memo(CrisisMonitor);
