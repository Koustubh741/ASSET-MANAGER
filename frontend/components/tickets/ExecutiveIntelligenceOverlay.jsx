import React, { memo, useState, useEffect } from 'react';
import { 
    X, Cpu, Activity, Zap, TrendingUp, Database
} from 'lucide-react';
import BusinessRiskRadar from './BusinessRiskRadar';
import FinancialROIPanel from './FinancialROIPanel';
import CrisisMonitor from './CrisisMonitor';
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
        <div className="fixed inset-0 z-[100] bg-app-obsidian/98 backdrop-blur-3xl animate-in fade-in duration-500 overflow-hidden flex flex-col font-['Space_Grotesk']">
            
            {/* Tactical Grid Background */}
            <div className="absolute inset-0 opacity-[0.08] pointer-events-none"
                 style={{ backgroundImage: 'radial-gradient(circle, var(--color-app-primary) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

            {/* Header */}
            <div className="border-b border-app-border bg-app-void/80 p-6 flex items-center justify-between relative z-10 backdrop-blur-md flex-shrink-0">
                <div className="flex items-center gap-8">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full flex items-center justify-center bg-app-primary/10 text-app-primary">
                            <Cpu size={24} className="animate-pulse" />
                        </div>
                        <div>
                            <h2 className="text-3xl font-bold text-app-text tracking-tight uppercase leading-none">
                                Strategic <span className="text-app-primary">Intelligence</span> HUD
                            </h2>
                            <p className="text-[10px] text-app-text-muted font-semibold uppercase tracking-widest mt-2 block">System_Ver_6.8 // Neural_Evidence_Engine</p>
                        </div>
                    </div>

                    <div className="h-12 w-px bg-app-border mx-4 hidden md:block" />

                    <div className="hidden lg:flex items-center gap-8">
                        <div className="flex flex-col">
                            <span className="text-[9px] font-semibold text-app-text-muted uppercase tracking-widest mb-2">Horizon_Focus</span>
                            <div className="inline-flex bg-app-surface/50 rounded-md p-1">
                                {[7,30,90,365].map(d => (
                                    <button key={d} onClick={() => setHorizon(d)}
                                        className={`px-5 py-2 text-[10px] font-bold uppercase tracking-wider rounded-md transition-all ${horizon === d ? 'bg-app-surface shadow-sm text-app-primary ring-1 ring-black/5 dark:ring-white/5' : 'text-app-text-muted hover:text-app-primary hover:bg-app-surface/50'}`}>
                                        {d === 7 ? '1W' : d === 30 ? '1M' : d === 90 ? '1Q' : '1Y'}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="flex flex-col">
                            <span className="text-[9px] font-semibold text-app-text-muted uppercase tracking-widest mb-2">Fiscal_Cycle</span>
                            <div className="inline-flex bg-app-surface/50 rounded-md p-1">
                                {[2024, 2025, 2026].map(y => (
                                    <button key={y} onClick={() => setSelectedYear(y)}
                                        className={`px-5 py-2 text-[10px] font-bold uppercase tracking-wider rounded-md transition-all ${selectedYear === y ? 'bg-app-surface shadow-sm text-app-secondary ring-1 ring-black/5 dark:ring-white/5' : 'text-app-text-muted hover:text-app-secondary hover:bg-app-surface/50'}`}>
                                        {y}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                <button onClick={onClose}
                    className="w-10 h-10 flex items-center justify-center rounded-full bg-app-surface/50 text-app-text-muted hover:bg-app-rose/10 hover:text-app-rose transition-all active:scale-95 group">
                    <X size={20} className="group-hover:rotate-90 transition-transform" />
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

                    {/* ROW 4: Major Incidents */}
                    <div className="animate-in slide-in-from-bottom-8 duration-700 delay-300">
                        <CrisisMonitor incidents={summary.major_incidents} />
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="p-4 bg-app-void border-t border-app-border flex justify-between items-center text-[9px] font-black text-app-text-muted uppercase tracking-[0.5em] opacity-40 italic">
                <span className="opacity-70 text-app-primary">Location: GLOBAL_COMMAND_CENTER // ID: KINETIC_OPS_EVIDENCE_ENGINE</span>
                <div className="flex items-center gap-8">
                    <span className="flex items-center gap-2"><Zap size={12} className="text-app-primary animate-pulse"/> GRID_SYNC: ACTIVE</span>
                    <span className="flex items-center gap-2"><Database size={12} className="text-app-secondary"/> AUDIT_BUS: LINKED</span>
                    <span className="text-app-primary animate-pulse">READY_FOR_ACTION</span>
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
