import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-app-obsidian border border-app-border p-4 rounded-none shadow-2xl backdrop-blur-md">
                <p className="text-app-text-muted font-black text-[10px] uppercase tracking-widest mb-3 border-b border-app-border pb-2">{label}</p>
                <div className="space-y-2">
                    {payload.map((entry, index) => (
                        <div key={index} className="flex items-center justify-between gap-8">
                            <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: entry.color }}>
                                {entry.name}
                            </span>
                            <span className="text-app-text font-black text-sm font-mono">
                                {entry.value}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        )
    }
    return null
}

export default function TrendLineChart({ data }) {
    if (!data || data.length === 0) return <div className="text-center text-app-text-muted py-10">No trend data available</div>

    return (
        <ResponsiveContainer width="100%" height="100%">
            <LineChart
                data={data}
                margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
            >
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-main)" vertical={false} strokeOpacity={0.5} />
                <XAxis
                    dataKey="name"
                    stroke="var(--text-muted)"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    dy={10}
                />
                <YAxis
                    stroke="var(--text-muted)"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    dx={-10}
                />
                 <Legend
                    verticalAlign="top"
                    height={36}
                    iconType="rect"
                    formatter={(value) => <span className="text-app-text-muted text-[10px] font-black uppercase tracking-widest ml-2">{value}</span>}
                />
                <Line
                    type="stepAfter"
                    dataKey="repaired"
                    name="Repaired"
                    stroke="var(--color-kinetic-gold)"
                    strokeWidth={3}
                    dot={{ r: 4, fill: 'var(--color-kinetic-gold)', strokeWidth: 0, stroke: 'var(--bg-app-obsidian)', strokeOpacity: 0.8 }}
                    activeDot={{ r: 6, strokeWidth: 0 }}
                />
                <Line
                    type="stepAfter"
                    dataKey="renewed"
                    name="Renewed"
                    stroke="var(--color-kinetic-primary)"
                    strokeWidth={3}
                    dot={{ r: 4, fill: 'var(--color-kinetic-primary)', strokeWidth: 0, stroke: 'var(--bg-app-obsidian)', strokeOpacity: 0.8 }}
                    activeDot={{ r: 6, strokeWidth: 0 }}
                />
            </LineChart>
        </ResponsiveContainer>
    )
}
