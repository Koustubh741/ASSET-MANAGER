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
        <div className="glass p-4 border border-app-border/40 shadow-xl rounded-xl min-w-[160px]">
            <p className="text-[10px] font-black uppercase tracking-widest text-app-text-muted mb-2">{label}</p>
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
        if (!sla) return '#6b7280';
        if (sla >= 95) return '#10b981';
        if (sla >= 80) return '#f59e0b';
        return '#ef4444';
    };

    const barSize = useMemo(() => {
        if (activeGran === 'weekly')   return 6;
        if (activeGran === 'monthly')  return 20;
        if (activeGran === 'quarterly') return 40;
        return 40; // Default/Annual
    }, [activeGran]);

    return (
        <div className="glass p-8 relative overflow-hidden flex flex-col h-full min-h-[400px] rounded-2xl border border-app-border/30">
            <div className="absolute top-0 left-0 w-full h-1 opacity-30 bg-primary" />

            <div className="flex items-center justify-between mb-6 relative z-10">
                <div>
                    <h4 className="text-xl font-light tracking-widest text-app-text uppercase flex items-center gap-3">
                        <div className="p-2 rounded-xl border border-primary/30 bg-primary/10 text-primary">
                            <BarChart2 size={20} />
                        </div>
                        Strategic Performance Trend
                    </h4>
                    <p className="text-[10px] text-app-text-muted font-mono tracking-[0.3em] font-black mt-1 opacity-60 uppercase">
                        {config.label} Volume &amp; SLA · FY{selectedYear}
                        {usedFallback && <span className="ml-2 opacity-50">(Simulated)</span>}
                    </p>
                </div>
            </div>

            <div className="flex-grow min-h-[300px] relative z-10">
                {loading ? (
                    <div className="flex items-center justify-center h-full">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                    </div>
                ) : (
                    <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={data} margin={{ top: 10, right: 20, bottom: 0, left: -20 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.1)" vertical={false} />
                            <XAxis
                                dataKey="label"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: 'rgba(128,128,128,0.6)', fontSize: 9, fontWeight: 900 }}
                                interval="preserveStartEnd"
                            />
                            <YAxis
                                yAxisId="left"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: 'rgba(128,128,128,0.6)', fontSize: 9 }}
                            />
                            <YAxis
                                yAxisId="right"
                                orientation="right"
                                domain={[0, 100]}
                                hide
                            />
                            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(128,128,128,0.05)' }} />
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
                                stroke="var(--color-primary)"
                                strokeWidth={2.5}
                                dot={{ r: 0 }}
                                activeDot={{ r: 4, fill: 'var(--color-primary)' }}
                            />
                        </ComposedChart>
                    </ResponsiveContainer>
                )}
            </div>

            {/* Legend */}
            <div className="flex items-center gap-6 mt-4 pt-4 border-t border-app-border/20 relative z-10">
                <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-sm inline-block bg-emerald-500 opacity-80" />
                    <span className="text-[9px] font-black uppercase tracking-widest text-app-text-muted">SLA ≥ 95%</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-sm inline-block bg-amber-500 opacity-80" />
                    <span className="text-[9px] font-black uppercase tracking-widest text-app-text-muted">80–95%</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-sm inline-block bg-red-500 opacity-80" />
                    <span className="text-[9px] font-black uppercase tracking-widest text-app-text-muted">&lt; 80%</span>
                </div>
                <div className="flex items-center gap-1.5 ml-auto">
                    <span className="w-6 h-0.5 inline-block bg-primary rounded-full" />
                    <span className="text-[9px] font-black uppercase tracking-widest text-app-text-muted">SLA Trend</span>
                </div>
            </div>
        </div>
    );
};

export default memo(StrategicTrendChart);
