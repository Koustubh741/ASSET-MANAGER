import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts'

const COLORS = [
    'var(--color-kinetic-primary)',
    'var(--color-kinetic-secondary)',
    'var(--color-kinetic-gold)',
    'var(--color-kinetic-rose)',
    'var(--color-kinetic-cyan)',
    'var(--color-kinetic-accent)',
    'var(--color-kinetic-primary-soft)'
];

const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-app-obsidian border border-app-border p-4 rounded-none shadow-2xl backdrop-blur-md">
                <p className="text-app-text-muted font-black text-[10px] uppercase tracking-widest mb-2 border-b border-app-border pb-1">{payload[0].name}</p>
                <p className="text-app-text font-black text-xl font-['Outfit']">
                    {payload[0].value} <span className="text-app-primary text-[10px] font-black uppercase tracking-widest ml-1">UNITS</span>
                </p>
            </div>
        )
    }
    return null
}

export default function CustomPieChart({ data, onPieClick, minAngle }) {
    if (!data || data.length === 0) return (
        <div className="flex items-center justify-center h-full text-app-text-muted">
            No data available
        </div>
    )

    return (
        <ResponsiveContainer width="100%" height="100%">
            <PieChart>
                <Pie
                    data={data}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    fill="#8884d8"
                    paddingAngle={5}
                    dataKey="value"
                    minAngle={minAngle != null ? minAngle : 0}
                    onClick={data => data && onPieClick && onPieClick(data)}
                >
                    {data.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="rgba(0,0,0,0)" cursor="pointer" />
                    ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend
                    verticalAlign="bottom"
                    height={36}
                    iconType="rect"
                    formatter={(value) => <span className="text-app-text-muted text-[10px] font-black uppercase tracking-widest ml-2">{value}</span>}
                />
            </PieChart>
        </ResponsiveContainer>
    )
}
