import { ArrowUpRight, ArrowDownRight } from 'lucide-react'

export default function AssetCard({ title, value, subtext, trend, icon: Icon, color }) {
    return (
        <div className="card hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start">
                <div>
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{title}</p>
                    <h3 className="text-2xl font-bold mt-2 text-slate-900">{value}</h3>
                </div>
                <div className={`p-2 rounded-lg ${color}`}>
                    <Icon size={20} className="text-slate-900 dark:text-white" />
                </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
                {trend && (
                    <span className={`flex items-center font-medium ${trend > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {trend > 0 ? <ArrowUpRight size={16} className="mr-1" /> : <ArrowDownRight size={16} className="mr-1" />}
                        {Math.abs(trend)}%
                    </span>
                )}
                <span className="text-slate-500 dark:text-slate-400 ml-2">{subtext}</span>
            </div>
        </div>
    )
}
