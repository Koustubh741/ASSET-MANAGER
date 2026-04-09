import React, { memo } from 'react';
import { AlertCircle, Clock, ShieldAlert, ChevronRight } from 'lucide-react';

/**
 * CrisisMonitor Component
 * High-fidelity Major Incident tracker for CEO HUD.
 */
const CrisisMonitor = ({ incidents }) => {
    const activeIncidents = incidents || [];

    return (
        <div className="bg-app-void p-10 relative overflow-hidden group h-full border border-app-border">
            <div className="kinetic-scan-line" />
            <div className="absolute inset-0 opacity-[0.08] bg-[radial-gradient(var(--color-app-primary)_1px,transparent_1px)] [background-size:20px_20px] [mask-image:linear-gradient(to_bottom,white,transparent)] pointer-events-none" />
            
            <div className="flex items-center justify-between mb-10 relative z-10">
                <div>
                    <h4 className="text-xl font-bold flex items-center gap-4 text-app-text uppercase tracking-tight">
                        <div className={`p-3 rounded-none border transition-all duration-500 shadow-lg ${activeIncidents.length > 0 ? 'text-app-rose border-app-rose/40 animate-pulse bg-app-rose/5' : 'text-app-secondary border-app-secondary/20 bg-app-secondary/5'}`}>
                            {activeIncidents.length > 0 ? <ShieldAlert size={24} /> : <AlertCircle size={24} />}
                        </div>
                        <span className={activeIncidents.length > 0 ? 'text-app-rose' : 'text-app-secondary'}>Crisis</span> Command
                    </h4>
                    <p className="text-[9px] text-app-text-muted font-semibold uppercase tracking-widest mt-3">Active Major Incidents // Sector_P1_P2</p>
                </div>
                {activeIncidents.length > 0 && (
                    <div className="px-4 py-1.5 bg-app-rose/10 border border-app-rose/30 rounded-none text-app-rose text-[10px] font-black uppercase tracking-[0.2em] shadow-[0_0_15px_rgba(var(--color-app-rose-rgb),0.2)]">
                        {activeIncidents.length} Critical_Events
                    </div>
                )}
            </div>

            <div className="space-y-4 relative z-10">
                {activeIncidents.length > 0 ? (
                    activeIncidents.map((incident, i) => (
                        <div key={incident.id} className="p-5 bg-app-void border border-app-border rounded-none hover:border-app-rose/50 hover:bg-app-rose/5 transition-all group/item cursor-pointer relative overflow-hidden">
                            <div className="flex justify-between items-start mb-3">
                                <span className="text-[10px] font-black text-app-rose font-mono tracking-[0.2em] uppercase flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-none bg-app-rose animate-ping" />
                                    Priority::{incident.priority}
                                </span>
                                <span className="text-[10px] font-semibold text-app-text-muted font-mono">{incident.id}</span>
                            </div>
                            <h5 className="text-sm font-bold text-app-text uppercase tracking-tight group-hover/item:text-app-rose transition-colors line-clamp-1 mb-4">
                                {incident.subject}
                            </h5>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4 opacity-50">
                                    <div className="flex items-center gap-2">
                                        <Clock size={14} className="text-app-rose/70" />
                                        <span className="text-[10px] font-black uppercase text-app-text tracking-widest tabular-nums">{incident.age_hours}h_Active</span>
                                    </div>
                                </div>
                                <div className="text-[10px] font-black uppercase text-app-rose flex items-center gap-2 opacity-0 group-hover/item:opacity-100 transition-all translate-x-2 group-hover/item:translate-x-0">
                                    Strategic_Response <ChevronRight size={14} />
                                </div>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="py-16 flex flex-col items-center justify-center text-center">
                        <div className="w-20 h-20 rounded-none bg-app-void flex items-center justify-center border border-app-secondary/20 mb-6 shadow-xl relative overflow-hidden">
                             <div className="absolute inset-0 bg-app-secondary opacity-5 animate-pulse" />
                            <ShieldAlert size={36} className="text-app-secondary/30" />
                        </div>
                        <h5 className="text-sm font-bold text-app-text uppercase tracking-widest">Horizon_Baseline_Clear</h5>
                        <p className="text-[10px] text-app-text-muted mt-3 uppercase tracking-wider font-semibold max-w-[240px] mx-auto leading-relaxed">
                            No service-impacting critical anomalies detected in current tactical cycle.
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
