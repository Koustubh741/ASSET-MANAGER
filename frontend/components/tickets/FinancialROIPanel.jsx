import React, { memo } from 'react';
import { TrendingUp, TrendingDown, DollarSign, Target, ShieldCheck, Zap, Wallet, Percent } from 'lucide-react';
import { getHorizonConfig } from '@/utils/horizonConfigs';

/**
 * FinancialROIPanel Component
 * High-fidelity financial impact cards for CEO.
 */
const FinancialROIPanel = ({ stats, deflection, horizon = 30 }) => {
    if (!stats) return null;

    const config = getHorizonConfig(horizon);
    const subLabel = config.roiSublabel;

    const cards = [
        {
            title: "Support Expenditure",
            value: `$${((stats.monthly_support_cost || 0) / 1000).toFixed(1)}k`,
            sub: subLabel,
            icon: Wallet,
            color: "blue"
        },
        {
            title: "Opportunity Loss",
            value: `$${(((stats.monthly_support_cost || 0) * 0.12) / 1000).toFixed(1)}k`,
            sub: "Productivity Opportunity Loss",
            icon: TrendingDown,
            color: "rose"
        },
        {
            title: "Efficiency Gains",
            value: `${(stats.automation_deflection || 0)}%`,
            sub: "Virtual Agent Deflection",
            icon: Percent,
            color: "emerald"
        }
    ];

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {cards.map((card, i) => {
                const Icon = card.icon;
                const tokenColor = card.color === 'blue' ? 'app-primary' : card.color === 'rose' ? 'app-rose' : 'app-secondary';
                return (
                    <div key={card.title} className="bg-app-surface ring-1 ring-black/5 dark:ring-white/5 rounded-2xl p-8 relative overflow-hidden group h-full hover:bg-app-surface/60 transition-all duration-500 shadow-sm">
                        <div className="kinetic-scan-line" />
                        <div className={`absolute -right-8 -bottom-8 w-32 h-32 blur-3xl opacity-5 group-hover:opacity-10 transition-opacity pointer-events-none`} 
                             style={{ backgroundColor: `var(--color-kinetic-${card.color === 'blue' ? 'primary' : card.color === 'rose' ? 'rose' : 'secondary'})` }} />
                        
                        <div className="flex items-center gap-6 relative z-10">
                            <div className="p-4 rounded-full transition-all duration-500 group-hover:scale-110 flex items-center justify-center"
                                 style={{ backgroundColor: `rgba(var(--color-kinetic-${card.color === 'blue' ? 'primary-rgb' : card.color === 'rose' ? 'rose-rgb' : 'secondary-rgb'}), 0.1)` }}>
                                <Icon size={24} style={{ color: `var(--color-kinetic-${card.color === 'blue' ? 'primary' : card.color === 'rose' ? 'rose' : 'secondary'})` }} />
                            </div>
                            <div>
                                <p className="text-[10px] font-semibold uppercase tracking-widest text-app-text-muted mb-2">{card.title}</p>
                                <h3 className="text-3xl font-bold tracking-tight text-app-text group-hover:translate-x-1 transition-transform leading-none">{card.value}</h3>
                            </div>
                        </div>
                        
                        <p className="mt-6 text-xs font-medium text-app-text-muted">
                            {card.sub} &middot; Telemetry Sync
                        </p>
                    </div>
                );
            })}
        </div>
    );
};

export default memo(FinancialROIPanel);
