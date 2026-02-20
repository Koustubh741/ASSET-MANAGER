import { useState, useEffect } from 'react';
import apiClient from '@/lib/apiClient';
import { ClipboardList, AlertTriangle, FileCheck, Search, ShieldCheck, PieChart, Users, AlertOctagon, History, FileText, CheckCircle2, XCircle, BarChart3, Lock, Eye, Download, Info } from 'lucide-react';
import ActionsNeededBanner from '@/components/common/ActionsNeededBanner';

export default function AuditOfficerDashboard() {
    const [activeTab, setActiveTab] = useState('overview');
    const [reportModalOpen, setReportModalOpen] = useState(false);

    // --- Mock Data ---

    // 1. Audit Plans
    const auditPlans = [
        { id: 'AP-2024-01', type: 'Internal', standard: 'ISO 27001', period: 'Q1 2024', depts: ['Finance', 'HR'], status: 'In Progress', auditor: 'Jane B.', progress: 65 },
        { id: 'AP-2024-02', type: 'External', standard: 'SOX', period: 'Q2 2024', depts: ['IT Ops', 'Engineering'], status: 'Planned', auditor: 'Ext - KPMG', progress: 0 },
        { id: 'AP-2023-04', type: 'Surprise', standard: 'Internal Policy', period: 'Dec 2023', depts: ['Logistics'], status: 'Closed', auditor: 'Mike R.', progress: 100 },
    ];

    // 2. Software Compliance
    const softwareCompliance = {
        complianceRate: 92,
        highRiskViolations: 3,
        licenses: [
            { name: 'Adobe Creative Cloud', licensed: 50, installed: 52, status: 'Overused', risk: 'High' },
            { name: 'Microsoft 365 E5', licensed: 200, installed: 198, status: 'Compliant', risk: 'Low' },
            { name: 'JetBrains All Products', licensed: 25, installed: 20, status: 'Compliant', risk: 'Low' },
            { name: 'WinRAR (Unlicensed)', licensed: 0, installed: 15, status: 'Unauthorized', risk: 'Medium' },
        ]
    };

    // 3. Violations & CAPA
    const violations = [
        { id: 'V-102', asset: 'Server-DB-04', type: 'Unpatched OS', severity: 'Critical', owner: 'IT Ops', status: 'Action Assigned', due: '2023-12-20', capa: 'Apply Patch KB4023', capaStatus: 'Pending' },
        { id: 'V-105', asset: 'Laptop-Fin-09', type: 'Unauthorized SW', severity: 'Medium', owner: 'Finance', status: 'Investigating', due: '2023-12-22', capa: 'Uninstall App', capaStatus: 'Open' },
        { id: 'V-098', asset: 'Switch-Core-01', type: 'Weak Password', severity: 'High', owner: 'NetAdmin', status: 'Closed', due: '2023-11-30', capa: 'Enforce MFA', capaStatus: 'Verified' },
    ];

    const [auditLogs, setAuditLogs] = useState([]);
    const [loadingLogs, setLoadingLogs] = useState(true);

    useEffect(() => {
        const fetchLogs = async () => {
            try {
                const logs = await apiClient.getAuditLogs({ limit: 10 });
                setAuditLogs(logs.map(log => ({
                    id: log.id,
                    action: log.action,
                    target: log.entity_id || 'System',
                    user: log.performed_by || 'Unknown',
                    time: new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                })));
                setLoadingLogs(false);
            } catch (error) {
                console.error('Failed to fetch audit logs:', error);
                setLoadingLogs(false);
            }
        };
        fetchLogs();
    }, []);

    // 6. Report Options
    const reportOptions = [
        'Executive Summary', 'Department Findings', 'Asset-wise Violations', 'CAPA Status Report', 'Auditor Sign-off Sheet'
    ];

    // Heatmap Mock Data
    const assetRiskData = [
        { id: 'HIGH', label: 'High Risk (Score 70-100)', count: 12, color: 'bg-rose-500', hover: 'Critical Violations' },
        { id: 'MED', label: 'Medium Risk (Score 40-69)', count: 34, color: 'bg-orange-500', hover: 'Warnings & Policy Breaches' },
        { id: 'LOW', label: 'Low Risk (Score 0-39)', count: 145, color: 'bg-emerald-500', hover: 'Compliant' },
    ];

    const departmentRisk = [
        { dept: 'IT Operations', riskScore: 85, color: 'bg-rose-500' },
        { dept: 'Finance', riskScore: 65, color: 'bg-orange-500' },
        { dept: 'HR', riskScore: 25, color: 'bg-emerald-500' },
        { dept: 'Logistics', riskScore: 45, color: 'bg-amber-500' },
        { dept: 'Sales', riskScore: 15, color: 'bg-emerald-500' },
    ];

    const locationRisk = [
        { loc: 'NY HQ', risk: 'Low', color: 'bg-emerald-500' },
        { loc: 'London', risk: 'Medium', color: 'bg-orange-500' },
        { loc: 'Warehouse A', risk: 'High', color: 'bg-rose-500' },
        { loc: 'Remote', risk: 'Low', color: 'bg-emerald-500' },
    ];

    const violationTypeHeatmap = [
        { type: 'License', count: 15, color: 'bg-rose-500' },
        { type: 'Physical Mismatch', count: 8, color: 'bg-orange-500' },
        { type: 'Security Policy', count: 5, color: 'bg-amber-500' },
        { type: 'Unauthorized HW', count: 2, color: 'bg-emerald-500' },
    ];


    const renderTabContent = () => {
        switch (activeTab) {
            case 'overview':
                return (
                    <div className="space-y-6">
                        {/* KPI Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                            <div className="glass-card p-6 flex flex-col justify-between">
                                <div>
                                    <p className="text-slate-400 text-xs uppercase">Verified (This Month)</p>
                                    <h3 className="text-3xl font-bold text-emerald-400 mt-2">64%</h3>
                                </div>
                                <div className="w-full bg-slate-700 h-1.5 rounded-full mt-4 overflow-hidden">
                                    <div className="bg-emerald-500 h-full" style={{ width: '64%' }}></div>
                                </div>
                            </div>
                            <div className="glass-card p-6">
                                <p className="text-slate-400 text-xs uppercase">Key Violations</p>
                                <h3 className="text-3xl font-bold text-rose-500 mt-2">18</h3>
                                <p className="text-xs text-rose-400 mt-1">Requires immediate attention</p>
                            </div>
                            <div className="glass-card p-6">
                                <p className="text-slate-400 text-xs uppercase">Compliance Score</p>
                                <h3 className="text-3xl font-bold text-blue-400 mt-2">A-</h3>
                                <p className="text-xs text-slate-400 light:text-slate-600 mt-1">Top 15% of industry</p>
                            </div>
                            <div className="glass-card p-6 flex items-center justify-center relative">
                                <button
                                    onClick={() => setReportModalOpen(!reportModalOpen)}
                                    className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-3 rounded-xl w-full justify-center transition-all shadow-lg shadow-indigo-500/20"
                                >
                                    <FileCheck size={20} />
                                    Generate Report
                                </button>
                                {reportModalOpen && (
                                    <div className="absolute top-full left-0 right-0 mt-2 bg-slate-800 border border-white/10 light:border-slate-200 rounded-xl shadow-2xl p-2 z-20 animate-in fade-in zoom-in-95">
                                        <p className="px-3 py-2 text-xs font-semibold text-slate-400 light:text-slate-600 uppercase tracking-wider border-b border-white/5 light:border-slate-200 light:border-slate-200 mb-1">Include Sections</p>
                                        {reportOptions.map((opt, i) => (
                                            <div key={i} className="flex items-center gap-2 px-3 py-2 hover:bg-white/5 rounded-lg cursor-pointer text-sm text-slate-200 light:text-slate-800">
                                                <input type="checkbox" defaultChecked className="rounded border-slate-600 bg-slate-700 text-indigo-500" />
                                                {opt}
                                            </div>
                                        ))}
                                        <button className="w-full mt-2 bg-emerald-600 hover:bg-emerald-500 text-white py-2 rounded-lg text-xs font-bold uppercase tracking-wide flex items-center justify-center gap-2">
                                            <Download size={14} /> Download PDF
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* 1. ASSET RISK HEATMAP (Executive View) */}
                        <div className="glass-panel p-6">
                            <h3 className="text-lg font-bold text-white light:text-slate-800 mb-4 flex items-center gap-2">
                                <AlertTriangle className="text-amber-400" size={20} /> Asset Risk Overview
                            </h3>
                            <div className="flex w-full h-12 rounded-lg overflow-hidden border border-white/10 light:border-slate-200">
                                {assetRiskData.map((item) => (
                                    <div
                                        key={item.id}
                                        className={`${item.color} flex items-center justify-center relative group cursor-pointer hover:opacity-90 transition-opacity`}
                                        style={{ width: `${(item.count / 191) * 100}%` }} // Mock calculation total 191
                                        title={`${item.label}: ${item.count} Assets`}
                                    >
                                        <span className="text-white font-bold text-sm drop-shadow-md">{item.count}</span>
                                        {/* Tooltip */}
                                        <div className="absolute bottom-full mb-2 hidden group-hover:block w-48 bg-slate-900 border border-white/10 light:border-slate-200 p-2 rounded shadow-xl left-1/2 -translate-x-1/2 z-10">
                                            <p className="text-xs font-bold text-white light:text-slate-800">{item.label}</p>
                                            <p className="text-[10px] text-slate-400">{item.hover}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="flex justify-between items-center mt-3 text-xs text-slate-400">
                                <div className="flex gap-4">
                                    <div className="flex items-center gap-2"><div className="w-3 h-3 bg-rose-500 rounded-sm"></div> High Risk</div>
                                    <div className="flex items-center gap-2"><div className="w-3 h-3 bg-orange-500 rounded-sm"></div> Medium Risk</div>
                                    <div className="flex items-center gap-2"><div className="w-3 h-3 bg-emerald-500 rounded-sm"></div> Low Risk</div>
                                </div>
                                <span>Total Assets Evaluated: 191</span>
                            </div>
                        </div>

                        {/* Existing Mismatch Table */}
                        <div className="glass-panel p-6">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-lg font-bold text-white light:text-slate-800">System vs Physical Mismatch (Legacy)</h3>
                                <div className="relative">
                                    <Search className="absolute left-3 top-2.5 text-slate-500" size={16} />
                                    <input type="text" placeholder="Search asset tag..." className="bg-slate-800 border border-white/10 light:border-slate-200 rounded-lg pl-9 pr-4 py-2 text-sm text-white focus:outline-none focus:border-blue-500" />
                                </div>
                            </div>

                            <table className="w-full text-left text-sm">
                                <thead className="bg-white/5 text-slate-300 light:text-slate-700 text-xs uppercase">
                                    <tr>
                                        <th className="p-3 rounded-l-lg">Asset</th>
                                        <th className="p-3">System Location</th>
                                        <th className="p-3">Scanned Location</th>
                                        <th className="p-3">Last Scan</th>
                                        <th className="p-3 rounded-r-lg">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="text-slate-400 divide-y divide-white/5">
                                    <tr className="hover:bg-white/5">
                                        <td className="p-3 font-medium text-white">Dell XPS 15 (AST-992)</td>
                                        <td className="p-3">New York HQ</td>
                                        <td className="p-3 text-amber-400">London Office</td>
                                        <td className="p-3">2 hours ago</td>
                                        <td className="p-3">
                                            <button className="text-blue-400 hover:text-blue-300 mr-3">Update Sys</button>
                                            <button className="text-rose-400 hover:text-rose-300">Flag</button>
                                        </td>
                                    </tr>
                                    <tr className="hover:bg-white/5">
                                        <td className="p-3 font-medium text-white">iPad Pro (AST-101)</td>
                                        <td className="p-3">Warehouse A</td>
                                        <td className="p-3 text-rose-400">Missing</td>
                                        <td className="p-3">N/A</td>
                                        <td className="p-3">
                                            <button className="text-slate-300 hover:text-white light:hover:text-slate-900">Investigate</button>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                );

            case 'planning':
                return (
                    <div className="space-y-6 animate-in fade-in">
                        <div className="flex justify-between items-center">
                            <h3 className="text-xl font-bold text-white light:text-slate-800">Audit Planning & Scope</h3>
                            <button className="btn bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2">
                                <CheckCircle2 size={16} /> Inititate New Audit
                            </button>
                        </div>
                        <div className="grid grid-cols-1 gap-4">
                            {auditPlans.map(plan => (
                                <div key={plan.id} className="glass-panel p-5 border-l-4 border-l-blue-500 flex flex-col md:flex-row justify-between items-center gap-4">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-1">
                                            <h4 className="text-lg font-bold text-white light:text-slate-800">{plan.id}</h4>
                                            <span className={`px-2 py-0.5 rounded textxs font-bold uppercase tracking-wide text-[10px] ${plan.status === 'In Progress' ? 'bg-blue-500/20 text-blue-400' : plan.status === 'Closed' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-700 text-slate-400'}`}>
                                                {plan.status}
                                            </span>
                                        </div>
                                        <p className="text-slate-400 text-sm">
                                            <span className="text-slate-300 font-medium">{plan.type} Audit</span> • {plan.standard} • {plan.period}
                                        </p>
                                        <div className="flex gap-2 mt-2">
                                            {plan.depts.map(d => <span key={d} className="px-2 py-1 bg-white/5 light:bg-slate-50 rounded text-xs text-slate-300 light:text-slate-700">{d}</span>)}
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs text-slate-500 uppercase font-bold mb-1">Auditor</p>
                                        <div className="flex items-center gap-2 justify-end">
                                            <div className="w-6 h-6 rounded-full bg-indigo-500 flex items-center justify-center text-[10px] text-white font-bold">{plan.auditor.charAt(0)}</div>
                                            <span className="text-sm text-white">{plan.auditor}</span>
                                        </div>
                                    </div>
                                    <div className="w-full md:w-32">
                                        <div className="flex justify-between text-xs text-slate-400 light:text-slate-600 mb-1">
                                            <span>Progress</span>
                                            <span>{plan.progress}%</span>
                                        </div>
                                        <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                                            <div className="h-full bg-blue-500" style={{ width: `${plan.progress}%` }}></div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                );

            case 'compliance':
                return (
                    <div className="space-y-6 animate-in fade-in">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="glass-panel p-6">
                                <h3 className="text-lg font-bold text-white light:text-slate-800 mb-4 flex items-center gap-2">
                                    <ShieldCheck className="text-emerald-400" /> License Compliance
                                </h3>
                                <div className="flex items-center justify-center py-6">
                                    <div className="relative w-40 h-40">
                                        <svg className="w-full h-full transform -rotate-90">
                                            <circle cx="80" cy="80" r="70" stroke="currentColor" strokeWidth="10" fill="transparent" className="text-slate-700" />
                                            <circle cx="80" cy="80" r="70" stroke="currentColor" strokeWidth="10" fill="transparent" strokeDasharray={440} strokeDashoffset={440 * (1 - softwareCompliance.complianceRate / 100)} className="text-emerald-500" />
                                        </svg>
                                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                                            <span className="text-3xl font-bold text-white light:text-slate-800">{softwareCompliance.complianceRate}%</span>
                                            <span className="text-xs text-slate-400 light:text-slate-600 uppercase">Compliant</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex justify-around text-center mt-4">
                                    <div>
                                        <p className="text-2xl font-bold text-rose-500">{softwareCompliance.highRiskViolations}</p>
                                        <p className="text-xs text-rose-400">High Risk</p>
                                    </div>
                                    <div>
                                        <p className="text-2xl font-bold text-white light:text-slate-800">{softwareCompliance.licenses.reduce((acc, l) => acc + (l.installed > l.licensed ? 1 : 0), 0)}</p>
                                        <p className="text-xs text-slate-400">Overused</p>
                                    </div>
                                </div>
                            </div>

                            {/* VIOLATION TYPE HEATMAP (New) */}
                            <div className="glass-panel p-6">
                                <h3 className="text-lg font-bold text-white light:text-slate-800 mb-4">Compliance Insights: Violation Types</h3>
                                <div className="space-y-4">
                                    {violationTypeHeatmap.map((v, idx) => (
                                        <div key={idx} className="group cursor-pointer">
                                            <div className="flex justify-between text-xs text-slate-300 light:text-slate-700 mb-1">
                                                <span>{v.type}</span>
                                                <span className="font-bold text-white light:text-slate-800">{v.count}</span>
                                            </div>
                                            <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                                                <div className={`h-full ${v.color} transition-all duration-500`} style={{ width: `${(v.count / 30) * 100}%` }}></div>
                                            </div>
                                        </div>
                                    ))}
                                    <div className="pt-2 border-t border-white/5 light:border-slate-200 light:border-slate-200 text-[10px] text-slate-500">
                                        Root cause analysis suggests primarily software licensing gaps.
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                );

            case 'violations':
                // Existing Violations UI ...
                return (
                    <div className="space-y-6 animate-in fade-in">
                        {/* Violations Table */}
                        <div className="glass-panel p-6">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-xl font-bold text-white light:text-slate-800 flex items-center gap-2">
                                    <AlertOctagon className="text-rose-500" /> Active Violations & CAPA
                                </h3>
                                <div className="flex gap-2">
                                    <span className="px-3 py-1 bg-rose-500/20 text-rose-400 rounded-lg text-xs font-bold">3 Critical</span>
                                    <span className="px-3 py-1 bg-amber-500/20 text-amber-400 rounded-lg text-xs font-bold">5 Open CAPA</span>
                                </div>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-slate-900/50 text-slate-300 light:text-slate-700 text-xs uppercase border-b border-white/10 light:border-slate-200">
                                        <tr>
                                            <th className="p-4">Violation ID</th>
                                            <th className="p-4">Asset / Owner</th>
                                            <th className="p-4">Type / Severity</th>
                                            <th className="p-4">Corrective Action (CAPA)</th>
                                            <th className="p-4">Due Date</th>
                                            <th className="p-4 text-right">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {violations.map(v => (
                                            <tr key={v.id} className="hover:bg-white/5 transition-colors">
                                                <td className="p-4 font-mono text-slate-400">{v.id}</td>
                                                <td className="p-4">
                                                    <p className="text-white font-medium">{v.asset}</p>
                                                    <p className="text-xs text-slate-500">{v.owner}</p>
                                                </td>
                                                <td className="p-4">
                                                    <p className="text-slate-200">{v.type}</p>
                                                    <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${v.severity === 'Critical' ? 'bg-rose-500 text-white' :
                                                        v.severity === 'High' ? 'bg-orange-500 text-white' :
                                                            'bg-blue-500 text-white'
                                                        }`}>{v.severity}</span>
                                                </td>
                                                <td className="p-4">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs text-slate-300 light:text-slate-700 bg-slate-800 px-2 py-1 rounded border border-white/5 light:border-slate-200 light:border-slate-200">{v.capa}</span>
                                                        {v.capaStatus === 'Verified' && <CheckCircle2 size={14} className="text-emerald-500" />}
                                                    </div>
                                                </td>
                                                <td className="p-4 text-slate-400 light:text-slate-600 font-mono text-xs">{v.due}</td>
                                                <td className="p-4 text-right">
                                                    <span className={`px-2 py-1 rounded text-xs font-medium ${v.status === 'Closed' ? 'text-emerald-400 bg-emerald-500/10' : 'text-amber-400 bg-amber-500/10'
                                                        }`}>{v.status}</span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                );

            case 'risk':
                return (
                    <div className="space-y-6 animate-in fade-in">
                        {/* DRILL DOWN HEATMAPS */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                            {/* Department Risk Heatmap */}
                            <div className="glass-panel p-6">
                                <h3 className="text-lg font-bold text-white light:text-slate-800 mb-4">Department Risk Analysis</h3>
                                <div className="grid grid-cols-2 gap-2">
                                    {departmentRisk.map((dept, i) => (
                                        <div key={i} className={`${dept.color} bg-opacity-20 p-4 rounded-lg border border-white/5 light:border-slate-200 light:border-slate-200 hover:bg-opacity-30 transition-all cursor-crosshair`}>
                                            <h4 className="text-white font-bold">{dept.dept}</h4>
                                            <p className="text-white/80 text-xs mt-1">Score: {dept.riskScore}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Location Risk Heatmap */}
                            <div className="glass-panel p-6">
                                <h3 className="text-lg font-bold text-white light:text-slate-800 mb-4">Site Risk Heatmap</h3>
                                <div className="space-y-2">
                                    {locationRisk.map((loc, i) => (
                                        <div key={i} className="flex items-center gap-3">
                                            <div className={`w-3 h-3 rounded-full ${loc.color}`}></div>
                                            <div className="flex-1 bg-slate-800 rounded h-8 relative overflow-hidden">
                                                <div className={`absolute left-0 top-0 h-full ${loc.color} opacity-20 w-full`}></div>
                                                <div className="absolute inset-0 flex items-center justify-between px-3">
                                                    <span className="text-sm text-slate-200 light:text-slate-800">{loc.loc}</span>
                                                    <span className="text-xs font-bold text-white light:text-slate-800">{loc.risk}</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="glass-panel p-6 bg-gradient-to-br from-rose-900/20 to-slate-900 border-rose-500/20">
                                <h3 className="text-slate-400 text-sm uppercase font-bold">Asset Risk Index</h3>
                                <div className="text-4xl font-bold text-white light:text-slate-800 mt-2">7.8<span className="text-lg text-slate-500">/10</span></div>
                                <div className="mt-4 text-xs text-rose-400 flex items-center gap-1">
                                    <AlertTriangle size={12} /> Elevated Risk in Dept: Logistics
                                </div>
                            </div>
                            {/* ... other risk stats ... */}
                        </div>

                        {/* Logs */}
                        <div className="glass-panel p-6">
                            <h3 className="text-lg font-bold text-white light:text-slate-800 mb-4 flex items-center gap-2">
                                <History size={20} className="text-indigo-400" /> Audit Trail & Evidence Log
                            </h3>
                            <div className="space-y-0 relative border-l border-slate-700 ml-2">
                                {auditLogs.map((log, i) => (
                                    <div key={i} className="ml-6 mb-6 relative">
                                        <div className="absolute -left-[31px] top-1 w-3 h-3 rounded-full bg-slate-600 ring-4 ring-slate-900"></div>
                                        <div className="bg-slate-800/50 border border-white/5 light:border-slate-200 light:border-slate-200 p-3 rounded-lg flex justify-between items-center hover:bg-slate-800 transition-colors">
                                            <div>
                                                <p className="text-sm text-white font-medium">{log.action}</p>
                                                <p className="text-xs text-slate-400 light:text-slate-600 mt-0.5">{log.target}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-xs text-slate-300 light:text-slate-700">{log.user}</p>
                                                <p className="text-[10px] text-slate-500 font-mono">{log.time}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                );

            default: return null;
        }
    };

    return (
        <div className="space-y-6 pb-12">
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white light:text-slate-800 tracking-tight">Audit & Compliance <span className="text-emerald-400">Hub</span></h1>
                    <p className="text-slate-400 mt-1">Enterprise GRC monitoring and physical verification console</p>
                </div>

                {/* Navigation Tabs */}
                <div className="bg-slate-900/80 p-1.5 rounded-xl border border-white/5 light:border-slate-200 light:border-slate-200 flex gap-1 overflow-x-auto no-scrollbar">
                    {[
                        { id: 'overview', label: 'Overview', icon: BarChart3 },
                        { id: 'planning', label: 'Planning', icon: ClipboardList },
                        { id: 'compliance', label: 'Compliance', icon: CheckCircle2 },
                        { id: 'violations', label: 'Violations', icon: AlertOctagon },
                        { id: 'risk', label: 'Risk & Logs', icon: ShieldCheck }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${activeTab === tab.id ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/25' : 'text-slate-400 hover:text-white light:hover:text-slate-900 hover:bg-white/5'
                                }`}
                        >
                            <tab.icon size={16} />
                            {tab.label}
                        </button>
                    ))}
                </div>
            </header>

            <ActionsNeededBanner
                title="Actions needed"
                items={[
                    ...(auditPlans.filter(p => p.status === 'In Progress').length > 0 ? [{ label: 'Audits in progress', count: auditPlans.filter(p => p.status === 'In Progress').length, icon: ClipboardList, variant: 'primary' }] : []),
                    ...(softwareCompliance.highRiskViolations > 0 ? [{ label: 'High-risk violations', count: softwareCompliance.highRiskViolations, icon: AlertOctagon, variant: 'warning' }] : []),
                    ...(violations.filter(v => v.status !== 'Closed').length > 0 ? [{ label: 'Open violations / CAPA', count: violations.filter(v => v.status !== 'Closed').length, icon: FileText, variant: 'info' }] : []),
                ]}
            />

            {/* Dynamic Content */}
            <div className="min-h-[500px]">
                {renderTabContent()}
            </div>
        </div>
    )
}
