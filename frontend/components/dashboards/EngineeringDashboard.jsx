import { useState, useEffect } from 'react'
import { 
    Cpu, 
    Cloud, 
    Code, 
    Database, 
    HardDrive, 
    Terminal, 
    Activity, 
    Shield, 
    Zap, 
    Clock, 
    Server,
    Globe,
    Layers,
    Monitor,
    MousePointer,
    ExternalLink,
    CheckSquare
} from 'lucide-react'
import apiClient from '@/lib/apiClient'
import { useRole } from '@/contexts/RoleContext'
import { useToast } from '@/components/common/Toast'
import QuickActionGrid from './QuickActionGrid'

export default function EngineeringDashboard() {
    const { user } = useRole()
    const toast = useToast()
    const [stats, setStats] = useState(null)
    const [approvalsCount, setApprovalsCount] = useState(0)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const [statsData, approvalsData] = await Promise.all([
                    apiClient.get('/departments/stats'),
                    apiClient.get('/workflows/approvals')
                ])
                setStats(statsData)
                setApprovalsCount(Array.isArray(approvalsData) ? approvalsData.length : 0)
                setLoading(false)
            } catch (error) {
                console.error('Failed to fetch engineering stats:', error)
                setLoading(false)
            }
        }
        fetchStats()
    }, [])

    if (loading) return (
        <div className="flex h-64 items-center justify-center">
            <div className="w-8 h-8 rounded-full border-4 border-blue-500/30 border-t-blue-500 animate-spin"></div>
        </div>
    )

    const TechStat = ({ label, value, icon: Icon, color }) => (
        <div className="glass-card p-6 border border-app-border hover:border-blue-500/30 transition-all group overflow-hidden relative">
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
            {/* Engineering Header */}
            <div className="relative">
                <div className="absolute -left-6 top-1 bottom-1 w-1.5 bg-blue-600 rounded-full shadow-[0_0_15px_rgba(37,99,235,0.5)]"></div>
                <h2 className="text-2xl font-black text-app-text uppercase tracking-tighter">
                    Engineering <span className="text-blue-600">Operations</span> Center
                </h2>
                <p className="text-[10px] font-black text-app-text-muted uppercase tracking-[0.3em] mt-1 flex items-center gap-2">
                    <Terminal size={12} className="text-blue-500" /> Technical stack & cloud infrastructure matrix
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                <TechStat label="Dev Workstations" value={stats?.total_assets || 0} icon={Monitor} color="blue" />
                <TechStat label="Cloud Instances" value="128" icon={Cloud} color="sky" />
                <TechStat label="Deployment Health" value={`${stats?.health_score || 0}%`} icon={Zap} color="emerald" />
                <TechStat label="Critical Alerts" value={stats?.open_tickets || 0} icon={Activity} color="rose" />
                <div onClick={() => window.location.href = '/workflows'} className="cursor-pointer">
                    <TechStat label="Pending Approvals" value={approvalsCount} icon={CheckSquare} color="amber" />
                </div>
            </div>

            <QuickActionGrid />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Tech Debt & Lifecycle */}
                <div className="lg:col-span-2 glass-panel p-8 border border-app-border shadow-2xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 blur-[100px] rounded-full group-hover:bg-blue-500/10 transition-all duration-700"></div>
                    
                    <div className="flex justify-between items-center mb-8 relative z-10">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-none bg-blue-500/10 text-blue-400">
                                <Clock size={20} />
                            </div>
                            <h3 className="text-xl font-black text-app-text uppercase tracking-tight">Technical Lifecycle</h3>
                        </div>
                        <div className="text-[10px] font-black text-blue-500 uppercase tracking-widest px-3 py-1 bg-blue-500/10 border border-blue-500/20 rounded-full">
                            Legacy Risk: Moderate
                        </div>
                    </div>

                    <div className="space-y-6 relative z-10">
                        {stats?.eol_assets?.length > 0 ? (
                            stats.eol_assets.map((asset, i) => (
                                <div key={i} className="p-4 rounded-none bg-slate-50 dark:bg-white/[0.02] border border-app-border hover:bg-slate-100 dark:hover:bg-white/[0.04] transition-all">
                                    <div className="flex justify-between items-center mb-3">
                                        <div className="text-sm font-black text-app-text uppercase tracking-tight">{asset.model}</div>
                                        <div className="text-[9px] font-black uppercase text-rose-500">Critical Risk</div>
                                    </div>
                                    <div className="h-2 w-full bg-slate-200 bg-app-surface-soft rounded-full overflow-hidden">
                                        <div 
                                            className="h-full bg-rose-500 transition-all duration-1000 ease-out" 
                                            style={{ width: '15%' }}
                                        ></div>
                                    </div>
                                    <div className="mt-2 text-[8px] font-black text-app-text-muted uppercase tracking-widest">
                                        Status: {asset.status} // ID: {asset.id.slice(0, 8)}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-12">
                                <Shield className="mx-auto text-emerald-500 mb-3 opacity-20" size={32} />
                                <div className="text-[10px] font-black text-app-text-muted uppercase tracking-[0.2em]">No Technical Debt Detected</div>
                                <div className="text-[8px] font-bold text-emerald-500 uppercase mt-1">Infrastructure at 100% Health</div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Infrastructure Stack */}
                <div className="glass-panel p-8 border border-app-border shadow-2xl">
                    <h3 className="text-xl font-black text-app-text uppercase tracking-tight mb-8">Infrastructure Stack</h3>
                    <div className="grid grid-cols-2 gap-4">
                        {[
                            { name: 'Node.js', icon: Code, version: '18.x' },
                            { name: 'PostgreSQL', icon: Database, version: '15.x' },
                            { name: 'Redis', icon: Zap, version: '7.x' },
                            { name: 'Docker', icon: Layers, version: '24.x' },
                            { name: 'Kubernetes', icon: Globe, version: '1.27' },
                            { name: 'AWS S3', icon: Server, version: 'Active' },
                        ].map((stack, i) => (
                            <div key={i} className="flex flex-col items-center justify-center p-4 rounded-none bg-slate-50 dark:bg-white/[0.02] border border-app-border hover:border-blue-500/30 transition-all text-center group">
                                <stack.icon size={24} className="text-slate-400 group-hover:text-blue-500 transition-colors mb-2" />
                                <div className="text-[10px] font-black text-app-text uppercase">{stack.name}</div>
                                <div className="text-[8px] font-bold text-app-text-muted uppercase tracking-widest">{stack.version}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="flex flex-wrap gap-4">
                <button className="px-6 py-3 rounded-none bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-600/30 hover:shadow-blue-600/50 hover:scale-105 active:scale-95 transition-all">
                    Provision Dev Server
                </button>
                <button className="px-6 py-3 rounded-none bg-app-surface-soft text-app-text text-[10px] font-black uppercase tracking-widest border border-app-border hover:bg-slate-200 dark:hover:bg-white/10 transition-all">
                    Request License
                </button>
                <button className="px-6 py-3 rounded-none bg-indigo-500/10 text-indigo-400 text-[10px] font-black uppercase tracking-widest border border-indigo-500/20 hover:bg-indigo-500/20 transition-all">
                    View Technical Docs
                </button>
            </div>
        </div>
    )
}
