import React, { memo } from 'react';
import { Activity, Users, ExternalLink, Wifi, BarChart3 } from 'lucide-react';
import { ZenithCard, ZenithButton, ZenithBadge } from '../common/ZenithUI';

/**
 * DepartmentalTicketLoad Component - Refactored into 'Interactive Org-Sync Map'
 * Visualizes support load distribution across the 16 organizational units with Zenith fidelity.
 */
const DepartmentalTicketLoad = ({ load }) => {
    if (!load) return null;

    const data = Object.entries(load)
        .map(([dept, count]) => ({ dept, count }))
        .sort((a, b) => b.count - a.count);

    const maxCount = Math.max(...data.map(d => d.count), 1);
    const totalPackets = data.reduce((acc, d) => acc + d.count, 0);

    return (
        <ZenithCard 
            title="Org-Sync Status" 
            icon={Activity}
            rightElement={
                <div className="flex flex-col items-end">
                    <span className="text-2xl font-black text-primary italic leading-none">{totalPackets}</span>
                    <span className="text-[8px] font-black text-app-text-muted uppercase tracking-[0.2em] opacity-40">Active_Signals</span>
                </div>
            }
            className="group/map"
        >
            <div className="space-y-10 mt-8">
                {data.map((item, i) => {
                    const width = (item.count / maxCount) * 100;
                    return (
                        <div key={item.dept} className="group/item relative">
                            <div className="flex justify-between items-center mb-4">
                                <div className="flex items-center gap-4">
                                    <div className="relative">
                                        <Wifi size={14} className={`transition-all duration-500 ${
                                            i < 3 ? 'text-primary' : 'text-app-text-muted opacity-40'
                                        } group-hover/item:scale-125`} />
                                        {i < 3 && <div className="absolute inset-0 animate-ping bg-primary/20 rounded-full scale-150" />}
                                    </div>
                                    <span className="text-[11px] font-black text-app-text tracking-[0.15em] uppercase transition-colors group-hover/item:text-primary">
                                        {item.dept}
                                    </span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="text-[10px] font-black text-app-text-muted/60 opacity-0 group-hover/item:opacity-100 transition-opacity uppercase tracking-tighter">
                                        Load_Density
                                    </span>
                                    <span className="text-[12px] font-black text-app-text tabular-nums">
                                        {item.count}
                                    </span>
                                </div>
                            </div>
                            
                            {/* Segmented Pulse Bar */}
                            <div className="h-2 w-full bg-app-surface border border-app-border/40 p-0.5 relative overflow-hidden">
                                <div 
                                    className="h-full bg-gradient-to-r from-primary/40 to-primary transition-all duration-[1.5s] ease-out shadow-[0_0_20px_var(--primary-glow)] relative flex"
                                    style={{ 
                                        width: `${Math.max(width, 2)}%`,
                                        transitionDelay: `${i * 150}ms`
                                    }}
                                >
                                    {/* Kinetic Scan Overlay */}
                                    <div className="absolute inset-0 h-full w-[200%] animate-scan-fast bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none" />
                                    
                                    {/* Dash Patterns */}
                                    <div className="absolute inset-0 opacity-20 pointer-events-none flex justify-between px-1">
                                        {[...Array(10)].map((_, idx) => (
                                            <div key={idx} className="w-[1px] h-full bg-app-bg" />
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            <ZenithButton 
                variant="outline" 
                icon={Users}
                className="w-full mt-10 !py-4 text-[9px] tracking-[0.3em]"
            >
                INITIATE SECTOR AUDIT
            </ZenithButton>

            <style jsx>{`
                @keyframes scan-fast {
                    from { transform: translateX(-100%); }
                    to { transform: translateX(50%); }
                }
                .animate-scan-fast {
                    animation: scan-fast 1.5s linear infinite;
                }
            `}</style>
        </ZenithCard>
    );
};

export default memo(DepartmentalTicketLoad);
