import React, { memo } from 'react';
import { AlertTriangle, DollarSign, TrendingUp, ArrowUpRight } from 'lucide-react';

/**
 * Strategic Financial Risk Panel.
 * High-fidelity alert system for CapEx forecasting and upcoming renewals.
 */
const FinancialRiskPanel = ({ upcomingRenewals, totalSpend }) => {
    return (
        <div className="glass glass-hover p-0 relative overflow-hidden group flex flex-col">
            <div className="p-10 relative z-10 flex flex-col h-full">
                <div className="flex items-center justify-between mb-10">
                    <div>
                        <h4 className="text-xl font-['Outfit'] font-black mb-1 flex items-center gap-3 text-app-text uppercase tracking-tighter">
                            <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/20 shadow-lg animate-pulse-slow">
                                <AlertTriangle size={24} />
                            </div>
                            Strategic Financial Risk
                        </h4>
                        <p className="text-[10px] text-app-text-muted font-black uppercase tracking-[0.3em] mt-2 opacity-60">Capital Expenditure Forecasting</p>
                    </div>
                    <span className="px-4 py-1.5 bg-rose-500/10 text-rose-500 text-[9px] font-black uppercase tracking-widest border border-rose-500/20 rounded-full flex items-center gap-2 shadow-xl shadow-rose-500/5">
                        <div className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
                        Critical Horizon
                    </span>
                </div>
                
                <div className="bg-slate-500/5 dark:bg-black/30 border border-app-border p-8 rounded-[2rem] mb-10 group-hover:border-amber-500/30 transition-all duration-700 relative overflow-hidden">
                    <div className="absolute -bottom-8 -right-8 opacity-5 group-hover:opacity-10 transition-opacity rotate-12">
                        <DollarSign size={160} className="text-amber-500" />
                    </div>
                    <p className="text-sm text-app-text leading-relaxed font-medium relative z-10">
                        <span className="text-amber-500 font-bold">{upcomingRenewals} high-priority assets</span> are identified with imminent compliance drift or warranty expiration (90d). 
                        Projected Liquidity Requirement: <span className="text-app-text font-black underline decoration-amber-500/40 decoration-4 underline-offset-4 text-xl tracking-tight ml-2">$312,400.00</span>
                    </p>
                </div>
                
                <div className="grid grid-cols-2 gap-6 mt-auto">
                    <div className="p-6 rounded-2xl glass-interactive shadow-inner">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-[10px] font-black text-app-text-muted uppercase tracking-[0.2em] opacity-40">Exceptions</span>
                            <TrendingUp size={14} className="text-indigo-400" />
                        </div>
                        <span className="block text-3xl font-black text-app-text tracking-tighter">14.2%</span>
                        <div className="mt-2 h-1 w-12 bg-indigo-500/40 rounded-full" />
                    </div>
                    <div className="p-6 rounded-2xl glass-interactive shadow-inner">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-[10px] font-black text-app-text-muted uppercase tracking-[0.2em] opacity-40">ROI Matrix</span>
                            <ArrowUpRight size={14} className="text-emerald-400" />
                        </div>
                        <span className="block text-3xl font-black text-app-text tracking-tighter">98/100</span>
                        <div className="mt-2 h-1 w-12 bg-emerald-500/40 rounded-full" />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default memo(FinancialRiskPanel);
