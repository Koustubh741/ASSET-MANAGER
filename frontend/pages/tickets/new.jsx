import Link from 'next/link';
import { ArrowLeft, Save, Info, HelpCircle, X, Check } from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import apiClient from '@/lib/apiClient';
import { useRole } from '@/contexts/RoleContext';
import { useAssetContext } from '@/contexts/AssetContext';

const deptGuide = [
    { name: 'IT Support Team', role: 'Hardware, software, logins, and general technical help.' },
    { name: 'Network Ops', role: 'Internet, VPN, WiFi, and server connectivity issues.' },
    { name: 'HR Department', role: 'Benefits, payroll, onboarding, and employee relations.' },
    { name: 'Finance Department', role: 'Expenses, billing, and procurement approvals.' },
    { name: 'Procurement Team', role: 'Purchasing and vendor management requests.' },
    { name: 'Facilities Team', role: 'Office maintenance, physical space, and repairs.' },
    { name: 'Executive Support', role: 'Priority support for leadership and management.' },
    { name: 'Architecture Department', role: 'System design, technical standards, and data schema.' },
    { name: 'Cloud Operations Team', role: 'Cloud infrastructure and platform support.' },
    { name: 'Customer Success', role: 'Assistance for customer onboarding and success.' },
    { name: 'Cyber Security Team', role: 'Security incident response and vulnerability management.' },
    { name: 'Data & AI Team', role: 'Support for data engineering and AI initiatives.' },
    { name: 'Product Management', role: 'Feature requests and product roadmap queries.' },
    { name: 'Sales & Marketing', role: 'Marketing assets and sales enablement support.' }
];

export default function NewTicketPage() {
    const router = useRouter();
    const { user, isStaff, isManagerial } = useRole();
    const { createTicket } = useAssetContext();
    const [submitted, setSubmitted] = useState(false);
    const [loading, setLoading] = useState(false);
    const [assets, setAssets] = useState([]);
    const [groups, setGroups] = useState([]);
    const [showGuide, setShowGuide] = useState(false);
    const [formData, setFormData] = useState({
        subject: '',
        priority: 'Medium',
        related_asset_id: '',
        description: '',
        assignment_group_id: ''
    });


    useEffect(() => {
        const fetchData = async () => {
            if (!user) return;

            try {
                const isPrivileged = isStaff || isManagerial;
                const [assetsResponse, apiGroups] = await Promise.all([
                    isPrivileged ? apiClient.getAssets() : apiClient.getMyAssets(),
                    apiClient.getAssignmentGroups()
                ]);
                setAssets(isPrivileged ? (assetsResponse.data || []) : assetsResponse);
                setGroups(apiGroups);
            } catch (error) {
                console.error('Failed to load assets or groups:', error);
            }
        };
        fetchData();
    }, [user, isStaff, isManagerial]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (loading) return;

        setLoading(true);
        try {
            const ticketData = {
                subject: formData.subject,
                description: formData.description,
                priority: formData.priority,
                related_asset_id: formData.related_asset_id || null,
                assignment_group_id: formData.assignment_group_id || null,
            };

            await createTicket(ticketData);
            setSubmitted(true);
        } catch (error) {
            // Error already handled by context toast, but we can log it
            console.error('Ticket submission error:', error);
        } finally {
            setLoading(false);
        }
    };

    if (submitted) {
        return (
            <div className="min-h-screen p-8 bg-app-void text-app-text flex items-center justify-center relative overflow-hidden">
                <div className="kinetic-scan-line" />
                <div className="text-center space-y-8 relative z-10">
                    <div className="w-24 h-24 bg-app-secondary/15 border border-app-secondary text-app-secondary flex items-center justify-center mx-auto mb-8 shadow-[0_0_50px_rgba(var(--color-kinetic-secondary-rgb),0.2)]">
                        <Check size={48} />
                    </div>
                    <div>
                        <h1 className="text-4xl font-black text-app-secondary uppercase italic tracking-tighter leading-none">Transmission <span className="text-app-text">Success</span></h1>
                        <p className="text-app-text-muted mt-4 text-[10px] font-black uppercase tracking-[0.3em] opacity-40">Incident ID logged in Neural Queue // Routing Active</p>
                    </div>
                    <Link href="/tickets" className="inline-block px-10 py-4 bg-app-surface hover:bg-app-primary hover:text-app-void border border-app-border transition-all font-black uppercase tracking-[0.2em] text-[12px] shadow-2xl active:scale-95">Return to Command Dashboard</Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen p-8 bg-app-void text-app-text relative overflow-hidden">
            <div className="kinetic-scan-line" />
            <div className="max-w-3xl mx-auto space-y-12 relative z-10">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-6">
                        <button onClick={() => router.back()} className="p-3 bg-app-void hover:bg-app-rose hover:text-app-void border border-app-border hover:border-transparent transition-all shadow-xl active:scale-95 group">
                            <ArrowLeft size={24} className="group-hover:-translate-x-1 transition-transform" />
                        </button>
                        <div>
                            <h1 className="text-4xl font-black text-app-text uppercase italic tracking-tighter leading-none">Deploy <span className="text-app-rose">Incident</span></h1>
                            <p className="text-app-text-muted mt-3 text-[10px] font-black uppercase tracking-[0.3em] opacity-40">Priority Stream // Sector 04-B // Response Protcol 11-A</p>
                        </div>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="glass-panel p-8 md:p-12 rounded-none bg-app-obsidian border border-app-border space-y-10 shadow-[0_0_100px_rgba(0,0,0,0.8)] relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 font-mono text-[8px] opacity-10">INCIDENT_FORM_V3</div>
                    <div className="space-y-4">
                        <label className="text-[10px] font-black text-app-primary uppercase tracking-[0.3em] block border-l-2 border-app-primary pl-3">Neural_Subject_Matrix</label>
                        <input
                            type="text"
                            required
                            className="w-full bg-app-void border border-app-border rounded-none px-5 py-4 focus:border-app-primary outline-none text-app-text font-black uppercase tracking-tight italic transition-all"
                            placeholder="SUMMARY_REQUIRED"
                            value={formData.subject}
                            onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-8">
                        <div className="space-y-4">
                            <label className="text-[10px] font-black text-app-primary uppercase tracking-[0.3em] block border-l-2 border-app-primary pl-3">Criticality_Index</label>
                            <select
                                className="w-full bg-app-void border border-app-border rounded-none px-5 py-4 focus:border-app-rose outline-none text-app-text font-black uppercase tracking-widest text-xs appearance-none cursor-pointer transition-all"
                                value={formData.priority}
                                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                            >
                                <option>Low</option>
                                <option>Medium</option>
                                <option>High</option>
                                <option>Critical</option>
                            </select>
                        </div>
                        <div className="space-y-4">
                            <label className="text-[10px] font-black text-app-primary uppercase tracking-[0.3em] block border-l-2 border-app-primary pl-3">Target_Asset_Map</label>
                            <select
                                className="w-full bg-app-void border border-app-border rounded-none px-5 py-4 focus:border-app-primary outline-none text-app-text font-black uppercase tracking-widest text-xs appearance-none cursor-pointer transition-all"
                                value={formData.related_asset_id}
                                onChange={(e) => setFormData({ ...formData, related_asset_id: e.target.value })}
                            >
                                <option value="">Auto_Detect_Active</option>
                                {assets.map(a => (
                                    <option key={a.id} value={a.id}>{a.name} // {a.model}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-8">
                        <div className="relative space-y-4">
                            <div className="flex items-center justify-between">
                                <label className="text-[10px] font-black text-app-primary uppercase tracking-[0.3em] block border-l-2 border-app-primary pl-3">Routing_Sector</label>
                                <button 
                                    type="button"
                                    onClick={() => setShowGuide(!showGuide)}
                                    className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-app-rose hover:bg-app-rose hover:text-app-void px-2 py-0.5 border border-app-rose/20 transition"
                                >
                                    <HelpCircle size={10} /> Guide_Protocol
                                </button>
                            </div>
                            
                            {showGuide && (
                                <div className="absolute z-20 bottom-full left-0 mb-6 w-80 bg-app-obsidian border border-app-rose shadow-[0_0_50px_rgba(var(--color-kinetic-rose-rgb),0.2)] p-6 animate-in fade-in zoom-in slide-in-from-bottom-6 duration-500">
                                    <div className="flex justify-between items-center mb-6 pb-2 border-b border-app-border">
                                        <h4 className="text-[11px] font-black uppercase tracking-[0.3em] text-app-rose italic">Sector Route Matrix</h4>
                                        <button onClick={() => setShowGuide(false)} className="text-app-text-muted hover:text-app-rose transition-colors">
                                            <X size={16} />
                                        </button>
                                    </div>
                                    <div className="space-y-4 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                                        {deptGuide.map(d => (
                                            <div key={d.name} className="space-y-1 group">
                                                <p className="text-[10px] font-bold text-app-text group-hover:text-rose-400 transition-colors uppercase">{d.name}</p>
                                                <p className="text-[9px] text-app-text-muted leading-relaxed">{d.role}</p>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="mt-6 pt-4 border-t border-app-border">
                                        <p className="text-[8px] text-app-text-muted italic uppercase font-black opacity-30">Consult Neural Wiki for extended routing protocols.</p>
                                    </div>
                                </div>
                            )}

                            <select
                                className="w-full bg-app-void border border-app-border rounded-none px-5 py-4 focus:border-app-primary outline-none text-app-text font-black uppercase tracking-widest text-[11px] appearance-none cursor-pointer transition-all"
                                value={formData.assignment_group_id}
                                onChange={(e) => setFormData({ ...formData, assignment_group_id: e.target.value })}
                            >
                                <option value="">Auto_Route_Core</option>
                                {groups.map(g => (
                                    <option key={g.id} value={g.id}>
                                        {g.name} // {g.department_name || g.department}
                                    </option>
                                ))}
                            </select>
                            <p className="text-[9px] text-app-text-muted mt-2 uppercase font-black tracking-widest opacity-30">Neural selection recommended for hi-crit reporting.</p>
                        </div>
                        <div className="flex items-end pb-1 text-[9px] text-app-text-muted font-black uppercase italic tracking-widest opacity-20">
                            System Tip: Unified sectors reduce latency.
                        </div>
                    </div>

                    <div className="space-y-4">
                        <label className="text-[10px] font-black text-app-primary uppercase tracking-[0.3em] block border-l-2 border-app-primary pl-3">Neural_Data_Stream (Description)</label>
                        <textarea
                            rows={8}
                            required
                            className="w-full bg-app-void border border-app-border rounded-none px-5 py-4 focus:border-app-primary outline-none text-app-text font-mono text-sm min-h-[160px] transition-all"
                            placeholder="STREAM_INPUT_REQUIRED..."
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        />
                    </div>

                    <div className="flex justify-end pt-8 border-t border-app-border">
                        <button
                            type="submit"
                            disabled={loading}
                            className="bg-app-rose text-app-void px-12 py-5 rounded-none font-black uppercase tracking-[0.3em] text-[13px] shadow-[0_20px_50px_rgba(var(--color-kinetic-rose-rgb),0.3)] hover:bg-app-rose-dark hover:-translate-y-1 transition-all active:scale-95 group relative overflow-hidden disabled:opacity-50"
                        >
                            <div className="absolute inset-0 bg-white/10 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                            <div className="flex items-center gap-4 relative z-10">
                                {loading ? (
                                    <div className="w-5 h-5 border-2 border-app-void/40 border-t-app-void rounded-none animate-spin" />
                                ) : (
                                    <Save size={20} className="group-hover:translate-x-1 transition-transform" />
                                )}
                                {loading ? 'TRANSMITTING...' : 'DEPLOY_INCIDENT_STREAM'}
                            </div>
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
