import React, { useState, useEffect, useMemo, memo } from 'react';
import {
    ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer, Cell
} from 'recharts';
import { BarChart2 } from 'lucide-react';
import apiClient from '@/lib/apiClient';
import { getHorizonConfig } from '@/utils/horizonConfigs';

// ── Helpers ─────────────────────────────────────────────────────────────────
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const WEEKS  = Array.from({ length: 13 }, (_, i) => `W${i + 1}`);
const QTR    = ['Q1','Q2','Q3','Q4'];

function buildFallback(granularity) {
    if (granularity === 'weekly') {
        return WEEKS.map((label, i) => ({
            label,
            volume: Math.floor(Math.random() * 30 + 5),
            sla_compliance: Math.floor(Math.random() * 20 + 75),
        }));
    }
    if (granularity === 'quarterly' || granularity === 'annual') {
        return QTR.map((label) => ({
            label,
            volume: Math.floor(Math.random() * 120 + 40),
            sla_compliance: Math.floor(Math.random() * 15 + 78),
        }));
    }
    // Default: monthly — 12 points
    return MONTHS.map((label) => ({
        label,
        volume: Math.floor(Math.random() * 50 + 10),
        sla_compliance: Math.floor(Math.random() * 20 + 75),
    }));
}

// ── Tooltip ──────────────────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
        <div className="bg-app-obsidian p-4 border border-app-border shadow-2xl rounded-none min-w-[160px] backdrop-blur-md">
            <p className="text-[10px] font-black uppercase tracking-widest text-app-primary mb-3 border-b border-app-border pb-2">{label}</p>
            {payload.map((p) => (
                <div key={p.dataKey} className="flex justify-between gap-4">
                    <span className="text-[11px] font-bold" style={{ color: p.color }}>{p.name}</span>
                    <span className="text-[11px] font-black text-app-text">
                        {p.dataKey === 'sla_compliance' ? `${p.value ?? '—'}%` : p.value}
                    </span>
                </div>
            ))}
        </div>
    );
};

// ── Main Component ────────────────────────────────────────────────────────────
const StrategicTrendChart = ({ horizon = 30, selectedYear = new Date().getFullYear() }) => {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [usedFallback, setUsedFallback] = useState(false);

    const config     = getHorizonConfig(horizon);
    const activeGran = config.granularity;

    useEffect(() => {
        let mounted = true;
        setLoading(true);
        setUsedFallback(false);

        const fetchData = async () => {
            try {
                const res = await apiClient.getTicketTrendSeries(activeGran, selectedYear);
                const series = (res?.series || []).map(row => ({
                    ...row,
                    label: row.label || `P${row.bucket}`,
                }));
                // If backend returns < 2 data points, supplement with fallback
                if (mounted) {
                    if (series.length >= 2) {
                        setData(series);
                    } else {
                        setData(buildFallback(activeGran));
                        setUsedFallback(true);
                    }
                }
            } catch {
                if (mounted) {
                    setData(buildFallback(activeGran));
                    setUsedFallback(true);
                }
            } finally {
                if (mounted) setLoading(false);
            }
        };

        fetchData();
        return () => { mounted = false; };
    }, [activeGran, selectedYear]);

    const barColor = (sla) => {
        if (!sla) return 'var(--text-muted)';
        if (sla >= 95) return 'var(--color-kinetic-secondary)';
        if (sla >= 80) return 'var(--color-kinetic-gold)';
        return 'var(--color-kinetic-rose)';
    };

    const barSize = useMemo(() => {
        if (activeGran === 'weekly')   return 16;
        if (activeGran === 'monthly')  return 36;
        if (activeGran === 'quarterly') return 60;
        return 60; // Default/Annual
    }, [activeGran]);

    return (
        <div className="bg-app-surface ring-1 ring-black/5 dark:ring-white/5 p-8 relative overflow-hidden flex flex-col h-full min-h-[400px] rounded-2xl border border-transparent shadow-sm">
            <div className="kinetic-scan-line" />
            <div className="absolute top-0 left-0 w-full h-[2px] opacity-40 bg-app-primary shadow-[0_0_15px_rgba(var(--color-app-primary-rgb),0.5)]" />

            <div className="flex items-center justify-between mb-8 relative z-10">
                <div>
                    <h4 className="text-2xl font-bold tracking-tight text-app-text uppercase flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-app-primary/10 text-app-primary flex flex-shrink-0 items-center justify-center">
                            <BarChart2 size={20} />
                        </div>
                        Strategic <span className="text-app-primary ml-1">Performance</span> Trend
                    </h4>
                    <p className="text-xs font-medium text-app-text-muted mt-2 block">
                        {config.label} Volume &amp; SLA Compliance
                        {usedFallback && <span className="ml-3 text-app-gold opacity-60">!!_SIMULATED_FEED_!!</span>}
                    </p>
                </div>
            </div>

            <div className="flex-grow min-h-[300px] relative z-10">
                {loading ? (
                    <div className="flex items-center justify-center h-full">
                        <div className="animate-spin rounded-none h-8 w-8 border-b-2 border-app-primary" />
                    </div>
                ) : (
                    <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={data} margin={{ top: 10, right: 20, bottom: 0, left: -20 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-main)" vertical={false} strokeOpacity={0.4} />
                            <XAxis
                                dataKey="label"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: 'var(--text-muted)', fontSize: 11, fontWeight: 600 }}
                                interval="preserveStartEnd"
                            />
                            <YAxis
                                yAxisId="left"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: 'var(--text-muted)', fontSize: 11, fontWeight: 600 }}
                            />
                            <YAxis
                                yAxisId="right"
                                orientation="right"
                                domain={[0, 100]}
                                hide
                            />
                            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--bg-app-obsidian)', fillOpacity: 0.2 }} />
                            <Bar
                                yAxisId="left"
                                dataKey="volume"
                                name="Volume"
                                radius={[4, 4, 0, 0]}
                                barSize={barSize}
                            >
                                {data.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={barColor(entry.sla_compliance)} fillOpacity={0.85} />
                                ))}
                            </Bar>
                            <Line
                                yAxisId="right"
                                type="monotone"
                                dataKey="sla_compliance"
                                name="SLA %"
                                stroke="var(--color-kinetic-primary)"
                                strokeWidth={3}
                                dot={{ r: 0 }}
                                activeDot={{ r: 4, fill: 'var(--color-kinetic-primary)', stroke: 'var(--bg-app-obsidian)', strokeWidth: 2 }}
                            />
                        </ComposedChart>
                    </ResponsiveContainer>
                )}
            </div>

            {/* Legend */}
            <div className="flex items-center gap-8 mt-6 pt-6 border-t border-app-border/20 relative z-10">
                <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full inline-block shadow-[0_0_10px_rgba(78,222,163,0.3)]" style={{ backgroundColor: 'var(--color-kinetic-secondary)' }} />
                    <span className="text-xs font-medium text-app-text-muted">SLA Optimal (≥ 95%)</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full inline-block shadow-[0_0_10px_rgba(251,191,36,0.3)]" style={{ backgroundColor: 'var(--color-kinetic-gold)' }} />
                    <span className="text-xs font-medium text-app-text-muted">SLA Stable (80–95%)</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full inline-block shadow-[0_0_10px_rgba(248,113,113,0.3)]" style={{ backgroundColor: 'var(--color-kinetic-rose)' }} />
                    <span className="text-xs font-medium text-app-text-muted">SLA Critical (&lt; 80%)</span>
                </div>
                <div className="flex items-center gap-3 ml-auto">
                    <span className="w-8 h-[2px] inline-block rounded-full bg-app-primary shadow-[0_0_10px_rgba(var(--color-app-primary-rgb),0.5)]" />
                    <span className="text-xs font-medium text-app-text-muted">Trend</span>
                </div>
            </div>
        </div>
    );
};

export default memo(StrategicTrendChart);
