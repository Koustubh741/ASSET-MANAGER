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
                return (
                    <div key={card.title} className="glass glass-hover p-6 relative overflow-hidden group h-full">
                        <div className={`absolute -right-4 -bottom-4 w-24 h-24 bg-${card.color}-500/5 blur-3xl rounded-full group-hover:bg-${card.color}-500/15 transition-all duration-700`} />
                        
                        <div className="flex items-center gap-4 relative z-10">
                            <div className={`p-3 rounded-xl bg-${card.color}-500/10 text-${card.color}-500 border border-${card.color}-500/20 shadow-inner group-hover:scale-110 transition-transform`}>
                                <Icon size={20} />
                            </div>
                            <div>
                                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-app-text-muted opacity-60 mb-1">{card.title}</p>
                                <h3 className="text-2xl font-['Outfit'] font-black tracking-tighter text-app-text group-hover:translate-x-1 transition-transform">{card.value}</h3>
                            </div>
                        </div>
                        
                        <p className="mt-4 text-[9px] font-black uppercase tracking-widest text-app-text-muted opacity-40 italic">
                            {card.sub}
                        </p>
                    </div>
                );
            })}
        </div>
    );
};

export default memo(FinancialROIPanel);
