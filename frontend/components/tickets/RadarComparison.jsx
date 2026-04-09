import React, { memo, useState, useEffect, useMemo } from 'react';
import {
    Radar, RadarChart, PolarGrid,
    PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip
} from 'recharts';
import {
    GitCompare, ArrowUp, ArrowDown, Minus, HelpCircle,
    TrendingUp, TrendingDown, Activity, Zap
} from 'lucide-react';
import apiClient from '@/lib/apiClient';
import { getHorizonConfig, calculateComparisonWindows } from '@/utils/horizonConfigs';
import StrategicRadarGuide from './StrategicRadarGuide';

/* ─────────────────────────────────────────── Pillar mapper ── */
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
        { subject: 'Infra',          value: Math.min(100, 94 + (compliance - 89) * 0.3) },
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

/* ─────────────────────────────────────────── Constants ── */
const PRIMARY   = 'var(--color-kinetic-primary, #6366f1)';
const SECONDARY = 'var(--color-kinetic-secondary, #22d3ee)';

/* ─────────────────────────────────────────── Custom Tooltip ── */
const RadarTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    const cur  = payload.find(p => p.name === 'Current');
    const prev = payload.find(p => p.name === 'Previous');
    const delta = Math.round((cur?.value || 0) - (prev?.value || 0));
    const subject = payload[0]?.payload?.subject;

    return (
        <div className="bg-app-obsidian border border-app-border shadow-2xl p-4 min-w-[180px] rounded-none">
            <p className="text-[9px] tracking-[0.35em] font-black uppercase mb-2 pb-2 border-b border-app-border" style={{ color: PRIMARY }}>
                {subject}
            </p>
            <div className="mb-2">
                <span className="inline-block px-2 py-0.5 text-[9px] font-black tracking-widest uppercase border"
                      style={{
                          background: delta >= 0 ? 'var(--color-kinetic-secondary-rgb, 34,211,238)' : 'var(--color-kinetic-rose-rgb, 244,63,94)',
                          backgroundColor: `rgba(${delta >= 0 ? 'var(--color-kinetic-secondary-rgb)' : 'var(--color-kinetic-rose-rgb)'}, 0.12)`,
                          color: delta >= 0 ? SECONDARY : 'var(--color-kinetic-rose)',
                          borderColor: `rgba(${delta >= 0 ? 'var(--color-kinetic-secondary-rgb)' : 'var(--color-kinetic-rose-rgb)'}, 0.25)`
                      }}>
                    {delta >= 0 ? '▲' : '▼'} {delta >= 0 ? '+' : ''}{delta} pts
                </span>
            </div>
            {payload.map(p => (
                <div key={p.name} className="flex justify-between items-center gap-4 mb-1">
                    <span className="text-[9px] font-black tracking-widest uppercase" style={{ color: p.color }}>{p.name}</span>
                    <span className="text-[15px] font-black font-mono text-app-text">{Math.round(p.value)}</span>
                </div>
            ))}
            <div className="mt-2 h-[3px] bg-app-surface w-full overflow-hidden">
                <div style={{ height: '100%', width: `${Math.round(cur?.value || 0)}%`, background: `linear-gradient(90deg, ${PRIMARY}, ${SECONDARY})`, transition: 'width 0.4s ease' }} />
            </div>
        </div>
    );
};

/* ─────────────────────────────────────────── Skeleton ── */
const SkeletonPulse = ({ w = '100%', h = 16, className = '' }) => (
    <div className={`bg-app-surface-soft animate-pulse rounded-none border border-app-border/50 ${className}`} style={{ width: w, height: h }} />
);

/* ─────────────────────────────────────────── Delta Card ── */
const DeltaCard = ({ d, delta }) => {
    const isUp   = delta > 0;
    const isDown = delta < 0;
    const color  = isUp ? SECONDARY : isDown ? 'var(--color-kinetic-rose)' : 'var(--text-muted)';
    const colorRgb = isUp ? 'var(--color-kinetic-secondary-rgb)' : isDown ? 'var(--color-kinetic-rose-rgb)' : '200,200,200';

    return (
        <div className="radar-delta-card flex flex-col items-center p-3 relative overflow-hidden transition-all duration-300 border bg-app-surface-soft border-app-border hover:-translate-y-0.5 hover:shadow-lg"
             style={{
                 borderColor: `rgba(${colorRgb}, 0.2)`,
                 backgroundColor: `rgba(${colorRgb}, 0.05)`
             }}>
            {/* Glow dot TL */}
            <div className="absolute top-1.5 left-1.5 w-1 h-1 rounded-full opacity-50" style={{ backgroundColor: color }} />

            {/* Subject label */}
            <span className="text-[8px] font-black tracking-[0.3em] uppercase text-app-text-muted mb-2 text-center leading-[1.4] font-['Space_Grotesk']">
                {d.subject}
            </span>

            {/* Arrow + number */}
            <div className="flex items-center gap-1.5 mb-2">
                <div className="w-7 h-7 flex items-center justify-center shrink-0 border"
                     style={{ backgroundColor: `rgba(${colorRgb}, 0.1)`, borderColor: `rgba(${colorRgb}, 0.4)`, color }}>
                    {isUp ? <ArrowUp size={13} /> : isDown ? <ArrowDown size={13} /> : <Minus size={13} />}
                </div>
                <span className="text-xl font-black italic tracking-tighter font-['Space_Grotesk'] leading-none" style={{ color }}>
                    {Math.abs(delta)}
                </span>
            </div>

            {/* Score display */}
            <span className="text-[9px] font-bold text-app-text-muted font-mono mb-2">
                {Math.round(d.current)}pts
            </span>

            {/* Mini progress bar */}
            <div className="w-full h-[2px] bg-app-surface overflow-hidden">
                <div style={{ height: '100%', width: `${Math.round(d.current)}%`, background: `linear-gradient(90deg, transparent, ${color})`, opacity: 0.8 }} />
            </div>
        </div>
    );
};

/* ─────────────────────────────────────────── Summary stat ── */
const StatPill = ({ label, value, color, icon: Icon }) => (
    <div className="flex flex-col flex-1 min-w-0 p-3 items-start bg-app-surface border border-app-border">
        <div className="flex items-center gap-1.5 mb-1.5">
            {Icon && <Icon size={11} style={{ color }} />}
            <span className="text-[8px] font-black tracking-[0.35em] uppercase text-app-text-muted font-mono">
                {label}
            </span>
        </div>
        <span className="text-2xl font-black italic tracking-tighter leading-none font-['Space_Grotesk']" style={{ color }}>
            {value}
        </span>
    </div>
);

/* ─────────────────────────────────────────── Main component ── */
const RadarComparison = ({ horizon = 30, selectedYear = new Date().getFullYear() }) => {
    const [dataA, setDataA]     = useState(null);
    const [dataB, setDataB]     = useState(null);
    const [loading, setLoading] = useState(true);
    const [showGuide, setShowGuide] = useState(false);

    const config = getHorizonConfig(horizon);

    useEffect(() => {
        let mounted = true;
        setLoading(true);

        const fetchData = async () => {
            try {
                const pivot = new Date();
                if (selectedYear < pivot.getFullYear()) pivot.setFullYear(selectedYear, 11, 31);
                const { periodA, periodB } = calculateComparisonWindows(horizon, pivot);
                const [resA, resB] = await Promise.all([
                    apiClient.getTicketExecutiveSummary(horizon, { periodStart: periodA.start, periodEnd: periodA.end }),
                    apiClient.getTicketExecutiveSummary(horizon, { periodStart: periodB.start, periodEnd: periodB.end }),
                ]);
                if (mounted) { setDataA(resA); setDataB(resB); }
            } catch (e) {
                console.error('[Radar] fetch failed:', e);
            } finally {
                if (mounted) setLoading(false);
            }
        };

        fetchData();
        return () => { mounted = false; };
    }, [horizon, selectedYear]);

    const pillarsA   = useMemo(() => summaryToPillars(dataA), [dataA]);
    const pillarsB   = useMemo(() => summaryToPillars(dataB), [dataB]);
    const mergedData = useMemo(() =>
        pillarsA.map((p, i) => ({ subject: p.subject, current: p.value, previous: pillarsB?.[i]?.value ?? 0, fullMark: 100 })),
    [pillarsA, pillarsB]);
    const deltas     = useMemo(() =>
        pillarsA.map((p, i) => Math.round(p.value - (pillarsB?.[i]?.value ?? 0))),
    [pillarsA, pillarsB]);

    // Summary stats
    const avgCurrent  = Math.round(pillarsA.reduce((s, p) => s + p.value, 0) / pillarsA.length);
    const avgPrevious = Math.round(pillarsB.reduce((s, p) => s + p.value, 0) / pillarsB.length);
    const netDelta    = avgCurrent - avgPrevious;
    const improved    = deltas.filter(d => d > 0).length;
    const declined    = deltas.filter(d => d < 0).length;

    return (
        <>
            {/* Base keyframes for interaction */}
            <style>{`
                .radar-delta-card:hover {
                    transform: translateY(-2px);
                    border-color: rgba(var(--color-kinetic-primary-rgb), 0.4) !important;
                    box-shadow: 0 8px 24px rgba(0,0,0,0.1);
                }
            `}</style>

            <div className="relative overflow-hidden flex flex-col min-h-[660px] bg-app-obsidian border border-app-border shadow-[inset_0_0_60px_rgba(0,0,0,0.02)]">

                {/* Ambient corner glow */}
                <div className="absolute top-[-80px] right-[-80px] w-[300px] h-[300px] pointer-events-none" style={{ background: `radial-gradient(circle, rgba(var(--color-kinetic-primary-rgb),0.1) 0%, transparent 70%)` }} />
                <div className="absolute bottom-[-60px] left-[-60px] w-[250px] h-[250px] pointer-events-none" style={{ background: `radial-gradient(circle, rgba(var(--color-kinetic-secondary-rgb),0.06) 0%, transparent 70%)` }} />

                {/* ── HEADER ── */}
                <div className="flex items-center justify-between p-5 border-b border-app-border bg-app-void/80 backdrop-blur-md relative z-10 shrink-0">
                    {/* Title block */}
                    <div className="flex items-center gap-3.5">
                        <div className="w-10 h-10 flex items-center justify-center border bg-app-void shadow-lg"
                             style={{ borderColor: `rgba(var(--color-kinetic-primary-rgb), 0.35)`, color: PRIMARY }}>
                            <GitCompare size={20} />
                        </div>
                        <div>
                            <h4 className="text-[13px] font-black tracking-[0.22em] uppercase text-app-text font-['Space_Grotesk'] m-0 leading-none">
                                Executive Benchmarking
                            </h4>
                            <p className="text-[9px] font-bold tracking-[0.35em] uppercase text-app-text-muted mt-1.5 mb-0 font-mono">
                                {config.comparisonLabel} // FY{selectedYear}
                            </p>
                        </div>
                    </div>

                    {/* Legend + Guide btn */}
                    <div className="flex items-center gap-5">
                        <div className="flex items-center gap-4">
                            {[
                                { color: PRIMARY,   label: 'Current' },
                                { color: SECONDARY, label: 'Historical' },
                            ].map(({ color, label }) => (
                                <span key={label} className="flex items-center gap-2">
                                    <span className="inline-block w-5 h-0.5 shadow-sm" style={{ background: color }} />
                                    <span className="text-[9px] font-black tracking-[0.2em] uppercase" style={{ color }}>{label}</span>
                                </span>
                            ))}
                        </div>

                        <button
                            onClick={() => setShowGuide(true)}
                            title="Strategic Guide"
                            className="w-8 h-8 flex items-center justify-center bg-app-surface border border-app-border text-app-text-muted hover:text-app-text transition-all"
                        >
                            <HelpCircle size={15} />
                        </button>
                    </div>
                </div>

                {/* ── GUIDE OVERLAY ── */}
                {showGuide && <StrategicRadarGuide onClose={() => setShowGuide(false)} />}

                {/* ── BODY ── */}
                {loading ? (
                    /* Skeleton */
                    <div className="flex-1 p-6 flex flex-col gap-6">
                        <div className="flex gap-3">
                            {Array.from({ length: 4 }).map((_, i) => <SkeletonPulse key={i} h={64} className="flex-1" />)}
                        </div>
                        <SkeletonPulse h={340} />
                        <div className="grid grid-cols-5 gap-2.5">
                            {Array.from({ length: 10 }).map((_, i) => <SkeletonPulse key={i} h={100} />)}
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col p-5 pb-7 gap-5 relative z-0">

                        {/* ── SUMMARY STAT ROW ── */}
                        <div className="flex gap-2.5">
                            <StatPill label="Overall Score"  value={avgCurrent}  color={PRIMARY}   icon={Activity} />
                            <StatPill label="Prior Period"   value={avgPrevious} color="var(--text-muted)" icon={null} />
                            <StatPill
                                label="Net Change"
                                value={`${netDelta >= 0 ? '+' : ''}${netDelta}`}
                                color={netDelta >= 0 ? SECONDARY : 'var(--color-kinetic-rose)'}
                                icon={netDelta >= 0 ? TrendingUp : TrendingDown}
                            />
                            <StatPill label="Improved"  value={`${improved}/10`} color={SECONDARY}  icon={Zap} />
                            <StatPill label="Declined"  value={`${declined}/10`} color={declined > 0 ? 'var(--color-kinetic-rose)' : 'var(--text-muted)'} icon={null} />
                        </div>

                        {/* ── RADAR CHART ── */}
                        <div className="relative">
                            {/* Glow halo behind chart */}
                            <div className="absolute inset-0 pointer-events-none"
                                 style={{ background: `radial-gradient(ellipse at 50% 50%, rgba(var(--color-kinetic-primary-rgb),0.08) 0%, transparent 70%)` }} />
                            <ResponsiveContainer width="100%" height={360}>
                                <RadarChart data={mergedData} margin={{ top: 20, right: 30, bottom: 20, left: 30 }}>
                                    <defs>
                                        <radialGradient id="rGradCurrent" cx="50%" cy="50%" r="50%">
                                            <stop offset="0%"   stopColor={PRIMARY}   stopOpacity={0.5} />
                                            <stop offset="100%" stopColor={PRIMARY}   stopOpacity={0.05} />
                                        </radialGradient>
                                        <radialGradient id="rGradPrevious" cx="50%" cy="50%" r="50%">
                                            <stop offset="0%"   stopColor={SECONDARY} stopOpacity={0.25} />
                                            <stop offset="100%" stopColor={SECONDARY} stopOpacity={0.02} />
                                        </radialGradient>
                                        <filter id="radarGlow">
                                            <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur" />
                                            <feMerge>
                                                <feMergeNode in="blur" />
                                                <feMergeNode in="SourceGraphic" />
                                            </feMerge>
                                        </filter>
                                    </defs>

                                    <PolarGrid
                                        gridType="polygon"
                                        stroke="var(--border-main)"
                                        strokeWidth={1}
                                    />
                                    <PolarAngleAxis
                                        dataKey="subject"
                                        tick={{
                                            fill: 'var(--text-muted)',
                                            fontSize: 9,
                                            fontWeight: 900,
                                            letterSpacing: '0.12em',
                                            fontFamily: 'Space Grotesk, sans-serif',
                                            textTransform: 'uppercase',
                                        }}
                                    />
                                    <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} axisLine={false} />

                                    {/* Historical layer (behind) */}
                                    <Radar
                                        name="Previous"
                                        dataKey="previous"
                                        stroke={SECONDARY}
                                        strokeWidth={1.5}
                                        strokeDasharray="4 3"
                                        fill="url(#rGradPrevious)"
                                        isAnimationActive
                                        animationDuration={900}
                                    />

                                    {/* Current layer (foreground) */}
                                    <Radar
                                        name="Current"
                                        dataKey="current"
                                        stroke={PRIMARY}
                                        strokeWidth={2.5}
                                        fill="url(#rGradCurrent)"
                                        dot={{ fill: PRIMARY, stroke: 'var(--bg-surface)', strokeWidth: 2, r: 4, filter: 'url(#radarGlow)' }}
                                        activeDot={{ r: 6, fill: PRIMARY, stroke: 'var(--bg-surface)', strokeWidth: 2 }}
                                        isAnimationActive
                                        animationDuration={1200}
                                    />

                                    <Tooltip content={<RadarTooltip />} cursor={false}/>
                                </RadarChart>
                            </ResponsiveContainer>
                        </div>

                        {/* ── DELTA GRID ── */}
                        <div>
                            <div className="flex items-center gap-2.5 mb-2.5 text-[8px] font-black tracking-[0.4em] uppercase text-app-text-muted font-mono">
                                <div className="flex-1 h-[1px] bg-app-border" />
                                Pillar_Delta_Breakdown
                                <div className="flex-1 h-[1px] bg-app-border" />
                            </div>

                            <div className="grid grid-cols-5 gap-2">
                                {mergedData.map((d, i) => (
                                    <DeltaCard key={d.subject} d={d} delta={deltas[i]} />
                                ))}
                            </div>
                        </div>

                        {/* ── FOOTER SIGNAL ── */}
                        <div className="flex justify-between items-center pt-3 border-t border-app-border text-[8px] font-black tracking-[0.3em] font-mono uppercase text-app-text-muted">
                            <span>Horizon: {horizon}D // FY{selectedYear} // 10-Pillar Analysis</span>
                            <span className="flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full inline-block animate-pulse" style={{ background: SECONDARY }} />
                                Benchmark_Engine: Online
                            </span>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
};

export default memo(RadarComparison);
