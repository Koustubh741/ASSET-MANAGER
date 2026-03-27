import React, { memo, useState, useEffect, useMemo } from 'react';
import {
    Radar, RadarChart, PolarGrid,
    PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip, Legend
} from 'recharts';
import { GitCompare, ArrowUp, ArrowDown, Minus, HelpCircle } from 'lucide-react';
import apiClient from '@/lib/apiClient';
import { getHorizonConfig, calculateComparisonWindows } from '@/utils/horizonConfigs';
import StrategicRadarGuide from './StrategicRadarGuide';

/**
 * Summary → Radar Pillars Mapper
 */
function summaryToPillars(summary) {
    const compliance = parseFloat(String(summary?.compliance_rate || 89).replace(/[^0-9.]/g, '')) || 89;
    const load       = summary?.departmental_load || {};
    const totalLoad  = Object.values(load).reduce((a, b) => a + b, 0);
    const velocity   = totalLoad > 0 ? Math.min(100, 100 - totalLoad * 0.8) : 85;
    const mttr       = summary?.avg_mttr_hours || 48;
    const automation = summary?.automation_deflection || 25;
    const blockers   = summary?.critical_blockers || 0;

    return [
        { subject: 'Security',       value: Math.min(100, 88 + (compliance - 89) * 0.4) },
        { subject: 'Infrastructure', value: Math.min(100, 94 + (compliance - 89) * 0.3) },
        { subject: 'Velocity',       value: Math.max(0, Math.min(100, velocity)) },
        { subject: 'Cost Eff.',      value: compliance > 90 ? 85 : 72 },
        { subject: 'Compliance',     value: compliance },
        { subject: 'Reliability',    value: Math.max(0, 100 - blockers * 10) },
        { subject: 'Agility',        value: Math.min(100, automation * 2.5) },
        { subject: 'Endurance',      value: Math.max(0, 100 - totalLoad / 5) },
        { subject: 'Durability',     value: Math.max(0, Math.min(100, 100 - mttr * 0.8)) },
        { subject: 'Aptitude',       value: Math.max(0, Math.min(100, 70 + compliance * 0.2)) },
    ];
}

const PERIOD_A_COLOR = '#6366f1'; // indigo
const PERIOD_B_COLOR = '#10b981'; // emerald

const RadarComparison = ({ horizon = 30, selectedYear = new Date().getFullYear() }) => {
    const [dataA, setDataA]   = useState(null);
    const [dataB, setDataB]   = useState(null);
    const [loading, setLoading] = useState(true);
    const [showGuide, setShowGuide] = useState(false);

    const config = getHorizonConfig(horizon);

    useEffect(() => {
        let mounted = true;
        setLoading(true);

        const fetchData = async () => {
            try {
                const pivot = new Date();
                if (selectedYear < pivot.getFullYear()) {
                    pivot.setFullYear(selectedYear, 11, 31);
                }
                const { periodA, periodB } = calculateComparisonWindows(horizon, pivot);
                const [resA, resB] = await Promise.all([
                    apiClient.getTicketExecutiveSummary(horizon, { periodStart: periodA.start, periodEnd: periodA.end }),
                    apiClient.getTicketExecutiveSummary(horizon, { periodStart: periodB.start, periodEnd: periodB.end }),
                ]);
                if (mounted) { setDataA(resA); setDataB(resB); }
            } catch (e) {
                console.error('[Radar] Comparison fetch failed:', e);
            } finally {
                if (mounted) setLoading(false);
            }
        };

        fetchData();
        return () => { mounted = false; };
    }, [horizon, selectedYear]);

    const pillarsA = useMemo(() => summaryToPillars(dataA), [dataA]);
    const pillarsB = useMemo(() => summaryToPillars(dataB), [dataB]);

    const mergedData = useMemo(() =>
        pillarsA.map((p, i) => ({
            subject:  p.subject,
            current:  p.value,
            previous: pillarsB?.[i]?.value ?? 0,
            fullMark: 100,
        })),
    [pillarsA, pillarsB]);

    const deltas = useMemo(() =>
        pillarsA.map((p, i) => Math.round(p.value - (pillarsB?.[i]?.value ?? 0))),
    [pillarsA, pillarsB]);

    return (
        <div className="glass rounded-2xl p-8 relative overflow-hidden shadow-xl flex flex-col h-full min-h-[600px] border border-app-border/30">
            {/* Header */}
            <div className="flex items-center justify-between mb-6 relative z-10">
                <div className="flex items-center gap-4">
                    <div>
                        <h4 className="text-xl font-light tracking-widest text-app-text uppercase flex items-center gap-3">
                            <GitCompare size={20} className="text-primary" />
                            Executive Benchmarking
                        </h4>
                        <p className="text-[10px] text-app-text-muted font-mono tracking-[0.3em] font-black mt-1 opacity-70 uppercase">
                            {config.comparisonLabel} · Pivot FY{selectedYear}
                        </p>
                    </div>
                    <button 
                        onClick={() => setShowGuide(true)}
                        className="p-1.5 rounded-full hover:bg-white/10 text-app-text-muted hover:text-primary transition-all cursor-help border border-white/5"
                        title="Strategic Guide"
                    >
                        <HelpCircle size={16} />
                    </button>
                </div>
                <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-widest">
                    <span className="flex items-center gap-1.5">
                        <span className="w-6 h-0.5 inline-block rounded-full" style={{ backgroundColor: PERIOD_A_COLOR }} />
                        <span className="text-app-text-muted">Current</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                        <span className="w-6 h-0.5 inline-block rounded-full" style={{ backgroundColor: PERIOD_B_COLOR }} />
                        <span className="text-app-text-muted">Previous</span>
                    </span>
                </div>
            </div>

            {showGuide && <StrategicRadarGuide onClose={() => setShowGuide(false)} />}

            {loading ? (
                <div className="flex-grow flex items-center justify-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
                </div>
            ) : (
                <div className="flex-grow flex flex-col items-center">
                    <ResponsiveContainer width="100%" height={400}>
                        <RadarChart data={mergedData}>
                            <defs>
                                <linearGradient id="radarGradientCurrent" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor={PERIOD_A_COLOR} stopOpacity={0.6}/>
                                    <stop offset="95%" stopColor={PERIOD_A_COLOR} stopOpacity={0.1}/>
                                </linearGradient>
                                <linearGradient id="radarGradientPrevious" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor={PERIOD_B_COLOR} stopOpacity={0.3}/>
                                    <stop offset="95%" stopColor={PERIOD_B_COLOR} stopOpacity={0.05}/>
                                </linearGradient>
                            </defs>
                            <PolarGrid 
                                gridType="polygon" 
                                stroke="rgba(128,128,128,0.15)" 
                            />
                            <PolarAngleAxis
                                dataKey="subject"
                                tick={{ fill: 'rgba(128,128,128,0.7)', fontSize: 10, fontWeight: 700 }}
                            />
                            <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} axisLine={false} />

                            <Radar 
                                name="Previous" 
                                dataKey="previous"
                                stroke={PERIOD_B_COLOR} 
                                fill="url(#radarGradientPrevious)" 
                                strokeWidth={1} 
                                isAnimationActive={true}
                                animationDuration={1000}
                            />
                            <Radar 
                                name="Current" 
                                dataKey="current"
                                stroke={PERIOD_A_COLOR} 
                                fill="url(#radarGradientCurrent)" 
                                strokeWidth={3} 
                                dot={{ fill: PERIOD_A_COLOR, stroke: '#fff', strokeWidth: 2, r: 4 }}
                                isAnimationActive={true}
                                animationDuration={1500}
                            />

                            <Tooltip content={({ active, payload }) => {
                                if (!active || !payload?.length) return null;
                                const currentItem = payload.find(p => p.name === 'Current');
                                const previousItem = payload.find(p => p.name === 'Previous');
                                const delta = Math.round((currentItem?.value || 0) - (previousItem?.value || 0));

                                return (
                                    <div className="glass p-3 border border-app-border/40 shadow-xl rounded-lg min-w-[140px]">
                                        <div className="flex justify-between items-center mb-2">
                                            <p className="text-[10px] font-black text-app-text-muted uppercase">
                                                {payload[0]?.payload?.subject}
                                            </p>
                                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-black ${
                                                delta >= 0 ? 'bg-emerald-500/20 text-emerald-500' : 'bg-red-500/20 text-red-500'
                                            }`}>
                                                {delta >= 0 ? '+' : ''}{delta}
                                            </span>
                                        </div>
                                        {payload.map(p => (
                                            <div key={p.name} className="flex justify-between gap-4 py-0.5">
                                                <span className="text-[11px] font-bold" style={{ color: p.color }}>{p.name}</span>
                                                <span className="text-[11px] font-black text-app-text">{Math.round(p.value)}</span>
                                            </div>
                                        ))}
                                    </div>
                                );
                            }} />
                        </RadarChart>
                    </ResponsiveContainer>

                    {/* Delta Grid — all 10 pillars in 2 rows of 5 */}
                    <div className="mt-6 grid grid-cols-5 gap-3 w-full">
                        {mergedData.map((d, i) => {
                            const delta = deltas[i];
                            return (
                                <div key={d.subject}
                                    className="flex flex-col items-center p-3 rounded-xl bg-app-bg/40 dark:bg-white/5 border border-app-border/30 backdrop-blur-md">
                                    <span className="text-[9px] font-black uppercase tracking-widest text-app-text-muted mb-2 text-center leading-tight">
                                        {d.subject}
                                    </span>
                                    <div className="flex items-center gap-1.5">
                                        <div className={`p-1 rounded-full ${
                                            delta > 0 ? 'bg-emerald-500/20 text-emerald-500'
                                            : delta < 0 ? 'bg-red-500/20 text-red-500'
                                            : 'bg-slate-500/20 text-slate-500'
                                        }`}>
                                            {delta > 0
                                                ? <ArrowUp size={10} />
                                                : delta < 0
                                                    ? <ArrowDown size={10} />
                                                    : <Minus size={10} />}
                                        </div>
                                        <span className={`text-base font-black ${
                                            delta > 0 ? 'text-emerald-500'
                                            : delta < 0 ? 'text-red-500'
                                            : 'text-slate-400'
                                        }`}>
                                            {Math.abs(delta)}
                                        </span>
                                    </div>
                                    <div className="mt-1 text-[9px] text-app-text-muted opacity-60">
                                        {Math.round(d.current)} pts
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};

export default memo(RadarComparison);
