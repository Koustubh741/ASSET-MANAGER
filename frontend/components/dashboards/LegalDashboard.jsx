import { useState, useEffect } from 'react'
import { 
    Shield, 
    ShieldCheck,
    FileText, 
    Gavel, 
    History, 
    Scale, 
    Lock, 
    AlertCircle, 
    CheckCircle2, 
    Globe, 
    Zap,
    Search,
    ChevronRight,
    Briefcase
} from 'lucide-react'
import apiClient from '@/lib/apiClient'
import { useRole } from '@/contexts/RoleContext'
import QuickActionGrid from './QuickActionGrid'

export default function LegalDashboard() {
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
                console.error('Failed to fetch legal stats:', error)
                setLoading(false)
            }
        }
        fetchStats()
    }, [])

    if (loading) return (
        <div className="flex h-64 items-center justify-center">
            <div className="w-8 h-8 rounded-full border-4 border-indigo-500/30 border-t-indigo-500 animate-spin"></div>
        </div>
    )

    const LegalStat = ({ label, value, icon: Icon, color }) => (
        <div className="glass-card p-6 border border-app-border hover:border-indigo-500/30 transition-all group overflow-hidden relative">
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
            {/* Legal Header */}
            <div className="relative">
                <div className="absolute -left-6 top-1 bottom-1 w-1.5 bg-indigo-600 rounded-full shadow-[0_0_15px_rgba(79,70,229,0.5)]"></div>
                <h2 className="text-2xl font-black text-app-text uppercase tracking-tighter">
                    Legal & <span className="text-indigo-600">Compliance</span> GRC
                </h2>
                <p className="text-[10px] font-black text-app-text-muted uppercase tracking-[0.3em] mt-1 flex items-center gap-2">
                    <Shield size={12} className="text-indigo-500" /> Intellectual property, contracts & regulatory risk matrix
                </p>
            </div>

            {/* Core Legal Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <LegalStat label="Active Contracts" value="28" icon={FileText} color="indigo" />
                <LegalStat label="Compliance Score" value="98%" icon={Shield} color="emerald" />
                <LegalStat label="Pending Audits" value="2" icon={Gavel} color="rose" />
                <LegalStat label="IP Assets" value="142" icon={Globe} color="blue" />
            </div>

            <QuickActionGrid />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Contract & License Monitor */}
                <div className="lg:col-span-2 glass-panel p-8 border border-app-border shadow-2xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 blur-[100px] rounded-full group-hover:bg-indigo-500/10 transition-all duration-700"></div>
                    
                    <div className="flex justify-between items-center mb-8 relative z-10">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-none bg-indigo-500/10 text-indigo-500">
                                <History size={20} />
                            </div>
                            <h3 className="text-xl font-black text-app-text uppercase tracking-tight">Contract Expiry Monitor</h3>
                        </div>
                        <div className="text-[10px] font-black text-indigo-500 uppercase tracking-widest px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 rounded-full">
                            3 Expiring Soon
                        </div>
                    </div>

                    <div className="space-y-4 relative z-10">
                        {stats?.eol_assets?.length > 0 ? (
                            stats.eol_assets.map((asset, i) => (
                                <div key={i} className="flex items-center justify-between p-4 rounded-none bg-slate-50 dark:bg-white/[0.02] border border-app-border hover:bg-slate-100 dark:hover:bg-white/[0.04] transition-all">
                                    <div className="flex items-center gap-4">
                                        <div className="p-2 rounded-none bg-slate-200 bg-app-surface-soft text-slate-500">
                                            <Scale size={18} />
                                        </div>
                                        <div>
                                            <div className="text-sm font-black text-app-text uppercase tracking-tight">{asset.model}</div>
                                            <div className="text-[10px] font-bold text-app-text-muted uppercase tracking-widest leading-none mt-1">Warranty Trace: {asset.status}</div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-[10px] font-black uppercase text-rose-500 mb-1">Risk Review</div>
                                        <div className="flex items-center gap-1 justify-end">
                                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                                            <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase">High Risk</span>
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-12">
                                <ShieldCheck className="mx-auto text-emerald-500 mb-3 opacity-20" size={32} />
                                <div className="text-[10px] font-black text-app-text-muted uppercase tracking-[0.2em]">All Systems Compliant</div>
                                <div className="text-[8px] font-bold text-emerald-500 uppercase mt-1">Zero Regulatory Deviations Detected</div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Compliance & Audit */}
                <div className="glass-panel p-8 border border-app-border shadow-2xl flex flex-col">
                    <h3 className="text-xl font-black text-app-text uppercase tracking-tight mb-8">Auditor Oversight</h3>
                    <div className="space-y-6 flex-1">
                        {[
                            { title: 'SOC2 Type II', progress: 95, color: 'emerald' },
                            { title: 'ISO 27001', progress: 82, color: 'blue' },
                            { title: 'GDPR Compliance', progress: 100, color: 'indigo' },
                            { title: 'Data Privacy Audit', progress: 60, color: 'rose' },
                        ].map((item, i) => (
                            <div key={i} className="group transition-all">
                                <div className="flex justify-between items-center mb-2">
                                    <div className="text-[11px] font-black text-app-text uppercase tracking-widest">{item.title}</div>
                                    <div className={`text-[9px] font-black uppercase text-${item.color}-500`}>{item.progress}%</div>
                                </div>
                                <div className="h-2 w-full bg-slate-200 bg-app-surface-soft rounded-full overflow-hidden">
                                    <div 
                                        className={`h-full bg-${item.color}-500 transition-all duration-1000 ease-out`} 
                                        style={{ width: `${item.progress}%` }}
                                    ></div>
                                </div>
                            </div>
                        ))}
                    </div>
                    
                    <div className="mt-8 pt-6 border-t border-app-border">
                        <div className="flex items-center gap-3 p-4 rounded-none bg-slate-50 dark:bg-white/[0.02] border border-app-border">
                            <Lock size={18} className="text-amber-500" />
                            <div>
                                <div className="text-[10px] font-black text-app-text uppercase">System Access Log</div>
                                <div className="text-[8px] font-bold text-app-text-muted uppercase tracking-widest italic">Last Login: 2m ago by Admin</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="flex flex-wrap gap-4">
                <button className="px-6 py-3 rounded-none bg-indigo-600 text-app-text text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-600/30 hover:shadow-indigo-600/50 hover:scale-105 active:scale-95 transition-all">
                    Register IP Asset
                </button>
                <button className="px-6 py-3 rounded-none bg-app-surface-soft text-app-text text-[10px] font-black uppercase tracking-widest border border-app-border hover:bg-slate-200 dark:hover:bg-white/10 transition-all">
                    Initiate Audit
                </button>
                <button className="px-6 py-3 rounded-none bg-emerald-500/10 text-emerald-500 text-[10px] font-black uppercase tracking-widest border border-emerald-500/20 hover:bg-emerald-500/20 transition-all">
                    Download Policy PDF
                </button>
            </div>
        </div>
    )
}
