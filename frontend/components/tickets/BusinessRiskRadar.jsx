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
    { id: '1W', label: '1 Week',    short: '1W', color: 'var(--color-kinetic-secondary)', mult: 0.95 },
    { id: '1M', label: '1 Month',   short: '1M', color: 'var(--color-kinetic-primary)',   mult: 1.0  },
    { id: '1Q', label: '1 Quarter', short: '1Q', color: 'var(--color-kinetic-cyan)',      mult: 0.88 },
    { id: '1Y', label: '1 Year',    short: '1Y', color: 'var(--color-kinetic-gold)',      mult: 0.75 },
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

    const tickColor = 'var(--text-muted)';
    const gridColor = 'var(--border-main)';

    if (data.length === 0) return null;

    return (        <div className="bg-app-surface ring-1 ring-black/5 dark:ring-white/5 p-8 relative overflow-hidden group h-full flex flex-col rounded-2xl border border-transparent shadow-sm">
            <div className="kinetic-scan-line" />
            <div className="absolute top-0 left-0 w-full h-[2px] opacity-40 transition-all duration-700 shadow-[0_0_15px_rgba(var(--color-app-primary-rgb),0.5)]"
                 style={{ backgroundColor: activeTf.color }} />
            <div className="absolute inset-0 pointer-events-none opacity-[0.05] transition-colors duration-700"
                 style={{ backgroundImage: `radial-gradient(${activeTf.color} 1px, transparent 1px)`, backgroundSize: '30px 30px' }} />

            {/* Header Row */}
            <div className="flex items-start justify-between mb-8 relative z-10 w-full gap-6">
                <div className="flex-shrink-0">
                    <h4 className="text-2xl font-bold flex items-center gap-4 text-app-text tracking-tight uppercase">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500"
                             style={{ backgroundColor: `${activeTf.color}1A`, color: activeTf.color }}>
                            <Target size={20} className="animate-pulse" />
                        </div>
                        Strategic <span style={{ color: activeTf.color }} className="ml-2">Risk</span> Radar
                    </h4>
                    <p className="text-xs font-medium text-app-text-muted mt-2">
                        Global Performance Topology
                    </p>
                </div>

                {/* Controls */}
                <div className="flex items-center flex-shrink-0">
                    <div className="relative min-w-[160px]">
                        <select
                            value={selectedPeriodIdx}
                            onChange={e => handlePeriodChange(Number(e.target.value))}
                            className="w-full appearance-none bg-app-surface/50 ring-1 ring-black/5 dark:ring-white/5 rounded-md border-none px-3 py-1.5 text-xs font-semibold text-app-text pr-8 focus:outline-none focus:ring-2 transition-all cursor-pointer"
                            style={{ color: activeTf.color }}
                        >
                            {periodOptions.map((o, i) => <option key={i} value={i} className="bg-app-surface text-app-text font-sans">{o.label}</option>)}
                        </select>
                        <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: activeTf.color }} />
                    </div>
                </div>
            </div>

            {/* Radar Chart */}
            <div className="relative flex-grow flex items-center justify-center min-h-[340px]">
                {/* Central Score Node */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
                    <div className="w-24 h-24 rounded-full bg-app-obsidian/90 backdrop-blur-3xl border border-app-border flex flex-col items-center justify-center shadow-2xl scale-90 group-hover:scale-100 transition-all duration-700 relative overflow-hidden">
                        <div className="absolute inset-0 rounded-full animate-ping opacity-10 transition-colors duration-700" style={{ backgroundColor: activeTf.color }} />
                        <span className="text-[8px] font-semibold text-app-text-muted uppercase tracking-widest mb-1">Health</span>
                        <div className="flex items-baseline gap-1">
                            <span className="text-3xl font-bold text-app-text leading-none">{safeCompliance.toFixed(0)}</span>
                            <span className="text-sm font-bold transition-colors duration-700" style={{ color: activeTf.color }}>%</span>
                        </div>
                    </div>
                </div>

                <div className="absolute inset-0 z-10">
                    <ResponsiveContainer width="100%" height="100%">
                        <RadarChart cx="50%" cy="50%" outerRadius="80%" data={data}>
                            <PolarGrid stroke={gridColor} strokeDasharray="4 4" strokeOpacity={0.3} />
                             <PolarAngleAxis dataKey="subject"
                                 onClick={(data) => onOpenAudit && onOpenAudit(data.value)}
                                 style={{ cursor: 'pointer' }}
                                 tick={{ fill: tickColor, fontSize: 11, fontWeight: 600 }} />
                            <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                            <Radar name="Benchmark" dataKey="fullMark" stroke={gridColor} fill="transparent" strokeWidth={1} strokeDasharray="6 6" strokeOpacity={0.4} />
                            <Radar name="Health" dataKey="load"
                                stroke={activeTf.color} fill="url(#radarGradient)" fillOpacity={0.6} strokeWidth={4}
                                dot={{ r: 5, fill: activeTf.color, stroke: 'var(--bg-app-obsidian)', strokeWidth: 2 }}
                                activeDot={{ r: 8, fill: activeTf.color, stroke: '#fff', strokeWidth: 2 }}
                                animationDuration={1000}
                                style={{ transition: 'stroke 700ms ease, fill 700ms ease' }} />
                            <defs>
                                <linearGradient id="radarGradient" x1="0" y1="0" x2="1" y2="1">
                                    <stop offset="5%"  stopColor={activeTf.color} stopOpacity={1} style={{ transition: 'stop-color 700ms ease' }} />
                                    <stop offset="95%" stopColor={activeTf.color} stopOpacity={0.1} style={{ transition: 'stop-color 700ms ease' }} />
                                </linearGradient>
                            </defs>
                        </RadarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Bottom Signal Grid */}
            <div className="mt-8 grid grid-cols-3 gap-4 border-t border-app-border/20 pt-8 relative z-10">
                {[
                    { icon: Zap,    label: 'Velocity',  value: `${Math.floor(92 * activeTf.mult)}%`, animated: true },
                    { icon: Shield, label: 'Trust_Sig', value: { '1W': 'A++', '1M': 'A+', '1Q': 'A', '1Y': 'B+' }[activeTf.id] },
                    { icon: Shield, label: 'Stability', value: `${(Math.floor(99.9 * activeTf.mult * 10) / 10)}%` },
                ].map(({ icon: Icon, label, value, animated }) => (
                    <div key={label} className="flex flex-col items-center p-4 rounded-none hover:bg-app-surface/40 transition-all duration-500 border border-transparent hover:border-app-border group/detail">
                        <div className="flex items-center gap-3 mb-2 transition-colors duration-500" style={{ color: activeTf.color }}>
                            <Icon size={16} className={`opacity-80 ${animated ? 'animate-pulse' : ''}`} />
                            <span className="text-[10px] font-semibold uppercase tracking-widest text-app-text-muted italic group-hover/detail:text-app-text transition-colors">{label}</span>
                        </div>
                        <span className="text-2xl font-bold text-app-text tabular-nums tracking-tight transition-all duration-500">{value}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default memo(BusinessRiskRadar);
