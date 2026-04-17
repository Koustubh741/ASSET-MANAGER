import { useState, useEffect } from 'react'
import { 
    BarChart, 
    Layers, 
    Smartphone, 
    TrendingUp, 
    Briefcase, 
    Target, 
    Monitor,
    Share2,
    CalendarDays
} from 'lucide-react'
import apiClient from '@/lib/apiClient'
import { useRole } from '@/contexts/RoleContext'
import QuickActionGrid from './QuickActionGrid'

export default function CorporateStrategyDashboard() {
    const { user } = useRole()
    const [stats, setStats] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const data = await apiClient.get('/departments/stats')
                setStats(data)
                setLoading(false)
            } catch (error) {
                console.error('Failed to fetch stats:', error)
                setLoading(false)
            }
        }
        fetchStats()
    }, [])

    if (loading) return (
        <div className="flex h-64 items-center justify-center">
            <div className="w-8 h-8 rounded-full border-4 border-cyan-500/30 border-t-cyan-500 animate-spin"></div>
        </div>
    )

    const CorpStat = ({ label, value, icon: Icon, color }) => (
        <div className="glass-card p-6 border border-app-border hover:border-cyan-500/30 transition-all group overflow-hidden relative">
            <div className={`absolute -right-8 -top-8 w-24 h-24 rounded-full bg-${color}-500 opacity-5 blur-2xl group-hover:opacity-10 transition-opacity`}></div>
            <div className="relative z-10 flex items-center gap-4">
                <div className={`p-3 rounded-none bg-${color}-500/10 border border-${color}-500/20 text-${color}-500`}>
                    <Icon size={24} />
                </div>
                <div>
                    <div className="text-2xl font-black text-app-text uppercase tracking-tighter">{value}</div>
                    <div className="text-[10px] font-black text-app-text-muted uppercase tracking-widest">{label}</div>
                </div>
            </div>
        </div>
    )

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="relative">
                <div className="absolute -left-6 top-1 bottom-1 w-1.5 bg-cyan-600 rounded-full shadow-[0_0_15px_rgba(8,145,178,0.5)]"></div>
                <h2 className="text-2xl font-black text-app-text uppercase tracking-tighter">
                    <span className="text-cyan-500">Corporate Strategy</span> & Development
                </h2>
                <p className="text-[10px] font-black text-app-text-muted uppercase tracking-[0.3em] mt-1 flex items-center gap-2">
                    <Target size={12} className="text-cyan-500" /> Planning, Marketing, Projects & Business Dev
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <CorpStat label="BD Laptops & Surfaces" value="38" icon={Briefcase} color="cyan" />
                <CorpStat label="Active SaaS Stacks" value="24" icon={Layers} color="rose" />
                <CorpStat label="Field Mobility Pool" value="112" icon={Smartphone} color="blue" />
                <CorpStat label="Project Run-Rate" value="₹12.4m" icon={TrendingUp} color="emerald" />
            </div>

            <QuickActionGrid />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Application Stack */}
                <div className="lg:col-span-2 glass-panel p-8 border border-app-border shadow-2xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/5 blur-[100px] rounded-full group-hover:bg-cyan-500/10 transition-all duration-700"></div>
                    
                    <div className="flex justify-between items-center mb-8 relative z-10">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-none bg-cyan-500/10 text-cyan-500">
                                <Share2 size={20} />
                            </div>
                            <h3 className="text-xl font-black text-app-text uppercase tracking-tight">SaaS & Tooling Suite</h3>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10">
                        {[
                            { name: 'Salesforce Enterprise', dep: 'BD & Planning', usage: 'High', color: 'blue', icon: Monitor },
                            { name: 'HubSpot Marketing Hub', dep: 'Marketing', usage: 'High', color: 'orange', icon: BarChart },
                            { name: 'Microsoft Enterprise', dep: 'Projects', usage: 'Stable', color: 'emerald', icon: Share2 },
                            { name: 'ClickUp & Jira', dep: 'Cross-functional', usage: 'Medium', color: 'rose', icon: CalendarDays },
                        ].map((sw, i) => (
                            <div key={i} className="flex items-center gap-4 p-5 rounded-none bg-slate-50 dark:bg-white/[0.02] border border-app-border">
                                <div className={`p-3 bg-${sw.color}-500/10 text-${sw.color}-500`}>
                                    <sw.icon size={20} />
                                </div>
                                <div>
                                    <div className="text-[11px] font-black text-app-text uppercase tracking-tight">{sw.name}</div>
                                    <div className="text-[9px] font-bold text-app-text-muted uppercase tracking-widest leading-loose">{sw.dep}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Hardware Integrity */}
                <div className="glass-panel p-8 border border-app-border shadow-2xl flex flex-col">
                    <h3 className="text-xl font-black text-app-text uppercase tracking-tight mb-8">Hardware Integrity</h3>
                    <div className="space-y-6 flex-1">
                        {[
                            { hw: 'MacBook Pros', count: 18, color: 'blue' },
                            { hw: 'Surface Pro Tablets', count: 42, color: 'emerald' },
                            { hw: 'Mobile Demo Kits', count: 14, color: 'amber' },
                        ].map((item, i) => (
                            <div key={i} className="space-y-2">
                                <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-app-text">
                                    <span>{item.hw}</span>
                                    <span className={`text-${item.color}-500`}>{item.count} Active</span>
                                </div>
                                <div className="h-1.5 w-full bg-app-surface-soft rounded-full overflow-hidden">
                                    <div className={`h-full bg-${item.color}-500 w-full`} />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
            
            <div className="flex flex-wrap gap-4">
                <button className="px-6 py-3 rounded-none bg-cyan-600 text-app-text text-[10px] font-black uppercase tracking-widest shadow-lg shadow-cyan-600/30 hover:scale-105 active:scale-95 transition-all">
                    Allocate New Project Fleet
                </button>
            </div>
        </div>
    )
}
