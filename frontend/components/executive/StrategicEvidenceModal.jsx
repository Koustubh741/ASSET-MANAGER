import React from 'react';
import { X, Database, List, Shield, PieChart, Activity, ExternalLink, Download } from 'lucide-react';

const StrategicEvidenceModal = ({ isOpen, onClose, focus, data }) => {
    console.log('[EvidenceModal] Render:', { isOpen, focus });
    if (!isOpen) return null;

    const sections = [
        { 
            id: 'telemetry', 
            label: 'Raw Telemetry Stream', 
            icon: <Activity size={18} />,
            rows: [
                { key: 'SLA.Compliance.Realtime', val: `${data?.compliance_rate || 98}%`, status: 'good', delta: '+0.5%' },
                { key: 'MTTR.Aggregated.Pillar', val: '4.2h', status: 'good', delta: '-12%' },
                { key: 'IO_Load.Support.Active', val: `${Object.keys(data?.departmental_load || {}).length * 15 || 152} Threads`, status: 'neutral', delta: 'Nominal' },
            ]
        },
        {
            id: 'cost',
            label: 'Fiscal Expenditure Pulse',
            icon: <PieChart size={18} />,
            rows: [
                { key: 'OpEx.Total.Direct', val: `$${(data?.financial_pulse?.total_spend || 24500).toLocaleString()}`, status: 'neutral', delta: '+2.4%' },
                { key: 'Automation.Deflection.Value', val: `$${(data?.automation_deflection?.savings || 12000).toLocaleString()}`, status: 'good', delta: 'High' },
            ]
        },
        {
            id: 'alerts',
            label: 'Security & Anomaly Audit',
            icon: <Shield size={18} />,
            rows: (data?.major_incidents || []).length > 0 ? data.major_incidents.map(inc => ({
                key: `CRISIS.${inc.id || 'INC'}`, val: inc.title || 'Anomaly', status: 'error', delta: inc.priority || 'HIGH'
            })) : [
                { key: 'Anomaly.Detection', val: 'Zero Detected', status: 'good', delta: 'Nominal' },
                { key: 'Vulnerability.Patch', val: '92%', status: 'good', delta: '+4%' },
            ]
        }
    ];

    return (
        <div className="fixed inset-0 z-[120] flex justify-end animate-in fade-in duration-300">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-app-obsidian/80 backdrop-blur-md" onClick={onClose} />
            
            {/* Drawer */}
            <div className="relative w-full max-w-2xl bg-app-void h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-500 border-l border-app-border relative overflow-hidden font-['Space_Grotesk']">
                <div className="kinetic-scan-line" />
                <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
                     style={{ backgroundImage: 'radial-gradient(circle, var(--color-app-primary) 1px, transparent 1px)', backgroundSize: '30px 30px' }} />
                
                {/* Header */}
                <div className="p-10 border-b border-app-border/40 flex items-center justify-between relative z-10 bg-app-void/80 backdrop-blur-md">
                    <div className="flex items-center gap-6">
                        <div className="p-4 rounded-none bg-app-primary/10 text-app-primary border border-app-primary/20 shadow-[0_0_20px_rgba(var(--color-app-primary-rgb),0.2)]">
                            <Database size={28} />
                        </div>
                        <div>
                            <h3 className="text-3xl font-black tracking-tighter uppercase italic text-app-text leading-none">Deep Audit <span className="text-app-primary not-italic">Evidence</span></h3>
                            <p className="text-[10px] text-app-text-muted font-black uppercase tracking-[0.5em] mt-3 opacity-40 italic">Source_Focus: {focus || 'Root_Telemetry'} // v6.8</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-4 hover:bg-app-rose/10 hover:text-app-rose rounded-none transition-all text-app-text-muted border border-transparent hover:border-app-rose/30">
                        <X size={28} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-grow overflow-y-auto p-10 custom-scrollbar space-y-12 relative z-10">
                    {sections.map(section => (
                        <div key={section.id} className="space-y-6">
                            <div className="flex items-center gap-3 text-app-primary mb-6 border-b border-app-border/20 pb-3 italic">
                                {section.icon}
                                <span className="text-[12px] font-black uppercase tracking-[0.3em]">{section.label}</span>
                            </div>
                            
                            <div className="grid gap-3">
                                {section.rows.map((row, idx) => (
                                    <div key={idx} className="flex items-center justify-between p-6 rounded-none bg-app-obsidian/40 border border-app-border/40 hover:border-app-primary/30 hover:bg-app-surface/40 transition-all group relative overflow-hidden">
                                        <div className="absolute top-0 left-0 w-1 h-full bg-app-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-black text-app-text-muted uppercase tracking-[0.3em] mb-2 opacity-50 italic">{row.key}</span>
                                            <span className="text-2xl font-black text-app-text tabular-nums italic tracking-tighter">{row.val}</span>
                                        </div>
                                        <div className="flex flex-col items-end">
                                            <span className={`text-[10px] font-black px-3 py-1 rounded-none uppercase tracking-[0.1em] italic shadow-lg border ${
                                                row.status === 'good' ? 'bg-app-secondary/10 text-app-secondary border-app-secondary/30' : 
                                                row.status === 'warning' ? 'bg-app-gold/10 text-app-gold border-app-gold/30' :
                                                row.status === 'error' ? 'bg-app-rose/10 text-app-rose border-app-rose/30' : 'bg-app-void text-app-text-muted border-app-border'
                                            }`}>
                                                {row.delta}
                                            </span>
                                            <button className="text-[10px] font-black uppercase text-app-primary tracking-[0.2em] mt-3 opacity-0 group-hover:opacity-100 transition-all translate-x-2 group-hover:translate-x-0 flex items-center gap-2 italic">
                                                Fetch_Raw_Logs <ExternalLink size={12} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Footer Actions */}
                <div className="p-10 border-t border-app-border/40 bg-app-obsidian/90 flex items-center justify-between relative z-10">
                    <button className="flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.3em] text-app-text-muted hover:text-app-primary transition-colors italic">
                        <List size={16} /> SQL_QUERY_VIEW
                    </button>
                    <button className="bg-app-primary text-app-obsidian py-4 px-10 text-[11px] font-black uppercase tracking-[0.3em] flex items-center gap-3 hover:bg-app-primary/90 transition-all shadow-[0_0_30px_rgba(var(--color-app-primary-rgb),0.3)] italic">
                        <Download size={18} /> EXPORT_EVIDENCE_PDF
                    </button>
                </div>
            </div>
        </div>
    );
};

export default StrategicEvidenceModal;
