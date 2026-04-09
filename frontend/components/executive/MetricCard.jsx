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
            className="glass glass-hover p-8 group animate-in fade-in slide-in-from-bottom-8 duration-700 overflow-hidden relative"
            style={{ animationDelay: `${delay}ms` }}
        >
            {/* Ambient Background Glow - Kinetic Ops standard */}
            <div className={`absolute -right-12 -top-12 h-40 w-40 rounded-none opacity-5 group-hover:opacity-10 transition-opacity duration-700 pointer-events-none`} 
                 style={{ backgroundColor: `var(--color-kinetic-${color === 'emerald' ? 'secondary' : color === 'rose' ? 'rose' : color === 'indigo' ? 'primary' : color === 'amber' ? 'gold' : 'primary'})` }} />
            
            <div className="flex items-start justify-between relative z-10">
                <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-app-text-muted mb-2 opacity-40 italic">{title}</p>
                    <h3 className="text-4xl font-black tracking-tighter text-app-text group-hover:scale-105 transition-transform origin-left duration-500 italic uppercase leading-none">{value}</h3>
                </div>
                <div className="p-4 bg-app-void border border-app-border group-hover:border-app-primary transition-all duration-500 shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-app-primary to-transparent opacity-30" />
                    <Icon size={28} className="text-app-primary group-hover:rotate-12 transition-transform" />
                </div>
            </div>
            
            <div className="mt-8 flex items-center gap-3 relative z-10">
                <div className={`px-2.5 py-1 rounded-none ${isUp ? 'bg-app-secondary/10 text-app-secondary border-app-secondary/20' : 'bg-app-rose/10 text-app-rose border-app-rose/20'} flex items-center gap-1.5 border font-black uppercase tracking-widest text-[10px] italic`}>
                    {isUp ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                    <span>{trendValue}</span>
                </div>
                <span className="text-[9px] font-black uppercase tracking-widest text-app-text-muted opacity-30 italic">Delta_Velocity (Q/Q)</span>
            </div>
        </div>
    );
};

export default memo(MetricCard);
