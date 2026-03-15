import { BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'

export default function BarChart({ data, onBarClick }) {
    if (!data || data.length === 0) {
        return <div className="flex items-center justify-center h-full text-slate-500 dark:text-slate-400">No data available</div>
    }

    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            return (
                <div className="glass-panel p-3 !bg-white dark:bg-slate-900/90 !border-slate-700">
                    <p className="text-slate-900 dark:text-slate-200 font-medium mb-1">{label}</p>
                    <p className="text-blue-400 font-bold text-lg">
                        {payload[0].value} <span className="text-xs font-normal text-slate-500 dark:text-slate-400">Assets</span>
                    </p>
                </div>
            )
        }
        return null
    }

    return (
        <ResponsiveContainer width="100%" height="100%">
            <RechartsBarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.5} />
                <XAxis
                    dataKey="name"
                    tick={{ fill: '#94a3b8', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    dy={10}
                />
                <YAxis
                    tick={{ fill: '#94a3b8', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                />
                <Tooltip cursor={{ fill: '#334155', opacity: 0.2 }} content={<CustomTooltip />} />
                <Bar dataKey="value" radius={[6, 6, 0, 0]} onClick={data => data && onBarClick && onBarClick(data)}>
                    {data.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={['#60a5fa', '#818cf8', '#a78bfa', '#f472b6', '#34d399'][index % 5]} cursor="pointer" />
                    ))}
                </Bar>
            </RechartsBarChart>
        </ResponsiveContainer>
    )
}
