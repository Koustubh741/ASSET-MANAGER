import React, { memo, useState, useEffect } from 'react';
import { 
    X, Cpu, Activity, Zap, TrendingUp, Database
} from 'lucide-react';
import BusinessRiskRadar from './BusinessRiskRadar';
import FinancialROIPanel from './FinancialROIPanel';
import CrisisMonitor from './CrisisMonitor';
import StrategicAdvisor from '../executive/StrategicAdvisor';
import StrategicTrendChart from './StrategicTrendChart';
import RadarComparison from './RadarComparison';
import StrategicEvidenceModal from '../executive/StrategicEvidenceModal';
import apiClient from '@/lib/apiClient';

/**
 * Executive Intelligence Overlay v6.5 - Strategic Evidence Engine (STABLE)
 * Unified state management for horizon focus and deep-audit drill-downs.
 */
const ExecutiveIntelligenceOverlay = ({ isOpen, onClose, summary: initialSummary }) => {
    // ─── COMPONENT STATE ───
    const [summary, setSummary] = useState(initialSummary);
    const [horizon, setHorizon] = useState(30);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    
    // Evidence Modal State
    const [isAuditOpen, setIsAuditOpen] = useState(false);
    const [auditFocus, setAuditFocus] = useState(null);

    // Sync summary if initialSummary changes
    useEffect(() => {
        if (!isOpen || !initialSummary) return;
        setSummary(initialSummary);
    }, [initialSummary, isOpen]);

    // Global HUD Refetch on state change
    useEffect(() => {
        if (!isOpen) return;
        const fetchExecutiveSummary = async (days, year) => {
            try {
                const data = await apiClient.getTicketExecutiveSummary(days, { fiscal_year: year });
                setSummary(data);
            } catch (e) {
                console.warn('[HUD] Failed to refresh executive summary:', e);
            }
        };
        fetchExecutiveSummary(horizon, selectedYear);
    }, [horizon, selectedYear, isOpen]);

    // Modal Handlers
    const handleOpenAudit = (topic) => {
        console.log('[HUD] Opening Audit for:', topic);
        setAuditFocus(topic);
        setIsAuditOpen(true);
    };

    if (!isOpen || !summary) return null;

    return (
        <div className="fixed inset-0 z-[100] bg-white/95 dark:bg-[var(--bg-app)]/95 backdrop-blur-2xl animate-in fade-in duration-500 overflow-hidden flex flex-col font-['Outfit']">
            
            {/* Tactical Grid Background */}
            <div className="absolute inset-0 opacity-[0.04] dark:opacity-[0.03] pointer-events-none"
                 style={{ backgroundImage: 'radial-gradient(circle, var(--color-primary) 1px, transparent 1px)', backgroundSize: '30px 30px' }} />

            {/* Header */}
            <div className="border-b border-slate-200 dark:border-primary/20 bg-white/80 dark:bg-slate-900/40 p-6 flex items-center justify-between relative z-10 backdrop-blur-md flex-shrink-0">
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-primary/10 text-primary border border-primary/20 shadow-[0_0_15px_rgba(var(--primary-rgb),0.2)]">
                            <Cpu size={24} className="animate-pulse" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-app-text tracking-tighter uppercase italic">
                                Strategic <span className="text-primary not-italic">Intelligence</span> HUD
                            </h2>
                            <p className="text-[9px] text-app-text-muted font-black uppercase tracking-[0.4em] opacity-60">System Version 6.5 // AI EVIDENCE ENGINE v1</p>
                        </div>
                    </div>

                    <div className="h-10 w-px bg-slate-200 dark:bg-primary/10 mx-4 hidden md:block" />

                    <div className="hidden lg:flex items-center gap-6">
                        <div className="flex flex-col">
                            <span className="text-[8px] font-black text-app-text-muted uppercase tracking-[0.3em] mb-1.5 opacity-50">Horizon Focus</span>
                            <div className="flex bg-slate-100 dark:bg-primary/5 rounded-xl p-1 border border-slate-200 dark:border-primary/20 shadow-inner">
                                {[7,30,90,365].map(d => (
                                    <button key={d} onClick={() => setHorizon(d)}
                                        className={`px-4 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${horizon === d ? 'bg-primary text-white shadow-md' : 'text-app-text-muted hover:text-app-text'}`}>
                                        {d === 7 ? '1W' : d === 30 ? '1M' : d === 90 ? '1Q' : '1Y'}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="flex flex-col">
                            <span className="text-[8px] font-black text-app-text-muted uppercase tracking-[0.3em] mb-1.5 opacity-50">Fiscal Cycle</span>
                            <div className="flex bg-slate-100 dark:bg-slate-500/5 rounded-xl p-1 border border-slate-200 dark:border-slate-500/20 shadow-inner">
                                {[2024, 2025, 2026].map(y => (
                                    <button key={y} onClick={() => setSelectedYear(y)}
                                        className={`px-4 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${selectedYear === y ? 'bg-slate-600 dark:bg-slate-500 text-white shadow-md' : 'text-app-text-muted hover:text-app-text'}`}>
                                        {y}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                <button onClick={onClose}
                    className="p-3 rounded-2xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-app-border text-app-text-muted hover:bg-rose-500/10 hover:text-rose-500 transition-all shadow-sm">
                    <X size={24} />
                </button>
            </div>

            {/* Main HUD Content */}
            <div className="flex-1 overflow-y-auto p-8 relative z-10 custom-scrollbar">
                <div className="max-w-7xl mx-auto space-y-8 pb-12">

                    {/* ROW 1: Financial ROI */}
                    <div className="animate-in slide-in-from-bottom-8 duration-700">
                        <FinancialROIPanel horizon={horizon} stats={summary.financial_pulse} deflection={summary.automation_deflection} />
                    </div>

                    {/* ROW 2: Radar + Trend */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in slide-in-from-bottom-8 duration-700 delay-100">
                        <BusinessRiskRadar
                            horizon={horizon}
                            selectedYear={selectedYear}
                            onOpenAudit={handleOpenAudit}
                            load={summary.departmental_load}
                            compliance={summary.compliance_rate}
                            riskDimensions={summary.risk_dimensions}
                        />
                        <StrategicTrendChart selectedYear={selectedYear} horizon={horizon} />
                    </div>

                    {/* ROW 3: Comparison */}
                    <div className="animate-in slide-in-from-bottom-8 duration-700 delay-200">
                        <RadarComparison horizon={horizon} selectedYear={selectedYear} />
                    </div>

                    {/* ROW 4: AI Insights + Major Incidents (BALANCED LAYOUT) */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in slide-in-from-bottom-8 duration-700 delay-300">
                        <div className="lg:col-span-1">
                            <CrisisMonitor incidents={summary.major_incidents} />
                        </div>
                        <div className="lg:col-span-2">
                            <StrategicAdvisor
                                isExecuting={false}
                                insights={summary.insights || {
                                    analysis: `Audit Bus Synchronized. Global SLA compliance is ${summary.compliance_rate}%. Operational velocity remains stable across FY${selectedYear}. Neural mapping suggests critical friction points in Tier 2 infrastructure.`,
                                    recommendations: ['Perform System Audit', 'Optimize Cloud Spend', 'Recalibrate SLA Thresholds', 'Deploy Auto-Scaling Patch']
                                }}
                                onOpenAudit={handleOpenAudit}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="p-3 bg-slate-100/80 dark:bg-primary/5 border-t border-slate-200 dark:border-primary/10 flex justify-between items-center text-[8px] font-black text-app-text-muted uppercase tracking-[0.3em] opacity-50">
                <span>Location: GLOBAL COMMAND // ID: CEO_EVIDENCE_ENGINE</span>
                <div className="flex items-center gap-6">
                    <span className="flex items-center gap-1"><Zap size={10} className="text-primary"/> GRID_SYNC: ACTIVE</span>
                    <span className="flex items-center gap-1"><Database size={10} className="text-primary"/> AUDIT_BUS: LINKED</span>
                    <span>READY FOR ACTION</span>
                </div>
            </div>

            {/* Evidence Portal (The Modal) */}
            <StrategicEvidenceModal 
                isOpen={isAuditOpen} 
                onClose={() => setIsAuditOpen(false)}
                focus={auditFocus}
                data={summary}
            />
        </div>
    );
};

export default memo(ExecutiveIntelligenceOverlay);
