import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts'

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1']

const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-white dark:bg-slate-900 border border-slate-700 p-3 rounded-lg shadow-xl">
                <p className="text-slate-900 dark:text-slate-200 font-medium mb-1">{payload[0].name}</p>
                <p className="text-app-text font-bold text-lg">
                    {payload[0].value} <span className="text-app-text-muted text-xs font-normal">assets</span>
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
                    iconType="circle"
                    formatter={(value) => <span className="text-app-text-muted ml-1">{value}</span>}
                />
            </PieChart>
        </ResponsiveContainer>
    )
}
