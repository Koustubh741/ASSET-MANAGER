import React, { memo } from 'react';
import { BarChart, Users, TrendingUp } from 'lucide-react';

/**
 * Departmental Analytics Component for CEO.
 * Visualizes Spend and Risk profiles across organizational units.
 */
const DepartmentalOverview = ({ analytics }) => {
    if (!analytics || !analytics.spend) return null;

    const departments = Object.keys(analytics.spend);
    const maxSpend = Math.max(...Object.values(analytics.spend));
    const maxRisk = Math.max(...Object.values(analytics.risk || {}));

    return (
        <div className="glass glass-hover p-10 relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-primary to-emerald-500 opacity-30" />
            
            <div className="flex items-center justify-between mb-10">
                <div>
                    <h4 className="text-xl font-['Outfit'] font-black flex items-center gap-3 text-app-text uppercase tracking-tighter">
                        <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-500 border border-indigo-500/20">
                            <Users size={20} />
                        </div>
                        Organizational Audit
                    </h4>
                    <p className="text-[10px] text-app-text-muted font-black uppercase tracking-[0.3em] mt-2 opacity-60">Cross-Departmental Spend & Risk Matrix</p>
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-indigo-500" />
                        <span className="text-[8px] font-black uppercase text-app-text-muted">Spend</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-rose-500" />
                        <span className="text-[8px] font-black uppercase text-app-text-muted">Risk</span>
                    </div>
                </div>
            </div>
            
            <div className="space-y-8">
                {departments.map((dept, i) => {
                    const spend = analytics.spend[dept] || 0;
                    const risk = analytics.risk[dept] || 0;
                    const spendWidth = (spend / maxSpend) * 100;
                    const riskWidth = maxRisk > 0 ? (risk / maxRisk) * 100 : 0;

                    return (
                        <div key={dept} className="group/item relative">
                            <div className="flex justify-between items-end mb-3">
                                <span className="text-[10px] font-black text-app-text uppercase tracking-widest group-hover/item:text-indigo-500 transition-colors">
                                    {dept}
                                </span>
                                <div className="flex items-center gap-4">
                                    <span className="text-[10px] font-black text-app-text">${(spend/1000).toFixed(1)}k</span>
                                    {risk > 0 && (
                                        <span className="text-[10px] font-black text-rose-500 underline decoration-rose-500/30 underline-offset-4">{risk} Vulns</span>
                                    )}
                                </div>
                            </div>
                            
                            <div className="space-y-1.5">
                                {/* Spend Bar */}
                                <div className="h-1.5 w-full bg-app-surface-soft rounded-full overflow-hidden">
                                    <div 
                                        className="h-full bg-indigo-500 rounded-full transition-all duration-[2000ms] ease-out shadow-[0_0_10px_rgba(99,102,241,0.3)]"
                                        style={{ 
                                            width: `${Math.max(spendWidth, 2)}%`,
                                            transitionDelay: `${i * 100}ms`
                                        }}
                                    />
                                </div>
                                {/* Risk Bar */}
                                {risk > 0 && (
                                    <div className="h-1 w-full bg-app-surface-soft/50 rounded-full overflow-hidden">
                                        <div 
                                            className="h-full bg-rose-500/60 rounded-full transition-all duration-[2000ms] ease-out"
                                            style={{ 
                                                width: `${Math.max(riskWidth, 1)}%`,
                                                transitionDelay: `${i * 100 + 50}ms`
                                            }}
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
            
            <div className="mt-10 pt-8 border-t border-app-border/40 flex justify-between items-center bg-gradient-to-t from-app-surface-soft/30 to-transparent p-4 rounded-b-[2rem]">
                <div className="flex items-center gap-3">
                    <TrendingUp size={16} className="text-emerald-500" />
                    <span className="text-[10px] font-black text-app-text uppercase tracking-widest">Efficiency Offset</span>
                </div>
                <span className="text-[10px] font-black text-emerald-500 uppercase">+$12.4k Saved</span>
            </div>
        </div>
    );
};

export default memo(DepartmentalOverview);
