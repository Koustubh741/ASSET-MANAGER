import React, { memo } from 'react';
import { BarChart3, Users, ExternalLink } from 'lucide-react';

/**
 * DepartmentalTicketLoad Component
 * Visualizes support load distribution across organizational units.
 */
const DepartmentalTicketLoad = ({ load }) => {
    if (!load) return null;

    const data = Object.entries(load)
        .map(([dept, count]) => ({ dept, count }))
        .sort((a, b) => b.count - a.count);

    const maxCount = Math.max(...data.map(d => d.count), 1);

    return (
        <div className="bg-app-void p-10 relative overflow-hidden group border border-app-border">
            <div className="kinetic-scan-line" />
            <div className="absolute top-0 right-0 w-40 h-40 bg-app-primary/5 blur-3xl rounded-none -mr-20 -mt-20 group-hover:bg-app-primary/10 transition-colors pointer-events-none" />
            
            <div className="flex items-center justify-between mb-12">
                <div>
                    <h4 className="text-2xl font-black flex items-center gap-4 text-app-text uppercase tracking-tighter italic">
                        <div className="p-3 rounded-none bg-app-primary/10 text-app-primary border border-app-primary/30 shadow-[0_0_15px_rgba(var(--color-app-primary-rgb),0.2)]">
                            <BarChart3 size={24} />
                        </div>
                        <span className="text-app-primary">Sector</span> Friction
                    </h4>
                    <p className="text-[9px] text-app-text-muted font-black uppercase tracking-[0.4em] mt-3 opacity-40 italic">Resource Allocation Impact // Neural Load</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                    <span className="text-3xl font-black text-app-text italic leading-none">{data.reduce((acc, d) => acc + d.count, 0)}</span>
                    <span className="text-[9px] font-black text-app-text-muted uppercase tracking-widest opacity-30">Total_Packets</span>
                </div>
            </div>

            <div className="space-y-8">
                {data.map((item, i) => {
                    const width = (item.count / maxCount) * 100;
                    return (
                        <div key={item.dept} className="group/item relative">
                            <div className="flex justify-between items-center mb-3">
                                <div className="flex items-center gap-4">
                                    <div className="w-2 h-2 rounded-none bg-app-primary/40 group-hover/item:bg-app-primary group-hover/item:scale-125 transition-all shadow-[0_0_10px_rgba(var(--color-app-primary-rgb),0.3)]" />
                                    <span className="text-[11px] font-black text-app-text-muted uppercase tracking-[0.2em] group-hover/item:text-app-primary transition-colors italic">
                                        {item.dept}
                                    </span>
                                </div>
                                <span className="text-[10px] font-black text-app-primary group-hover/item:text-app-text transition-colors tabular-nums">
                                    {item.count} PKTS
                                </span>
                            </div>
                            
                            <div className="h-2 w-full bg-app-surface-soft rounded-none overflow-hidden border border-app-border p-0.5">
                                <div 
                                    className="h-full bg-app-primary rounded-none transition-all duration-[1500ms] ease-out shadow-[0_0_15px_rgba(var(--color-app-primary-rgb),0.4)] relative"
                                    style={{ 
                                        width: `${Math.max(width, 2)}%`,
                                        transitionDelay: `${i * 100}ms`
                                    }}
                                >
                                    <div className="absolute top-0 right-0 w-1.5 h-full bg-white opacity-40 shadow-[0_0_10px_white]" />
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            <button className="w-full mt-12 py-5 rounded-none border border-app-border bg-app-void text-[10px] font-black uppercase tracking-[0.3em] text-app-text-muted hover:text-app-primary hover:border-app-primary/50 flex items-center justify-center gap-3 transition-all active:scale-95 group/btn relative overflow-hidden">
                <div className="absolute inset-0 bg-app-primary opacity-0 group-hover/btn:opacity-5 transition-opacity" />
                <Users size={16} className="group-hover/btn:rotate-12 transition-transform" />
                Audit Organizational Health
                <ExternalLink size={14} className="opacity-40 group-hover/btn:opacity-100 transition-opacity" />
            </button>
        </div>
    );
};

export default memo(DepartmentalTicketLoad);
