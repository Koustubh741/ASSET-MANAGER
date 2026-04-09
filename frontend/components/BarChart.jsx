import { BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'

export default function BarChart({ data, onBarClick }) {
    if (!data || data.length === 0) {
        return <div className="flex items-center justify-center h-full text-app-text-muted">No data available</div>
    }

    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-app-obsidian p-4 border border-app-border shadow-2xl rounded-none min-w-[160px] backdrop-blur-md">
                    <p className="text-[10px] font-black uppercase tracking-widest text-app-primary mb-3 border-b border-app-border pb-2">{label}</p>
                    <p className="text-xl font-black text-app-text font-mono flex items-baseline gap-2">
                        {payload[0].value} <span className="text-[10px] uppercase font-black text-app-text-muted tracking-widest">Units</span>
                    </p>
                </div>
            )
        }
        return null
    }

    return (
        <ResponsiveContainer width="100%" height="100%">
            <RechartsBarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-main)" opacity={0.4} />
                <XAxis
                    dataKey="name"
                    tick={{ fill: 'var(--text-muted)', fontSize: 10, fontWeight: 900, letterSpacing: '0.1em' }}
                    axisLine={false}
                    tickLine={false}
                    dy={10}
                />
                <YAxis
                    tick={{ fill: 'var(--text-muted)', fontSize: 10, fontWeight: 900 }}
                    axisLine={false}
                    tickLine={false}
                />
                <Tooltip cursor={{ fill: 'var(--bg-app-obsidian)', opacity: 0.2 }} content={<CustomTooltip />} />
                <Bar dataKey="value" radius={[0, 0, 0, 0]} onClick={data => data && onBarClick && onBarClick(data)}>
                    {data.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={[
                            'var(--color-kinetic-primary)',
                            'var(--color-kinetic-secondary)',
                            'var(--color-kinetic-gold)',
                            'var(--color-kinetic-rose)',
                            'var(--color-kinetic-cyan)'
                        ][index % 5]} cursor="pointer" />
                    ))}
                </Bar>
            </RechartsBarChart>
        </ResponsiveContainer>
    )
}
