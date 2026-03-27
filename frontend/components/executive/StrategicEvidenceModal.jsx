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
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            
            {/* Drawer */}
            <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-500 border-l border-white/10">
                
                {/* Header */}
                <div className="p-8 border-b border-app-border/40 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="p-3 rounded-2xl bg-primary/10 text-primary">
                            <Database size={24} />
                        </div>
                        <div>
                            <h3 className="text-2xl font-black tracking-tighter uppercase italic text-app-text">Deep Audit <span className="text-primary tracking-normal not-italic lowercase">Evidence</span></h3>
                            <p className="text-[10px] text-app-text-muted font-black uppercase tracking-[0.3em] mt-1">Source Focus: {focus || 'Root Telemetry'}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-3 hover:bg-rose-500/10 hover:text-rose-500 rounded-xl transition-all text-app-text-muted">
                        <X size={24} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-grow overflow-y-auto p-8 custom-scrollbar space-y-8">
                    {sections.map(section => (
                        <div key={section.id} className="space-y-4">
                            <div className="flex items-center gap-2 text-app-text-muted mb-4 border-b border-app-border/20 pb-2">
                                {section.icon}
                                <span className="text-[11px] font-black uppercase tracking-widest">{section.label}</span>
                            </div>
                            
                            <div className="grid gap-2">
                                {section.rows.map((row, idx) => (
                                    <div key={idx} className="flex items-center justify-between p-4 rounded-xl bg-slate-500/5 border border-app-border/30 hover:border-primary/20 transition-all group">
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-black text-app-text-muted uppercase tracking-widest mb-1">{row.key}</span>
                                            <span className="text-xl font-black text-app-text tabular-nums">{row.val}</span>
                                        </div>
                                        <div className="flex flex-col items-end">
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                                                row.status === 'good' ? 'bg-emerald-500/10 text-emerald-500' : 
                                                row.status === 'warning' ? 'bg-amber-500/10 text-amber-500' :
                                                row.status === 'error' ? 'bg-rose-500/10 text-rose-500' : 'bg-slate-500/10 text-app-text-muted'
                                            }`}>
                                                {row.delta}
                                            </span>
                                            <button className="text-[9px] font-black uppercase text-primary tracking-widest mt-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                                                Raw logs <ExternalLink size={10} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Footer Actions */}
                <div className="p-8 border-t border-app-border/40 bg-slate-500/5 flex items-center justify-between">
                    <button className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-app-text-muted hover:text-primary transition-colors">
                        <List size={14} /> View SQL Query
                    </button>
                    <button className="btn btn-primary py-3 px-8 text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                        <Download size={14} /> Export Evidence (PDF)
                    </button>
                </div>
            </div>
        </div>
    );
};

export default StrategicEvidenceModal;
