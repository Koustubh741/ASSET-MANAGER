import { useState, useEffect } from 'react'
import { 
    ShieldAlert, 
    Camera, 
    Video, 
    CheckSquare, 
    AlertTriangle, 
    Siren, 
    MapPin, 
    UserX, 
    FileWarning,
    ShieldCheck
} from 'lucide-react'
import apiClient from '@/lib/apiClient'
import { useRole } from '@/contexts/RoleContext'
import QuickActionGrid from './QuickActionGrid'

export default function LossPreventionDashboard() {
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
                console.error('Failed to fetch LP stats:', error)
                setLoading(false)
            }
        }
        fetchStats()
    }, [])

    if (loading) return (
        <div className="flex h-64 items-center justify-center">
            <div className="w-8 h-8 rounded-full border-4 border-emerald-500/30 border-t-emerald-500 animate-spin"></div>
        </div>
    )

    const LPStat = ({ label, value, icon: Icon, color }) => (
        <div className="glass-card p-6 border border-app-border hover:border-emerald-500/30 transition-all group overflow-hidden relative">
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
                <div className="absolute -left-6 top-1 bottom-1 w-1.5 bg-emerald-600 rounded-full shadow-[0_0_15px_rgba(5,150,105,0.5)]"></div>
                <h2 className="text-2xl font-black text-app-text uppercase tracking-tighter">
                    <span className="text-emerald-500">Loss Prevention</span> & Security
                </h2>
                <p className="text-[10px] font-black text-app-text-muted uppercase tracking-[0.3em] mt-1 flex items-center gap-2">
                    <ShieldAlert size={12} className="text-emerald-500" /> Shrink Mitigation & Fleet Surveillance
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <LPStat label="Active CCTVs" value="1,240" icon={Video} color="blue" />
                <LPStat label="Open Incidents" value="14" icon={Siren} color="rose" />
                <LPStat label="Audits Conducted" value="54" icon={CheckSquare} color="emerald" />
                <LPStat label="High Risk Zones" value="3" icon={AlertTriangle} color="amber" />
            </div>

            <QuickActionGrid />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Surveillance Fleet */}
                <div className="lg:col-span-2 glass-panel p-8 border border-app-border shadow-2xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 blur-[100px] rounded-full group-hover:bg-emerald-500/10 transition-all duration-700"></div>
                    
                    <div className="flex justify-between items-center mb-8 relative z-10">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-none bg-emerald-500/10 text-emerald-500">
                                <Camera size={20} />
                            </div>
                            <h3 className="text-xl font-black text-app-text uppercase tracking-tight">CCTV Fleet Status</h3>
                        </div>
                    </div>

                    <div className="space-y-4 relative z-10">
                        {[
                            { loc: 'MUMBAI CENTRAL HUB', status: 'Optimal', uptime: '99.9%', color: 'emerald' },
                            { loc: 'PUNE STORE #02', status: 'Network Degraded', uptime: '84.2%', color: 'amber' },
                            { loc: 'DELHI DC', status: 'Optimal', uptime: '100%', color: 'blue' },
                            { loc: 'BENGALURU STORE #15', status: 'Hardware Failure', uptime: '60.0%', color: 'rose' },
                        ].map((cam, i) => (
                            <div key={i} className="flex justify-between items-center p-4 rounded-none bg-slate-50 dark:bg-white/[0.02] border border-app-border hover:bg-slate-100 dark:hover:bg-white/[0.04] transition-all">
                                <div className="flex items-center gap-4">
                                    <div className={`p-2 bg-${cam.color}-500/10 border border-${cam.color}-500/20 text-${cam.color}-500 rounded-none`}>
                                        <Camera size={16} />
                                    </div>
                                    <div>
                                        <div className="text-sm font-black text-app-text uppercase tracking-tight">{cam.loc}</div>
                                        <div className={`text-[10px] font-black uppercase tracking-widest text-${cam.color}-500 mt-1`}>{cam.status}</div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-lg font-black text-app-text">{cam.uptime}</div>
                                    <div className="text-[8px] font-black text-app-text-muted uppercase tracking-[0.2em]">Uptime</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Audit & Compliance Health */}
                <div className="glass-panel p-8 border border-app-border shadow-2xl flex flex-col">
                    <h3 className="text-xl font-black text-app-text uppercase tracking-tight mb-8">Recent Incidents</h3>
                    <div className="space-y-6 flex-1">
                        {[
                            { type: 'Stock Discrepancy', loc: 'Store #04', severity: 'HIGH', icon: AlertTriangle, color: 'rose' },
                            { type: 'Unauthorized Access', loc: 'DC Hub 2', severity: 'MEDIUM', icon: UserX, color: 'amber' },
                            { type: 'Audit Failure', loc: 'Store #11', severity: 'LOW', icon: FileWarning, color: 'slate' },
                        ].map((incident, i) => (
                            <div key={i} className={`p-4 border-l-2 border-${incident.color}-500 bg-slate-50 dark:bg-white/[0.02]`}>
                                <div className="flex justify-between items-start mb-2">
                                    <div className={`text-[9px] font-black text-${incident.color}-500 uppercase tracking-widest px-2 py-0.5 bg-${incident.color}-500/10 border border-${incident.color}-500/20`}>
                                        {incident.severity} PRIORITY
                                    </div>
                                    <incident.icon size={14} className={`text-${incident.color}-500`} />
                                </div>
                                <div className="text-sm font-black text-app-text uppercase tracking-tight mt-2">{incident.type}</div>
                                <div className="text-[10px] font-bold text-app-text-muted uppercase mt-1 flex items-center gap-1">
                                    <MapPin size={10} /> {incident.loc}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
            
            <div className="flex flex-wrap gap-4">
                <button className="px-6 py-3 rounded-none bg-emerald-600 text-app-text text-[10px] font-black uppercase tracking-widest shadow-lg shadow-emerald-500/30 hover:scale-105 active:scale-95 transition-all">
                    Log Incident
                </button>
                <button className="px-6 py-3 rounded-none bg-app-surface-soft text-app-text text-[10px] font-black uppercase tracking-widest border border-app-border hover:bg-slate-200 dark:hover:bg-white/10 transition-all">
                    Initiate Audit
                </button>
            </div>
        </div>
    )
}
