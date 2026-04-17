import { useState, useEffect } from 'react'
import { 
    Scissors, 
    Palette, 
    Shirt, 
    Image, 
    PenTool, 
    ShoppingBag, 
    Briefcase
} from 'lucide-react'
import apiClient from '@/lib/apiClient'
import { useRole } from '@/contexts/RoleContext'
import QuickActionGrid from './QuickActionGrid'

export default function BMDashboard() {
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
                console.error('Failed to fetch B&M stats:', error)
                setLoading(false)
            }
        }
        fetchStats()
    }, [])

    if (loading) return (
        <div className="flex h-64 items-center justify-center">
            <div className="w-8 h-8 rounded-full border-4 border-fuchsia-500/30 border-t-fuchsia-500 animate-spin"></div>
        </div>
    )

    const BMStat = ({ label, value, icon: Icon, color }) => (
        <div className="glass-card p-6 border border-app-border hover:border-fuchsia-500/30 transition-all group overflow-hidden relative">
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
                <div className="absolute -left-6 top-1 bottom-1 w-1.5 bg-fuchsia-600 rounded-full shadow-[0_0_15px_rgba(192,38,211,0.5)]"></div>
                <h2 className="text-2xl font-black text-app-text uppercase tracking-tighter">
                    <span className="text-fuchsia-500">Buying & Merchandising</span> Design
                </h2>
                <p className="text-[10px] font-black text-app-text-muted uppercase tracking-[0.3em] mt-1 flex items-center gap-2">
                    <Palette size={12} className="text-fuchsia-500" /> CAD Stations & Creative Tooling Allocation
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <BMStat label="Active CAD Workstations" value="84" icon={Image} color="fuchsia" />
                <BMStat label="Pattern Masters" value="12" icon={Scissors} color="blue" />
                <BMStat label="Adobe / Corel Licenses" value="142" icon={PenTool} color="rose" />
                <BMStat label="Pending Upgrades" value="6" icon={Briefcase} color="amber" />
            </div>

            <QuickActionGrid />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 glass-panel p-8 border border-app-border shadow-2xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-fuchsia-500/5 blur-[100px] rounded-full group-hover:bg-fuchsia-500/10 transition-all duration-700"></div>
                    
                    <div className="flex justify-between items-center mb-8 relative z-10">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-none bg-fuchsia-500/10 text-fuchsia-500">
                                <Shirt size={20} />
                            </div>
                            <h3 className="text-xl font-black text-app-text uppercase tracking-tight">Specialty Asset Fleet</h3>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10">
                        {[
                            { cat: 'High-End CAD Machines', count: 42, health: '98%', color: 'emerald' },
                            { cat: 'Color-Calibrated Monitors', count: 60, health: '85%', color: 'amber' },
                            { cat: 'Wacom Tablets', count: 18, health: '100%', color: 'blue' },
                            { cat: 'Pattern Plotter Arrays', count: 4, health: '75%', color: 'rose' },
                        ].map((hw, i) => (
                            <div key={i} className="p-5 rounded-none bg-slate-50 dark:bg-white/[0.02] border border-app-border hover:bg-slate-100 dark:hover:bg-white/[0.04] transition-all group/hw">
                                <div className="text-[11px] font-black text-app-text uppercase tracking-widest">{hw.cat}</div>
                                <div className="text-[18px] font-black text-fuchsia-500 my-1">{hw.count} Units</div>
                                <div className="flex justify-between items-end mt-2">
                                    <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Fleet Health</div>
                                    <div className={`text-[10px] font-black text-${hw.color}-500`}>{hw.health}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="glass-panel p-8 border border-app-border shadow-2xl flex flex-col">
                    <h3 className="text-xl font-black text-app-text uppercase tracking-tight mb-8">Creative Software</h3>
                    <div className="space-y-6 flex-1">
                        {[
                            { sw: 'Adobe Creative Cloud', active: 110, total: 120, color: 'rose' },
                            { sw: 'CorelDraw Exec', active: 20, total: 20, color: 'amber' },
                            { sw: 'Tukatech / CAD SW', active: 40, total: 45, color: 'blue' },
                        ].map((sw, i) => (
                            <div key={i} className="space-y-2">
                                <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                                    <span className="text-app-text">{sw.sw}</span>
                                    <span className={`text-${sw.color}-500`}>{sw.active}/{sw.total}</span>
                                </div>
                                <div className="h-1.5 w-full bg-app-surface-soft rounded-full overflow-hidden">
                                    <div className={`h-full bg-${sw.color}-500`} style={{ width: `${(sw.active/sw.total)*100}%` }} />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
            
            <div className="flex flex-wrap gap-4">
                <button className="px-6 py-3 rounded-none bg-fuchsia-600 text-app-text text-[10px] font-black uppercase tracking-widest shadow-lg shadow-fuchsia-500/30 hover:scale-105 active:scale-95 transition-all">
                    Request Graphics Upgrade
                </button>
            </div>
        </div>
    )
}
