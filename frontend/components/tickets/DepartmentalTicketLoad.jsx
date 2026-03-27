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
        <div className="glass glass-hover p-10 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-3xl rounded-full -mr-16 -mt-16 group-hover:bg-primary/10 transition-colors" />
            
            <div className="flex items-center justify-between mb-10">
                <div>
                    <h4 className="text-xl font-['Outfit'] font-black flex items-center gap-3 text-app-text uppercase tracking-tighter">
                        <div className="p-2 rounded-xl bg-primary/10 text-primary border border-primary/20">
                            <BarChart3 size={20} />
                        </div>
                        Departmental Friction
                    </h4>
                    <p className="text-[10px] text-app-text-muted font-black uppercase tracking-[0.3em] mt-2 opacity-60">Strategic Resource Allocation Impact</p>
                </div>
                <div className="flex flex-col items-end">
                    <span className="text-2xl font-black text-app-text">{data.reduce((acc, d) => acc + d.count, 0)}</span>
                    <span className="text-[8px] font-black text-app-text-muted uppercase tracking-widest opacity-60">Total Incidents</span>
                </div>
            </div>

            <div className="space-y-6">
                {data.map((item, i) => {
                    const width = (item.count / maxCount) * 100;
                    return (
                        <div key={item.dept} className="group/item relative">
                            <div className="flex justify-between items-center mb-2">
                                <div className="flex items-center gap-3">
                                    <div className="w-1.5 h-1.5 rounded-full bg-primary/40 group-hover/item:bg-primary group-hover/item:scale-125 transition-all" />
                                    <span className="text-[10px] font-black text-app-text uppercase tracking-widest group-hover/item:text-primary transition-colors">
                                        {item.dept}
                                    </span>
                                </div>
                                <span className="text-[10px] font-black text-app-text-muted group-hover/item:text-app-text transition-colors">
                                    {item.count} Tickets
                                </span>
                            </div>
                            
                            <div className="h-1.5 w-full bg-app-surface-soft rounded-full overflow-hidden border border-app-border/10">
                                <div 
                                    className="h-full bg-gradient-to-r from-primary/60 to-primary rounded-full transition-all duration-[1500ms] ease-out shadow-[0_0_8px_rgba(var(--primary-rgb),0.2)]"
                                    style={{ 
                                        width: `${Math.max(width, 2)}%`,
                                        transitionDelay: `${i * 100}ms`
                                    }}
                                />
                            </div>
                        </div>
                    );
                })}
            </div>

            <button className="w-full mt-10 py-4 rounded-xl border border-app-border/40 text-[10px] font-black uppercase tracking-[0.2em] text-app-text-muted hover:text-primary hover:border-primary/30 flex items-center justify-center gap-2 transition-all bg-app-surface/20 group/btn">
                <Users size={14} className="group-hover/btn:translate-x-1 transition-transform" />
                Audit Departmental Health
                <ExternalLink size={12} className="opacity-0 group-hover/btn:opacity-100 transition-opacity" />
            </button>
        </div>
    );
};

export default memo(DepartmentalTicketLoad);
