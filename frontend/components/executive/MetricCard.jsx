import React, { memo } from 'react';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

/**
 * Reusable Metric Card for Executive Dashboard.
 * Standardizes Glassmorphism and animations.
 */
const MetricCard = ({ title, value, icon: Icon, trend, trendValue, color, delay }) => {
    const isUp = trend === 'up';

    return (
        <div 
            className="glass glass-hover p-8 group animate-in fade-in slide-in-from-bottom-8 duration-700 overflow-hidden"
            style={{ animationDelay: `${delay}ms` }}
        >
            {/* Ambient Background Glow */}
            <div className={`absolute -right-8 -top-8 h-32 w-32 rounded-full bg-${color}-500/5 blur-3xl group-hover:bg-${color}-500/15 transition-colors duration-700`} />
            
            <div className="flex items-start justify-between relative z-10">
                <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-app-text-muted mb-1 opacity-60">{title}</p>
                    <h3 className="text-4xl font-['Outfit'] font-black tracking-tighter text-app-text group-hover:scale-105 transition-transform origin-left duration-500">{value}</h3>
                </div>
                <div className={`rounded-xl bg-${color}-500/10 p-4 text-${color}-500/90 border border-${color}-500/20 shadow-lg group-hover:rotate-12 transition-all duration-500`}>
                    <Icon size={28} />
                </div>
            </div>
            
            <div className="mt-8 flex items-center gap-2 relative z-10">
                <div className={`px-2 py-1 rounded-lg ${isUp ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'} flex items-center gap-1 border border-current/20`}>
                    {isUp ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                    <span className="text-xs font-black uppercase tracking-widest">{trendValue}</span>
                </div>
                <span className="text-[9px] font-black uppercase tracking-widest text-app-text-muted opacity-40 italic underline decoration-current/10 underline-offset-4">vs Last Quarter</span>
            </div>
        </div>
    );
};

export default memo(MetricCard);
