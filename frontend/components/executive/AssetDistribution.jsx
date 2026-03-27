import React, { memo } from 'react';
import { Shield } from 'lucide-react';

/**
 * Enterprise Asset Distribution Panel.
 * Visualizes the fleet topology using high-fidelity gradient bars.
 */
const AssetDistribution = ({ distribution, statusDistribution }) => {
    if (!distribution) return null;

    return (
        <div className="glass glass-hover p-10 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 blur-[100px] rounded-full -translate-y-1/2 translate-x-1/2 group-hover:bg-primary/10 transition-colors duration-1000" />
            
            <div className="flex items-center justify-between mb-10 relative z-10">
                <div>
                    <h4 className="text-xl font-['Outfit'] font-black flex items-center gap-3 text-app-text uppercase tracking-tighter">
                        <div className="p-2 rounded-xl bg-primary/10 text-primary border border-primary/20">
                            <Shield size={20} />
                        </div>
                        Fleet Inventory & Status
                    </h4>
                    <p className="text-[10px] text-app-text-muted font-black uppercase tracking-[0.3em] mt-2 opacity-60">Architectural Topology Spectrum</p>
                </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10 relative z-10">
                {/* Type Distribution */}
                <div className="space-y-6">
                    <p className="text-[9px] font-black uppercase tracking-[0.4em] text-app-text-muted opacity-40 mb-4">Segment Distribution</p>
                    {Object.entries(distribution).slice(0, 4).map(([type, count], i) => (
                        <div key={type} className="group/item cursor-default">
                            <div className="flex justify-between items-end text-[10px] mb-2 font-black uppercase tracking-widest text-app-text-muted group-hover/item:text-app-text transition-colors">
                                <span className="flex items-center gap-2">
                                    <div className="w-1 h-1 rounded-full bg-primary/60 group-hover/item:scale-150 transition-transform" />
                                    {type}
                                </span>
                                <span className="text-app-text font-black">{count}</span>
                            </div>
                            <div className="h-2 w-full bg-app-surface-soft rounded-full overflow-hidden border border-app-border/40">
                                <div 
                                    className="h-full bg-gradient-to-r from-primary to-indigo-500 rounded-full group-hover/item:brightness-125 transition-all duration-[1500ms] ease-out"
                                    style={{ 
                                        width: `${Math.max((count / 200) * 100, 5)}%`,
                                        transitionDelay: `${i * 150}ms`
                                    }}
                                />
                            </div>
                        </div>
                    ))}
                </div>

                {/* Status Distribution */}
                <div className="space-y-6">
                    <p className="text-[9px] font-black uppercase tracking-[0.4em] text-app-text-muted opacity-40 mb-4">Lifecycle Velocity</p>
                    {statusDistribution && Object.entries(statusDistribution).slice(0, 4).map(([status, count], i) => (
                        <div key={status} className="group/item cursor-default">
                            <div className="flex justify-between items-end text-[10px] mb-2 font-black uppercase tracking-widest text-app-text-muted group-hover/item:text-app-text transition-colors">
                                <span className="flex items-center gap-2 text-primary uppercase">{status}</span>
                                <span className="text-app-text font-black">{count}</span>
                            </div>
                            <div className="h-1.5 w-full bg-app-surface-soft rounded-full overflow-hidden">
                                <div 
                                    className="h-full bg-emerald-500/40 rounded-full transition-all duration-[2000ms] ease-out"
                                    style={{ 
                                        width: `${Math.max((count / 200) * 100, 5)}%`,
                                        transitionDelay: `${i * 200}ms`
                                    }}
                                />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default memo(AssetDistribution);
