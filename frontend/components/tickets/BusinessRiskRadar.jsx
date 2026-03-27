import React, { memo, useState, useEffect, useMemo, useCallback } from 'react';
import { 
    Radar, RadarChart, PolarGrid, 
    PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer 
} from 'recharts';
import { Shield, Target, Zap, ChevronDown } from 'lucide-react';

// --- ISO calendar helpers ---
function getISOWeek(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

function getCalendarPeriod(tfId) {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    let start, end, days;

    if (tfId === '1W') {
        // This ISO week: Monday → Sunday
        const day = now.getDay() || 7;
        start = new Date(now);
        start.setDate(now.getDate() - day + 1);
        start.setHours(0, 0, 0, 0);
        end = new Date(start);
        end.setDate(start.getDate() + 6);
        end.setHours(23, 59, 59, 999);
        days = 7;
    } else if (tfId === '1M') {
        start = new Date(year, month, 1);
        end = new Date(year, month + 1, 0, 23, 59, 59, 999);
        days = end.getDate();
    } else if (tfId === '1Q') {
        const q = Math.floor(month / 3);
        start = new Date(year, q * 3, 1);
        end = new Date(year, q * 3 + 3, 0, 23, 59, 59, 999);
        days = 90;
    } else {
        // 1Y = this calendar year
        start = new Date(year, 0, 1);
        end = new Date(year, 11, 31, 23, 59, 59, 999);
        days = 365;
    }

    return { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10), days };
}

function buildHistoricalOptions(tfId) {
    const now = new Date();
    const year = now.getFullYear();
    const options = [];

    if (tfId === '1W') {
        for (let i = 0; i < 13; i++) {
            const d = new Date(now);
            d.setDate(d.getDate() - i * 7);
            const day = d.getDay() || 7;
            const wStart = new Date(d); wStart.setDate(d.getDate() - day + 1); wStart.setHours(0,0,0,0);
            const wEnd = new Date(wStart); wEnd.setDate(wStart.getDate() + 6);
            const wNum = getISOWeek(wStart);
            const wYear = wStart.getFullYear();
            options.push({
                label: i === 0 ? `This Week (W${wNum})` : `Week ${wNum}, ${wYear}`,
                start: wStart.toISOString().slice(0, 10),
                end: wEnd.toISOString().slice(0, 10),
                days: 7,
                isCalendar: true,
            });
        }
    } else if (tfId === '1M') {
        const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        for (let i = 0; i < 12; i++) {
            const d = new Date(year, now.getMonth() - i, 1);
            const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0);
            options.push({
                label: i === 0 ? `This Month (${MONTHS[d.getMonth()]})` : `${MONTHS[d.getMonth()]} ${d.getFullYear()}`,
                start: d.toISOString().slice(0, 10),
                end: lastDay.toISOString().slice(0, 10),
                days: lastDay.getDate(),
                isCalendar: true,
            });
        }
    } else if (tfId === '1Q') {
        const q = Math.floor(now.getMonth() / 3);
        for (let i = 0; i < 8; i++) {
            const qIdx = ((q - i) % 4 + 4) % 4;
            const qYear = year - Math.floor((i + (q < 0 ? 4 + q : 0)) / 4);
            const start = new Date(qYear, qIdx * 3, 1);
            const end = new Date(qYear, qIdx * 3 + 3, 0, 23, 59, 59);
            options.push({
                label: i === 0 ? `This Quarter (Q${qIdx + 1})` : `Q${qIdx + 1} ${qYear}`,
                start: start.toISOString().slice(0, 10),
                end: end.toISOString().slice(0, 10),
                days: 90,
                isCalendar: true,
            });
        }
    } else {
        for (let y = year; y >= year - 4; y--) {
            options.push({
                label: y === year ? `This Year (${y})` : String(y),
                start: `${y}-01-01`,
                end: `${y}-12-31`,
                days: 365,
                isCalendar: true,
            });
        }
    }

    return options;
}

const TIMEFRAMES = [
    { id: '1W', label: '1 Week',    short: '1W', color: '#10b981', mult: 0.95 },
    { id: '1M', label: '1 Month',   short: '1M', color: '#3b82f6', mult: 1.0  },
    { id: '1Q', label: '1 Quarter', short: '1Q', color: '#6366f1', mult: 0.88 },
    { id: '1Y', label: '1 Year',    short: '1Y', color: '#f59e0b', mult: 0.75 },
];

/**
 * BusinessRiskRadar v5.0
 * - Strict calendar periods (This Week, This Month, This Quarter, This Year)
 * - Historical period dropdown per timeframe
 * - Live backend refetch on period change
 */
const BusinessRiskRadar = ({ horizon, selectedYear, onOpenAudit, load, compliance, riskDimensions }) => {
    const activeTf = useMemo(() => {
        const tf = TIMEFRAMES.find(t => t.id === (horizon === 7 ? '1W' : horizon === 90 ? '1Q' : horizon === 365 ? '1Y' : '1M'));
        return tf || TIMEFRAMES[1];
    }, [horizon]);

    const [selectedPeriodIdx, setSelectedPeriodIdx] = useState(0);

    // Reset period index when timeframe changes
    useEffect(() => {
        setSelectedPeriodIdx(0);
    }, [activeTf.id]);

    const periodOptions = useMemo(() => buildHistoricalOptions(activeTf.id), [activeTf.id]);
    const selectedPeriod = periodOptions[selectedPeriodIdx] || periodOptions[0];

    const triggerFetch = useCallback((period) => {
        if (typeof window !== 'undefined' && window.fetchExecutiveSummary) {
            window.fetchExecutiveSummary(period.days, period.start, period.end);
        }
    }, []);

    const handlePeriodChange = (idx) => {
        setSelectedPeriodIdx(idx);
        const period = periodOptions[idx];
        if (period) triggerFetch(period);
    };

    // Root Fix: safe parsing
    const parsedCompliance = parseFloat(String(compliance || '89').replace(/[^0-9.]/g, ''));
    const safeCompliance = isNaN(parsedCompliance) ? 89 : parsedCompliance;

    const strategicDimensions = riskDimensions || [
        { subject: 'Security',       value: 88,  fullMark: 100 },
        { subject: 'Infrastructure', value: 94,  fullMark: 100 },
        { subject: 'Velocity',       value: (load && Object.keys(load).length > 0) ? 92 : 0, fullMark: 100 },
        { subject: 'Cost Efficiency',value: safeCompliance > 90 ? 85 : 72, fullMark: 100 },
        { subject: 'Compliance',     value: safeCompliance, fullMark: 100 },
    ];

    const data = strategicDimensions.map(dim => {
        const adj = dim.subject === 'Compliance' ? safeCompliance : Math.min(100, dim.value * activeTf.mult);
        return { ...dim, load: adj, compliance: Math.max(0, adj - 10) };
    });

    const isDark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
    const tickColor = isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.5)';
    const gridColor = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';

    if (data.length === 0) return null;

    return (
        <div className="glass p-8 relative overflow-hidden group h-full flex flex-col">
            <div className="absolute top-0 left-0 w-full h-1 opacity-40 transition-all duration-700"
                 style={{ backgroundColor: activeTf.color, boxShadow: `0 0 20px ${activeTf.color}80` }} />
            <div className="absolute inset-0 pointer-events-none opacity-[0.03] transition-colors duration-700"
                 style={{ backgroundImage: `radial-gradient(${activeTf.color} 1px, transparent 1px)`, backgroundSize: '20px 20px' }} />

            {/* Header Row */}
            <div className="flex items-start justify-between mb-4 relative z-10 w-full gap-4">
                <div className="flex-shrink-0">
                    <h4 className="text-xl font-['Outfit'] font-black flex items-center gap-3 text-app-text tracking-tight italic">
                        <div className="p-2 rounded-xl border transition-colors duration-500"
                             style={{ backgroundColor: `${activeTf.color}15`, borderColor: `${activeTf.color}30`, color: activeTf.color }}>
                            <Target size={22} className="animate-pulse" />
                        </div>
                        Strategic Risk Radar
                    </h4>
                    <p className="text-[10px] text-app-text-muted font-black uppercase tracking-[0.4em] mt-2 opacity-50">
                        Global Performance Topology · v5.0
                    </p>
                </div>

                {/* Controls */}
                <div className="flex flex-col items-end gap-2 flex-shrink-0">
                    {/* Signal status */}
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black uppercase tracking-widest transition-colors duration-500" style={{ color: activeTf.color }}>Signal Stable</span>
                        <div className="flex gap-1">
                            {[1, 0.4, 0.2].map((op, i) => (
                                <div key={i} className="w-1.5 h-1.5 rounded-full transition-colors duration-500" 
                                     style={{ backgroundColor: activeTf.color, opacity: op }} />
                            ))}
                        </div>
                    </div>
                    {/* Timeframe Control Moved to Header */}
                    {/* Historical Period Dropdown */}
                    <div className="relative w-full min-w-[180px]">
                        <select
                            value={selectedPeriodIdx}
                            onChange={e => handlePeriodChange(Number(e.target.value))}
                            className="w-full appearance-none bg-app-bg/80 border border-app-border/40 rounded-xl px-3 py-1.5 text-[10px] font-black text-app-text-muted pr-7 focus:outline-none focus:border-opacity-60 transition-colors"
                            style={{ borderColor: `${activeTf.color}40`, color: activeTf.color }}
                        >
                            {periodOptions.map((o, i) => <option key={i} value={i} style={{ color: 'inherit' }}>{o.label}</option>)}
                        </select>
                        <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: activeTf.color }} />
                    </div>
                </div>
            </div>

            {/* Radar Chart */}
            <div className="relative flex-grow flex items-center justify-center min-h-[310px]">
                {/* Central Score Node */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
                    <div className="w-28 h-28 rounded-full bg-app-bg/80 backdrop-blur-3xl border border-app-border/40 flex flex-col items-center justify-center shadow-[0_0_40px_rgba(0,0,0,0.2)] scale-90 group-hover:scale-100 transition-all duration-700">
                        <div className="absolute inset-0 rounded-full animate-ping opacity-15 transition-colors duration-700" style={{ backgroundColor: activeTf.color }} />
                        <span className="text-[10px] font-black text-app-text-muted uppercase tracking-[0.3em] mb-1">Health</span>
                        <div className="flex items-baseline gap-1">
                            <span className="text-4xl font-black text-app-text leading-none">{safeCompliance.toFixed(0)}</span>
                            <span className="text-sm font-black transition-colors duration-700" style={{ color: activeTf.color }}>%</span>
                        </div>
                        <span className="text-[8px] font-bold text-app-text-muted mt-0.5 opacity-60 max-w-[80px] text-center leading-tight">
                            {selectedPeriod?.label}
                        </span>
                    </div>
                </div>

                <div className="absolute inset-0 z-10">
                    <ResponsiveContainer width="100%" height="100%">
                        <RadarChart cx="50%" cy="50%" outerRadius="75%" data={data}>
                            <PolarGrid stroke={gridColor} strokeDasharray="3 3" />
                            <PolarAngleAxis dataKey="subject"
                                onClick={(data) => onOpenAudit && onOpenAudit(data.value)}
                                style={{ cursor: 'pointer' }}
                                tick={{ fill: tickColor, fontSize: 10, fontWeight: 900, letterSpacing: '0.05em' }} />
                            <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                            <Radar name="Benchmark" dataKey="fullMark" stroke={gridColor} fill="transparent" strokeWidth={1} strokeDasharray="4 4" />
                            <Radar name="Health" dataKey="load"
                                stroke={activeTf.color} fill="url(#radarGradient)" fillOpacity={0.5} strokeWidth={3}
                                dot={{ r: 4, fill: activeTf.color, stroke: 'var(--app-bg)', strokeWidth: 2 }}
                                activeDot={{ r: 6, fill: activeTf.color, stroke: '#fff', strokeWidth: 2 }}
                                animationDuration={900}
                                style={{ transition: 'stroke 700ms ease, fill 700ms ease' }} />
                            <defs>
                                <linearGradient id="radarGradient" x1="0" y1="0" x2="1" y2="1">
                                    <stop offset="5%"  stopColor={activeTf.color} stopOpacity={1} style={{ transition: 'stop-color 700ms ease' }} />
                                    <stop offset="95%" stopColor={activeTf.color} stopOpacity={0.2} style={{ transition: 'stop-color 700ms ease' }} />
                                </linearGradient>
                            </defs>
                        </RadarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Bottom Signal Grid */}
            <div className="mt-6 grid grid-cols-3 gap-2 border-t border-app-border/20 pt-6 relative z-10">
                {[
                    { icon: Zap,    label: 'Velocity',  value: `${Math.floor(92 * activeTf.mult)}%`, animated: true },
                    { icon: Shield, label: 'Trust',     value: { '1W': 'A+', '1M': 'A', '1Q': 'B+', '1Y': 'B' }[activeTf.id] },
                    { icon: Shield, label: 'Stability', value: `${(Math.floor(99.9 * activeTf.mult * 10) / 10)}` },
                ].map(({ icon: Icon, label, value, animated }) => (
                    <div key={label} className="flex flex-col items-center p-3 rounded-2xl hover:bg-app-bg/50 transition-all duration-300">
                        <div className="flex items-center gap-2 mb-1 transition-colors duration-500" style={{ color: activeTf.color }}>
                            <Icon size={14} className={`opacity-70 ${animated ? 'animate-pulse' : ''}`} />
                            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-app-text-muted">{label}</span>
                        </div>
                        <span className="text-lg font-black text-app-text tabular-nums transition-all duration-500">{value}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default memo(BusinessRiskRadar);
