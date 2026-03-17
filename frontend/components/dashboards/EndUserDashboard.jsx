import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { Laptop, Ticket, RefreshCw, User, Briefcase, MapPin, Calendar, Building2, Cpu, X, CheckCircle, AlertCircle, Settings, Sparkles, Quote, ChevronUp, Smartphone, LogOut, Eye, Server, Database, Info, Shield, FileText, ShieldCheck, Globe, ArrowUpRight, Zap, Printer, Monitor, HardDrive, ShoppingCart, Wifi, Hand, VideoOff, Terminal, MousePointer, Keyboard, Headphones, Speaker, Camera, Battery, Bluetooth, Router, Trash2, Edit, BatteryCharging, BatteryWarning, BatteryLow, FileX, Droplet, WifiOff, Clock, Wind, Hash, Scan, List, Copy, MonitorOff, Search, Cable, Palette, ShieldAlert, CloudOff, UserCheck, Box, Chrome, Type, MicOff, Layout, PenTool, Signal, ArrowUpCircle, UserX, Settings2 } from 'lucide-react';
import { useRole } from '@/contexts/RoleContext';
import { useAssetContext, ASSET_STATUS, OWNER_ROLE, REQUEST_STATUS } from '@/contexts/AssetContext';
import { useToast } from '@/components/common/Toast';
import apiClient from '@/lib/apiClient';
import ActionsNeededBanner from '@/components/common/ActionsNeededBanner';

export default function EndUserDashboard() {
    const router = useRouter();
    const toast = useToast();

    // Icon Map for Dynamic Rendering
    const LUCIDE_ICONS = {
        Laptop, Ticket, RefreshCw, User, Briefcase, MapPin, Calendar, Building2, Cpu, X,
        CheckCircle, AlertCircle, Settings, Sparkles, Quote, ChevronUp, Smartphone,
        LogOut, Eye, Server, Database, Info, Shield, FileText, ShieldCheck, Globe,
        ArrowUpRight, Zap, Printer, Monitor, HardDrive, ShoppingCart, Wifi, Hand,
        VideoOff, Terminal, MousePointer, Keyboard, Headphones, Speaker, Camera,
        Battery, Bluetooth, Router, Trash2, Edit, BatteryCharging, BatteryWarning,
        BatteryLow, FileX, Droplet, WifiOff, Clock, Wind, Hash, Scan, List, Copy,
        MonitorOff, Search, Cable, Palette, ShieldAlert, CloudOff, UserCheck,
        Box, Chrome, Type, MicOff, Layout, PenTool, Signal, ArrowUpCircle, UserX, Settings2
    };

    const HighlightText = ({ text, highlight, isInverse = false }) => {
        if (!highlight?.trim() || !text) return <span>{text}</span>;
        const words = highlight.trim().split(/\s+/).filter(w => w.length >= 2);
        if (words.length === 0) return <span>{text}</span>;

        const regex = new RegExp(`(${words.join('|')})`, 'gi');
        const parts = text.split(regex);

        return (
            <span>
                {parts.map((part, i) => (
                    regex.test(part) ?
                        <span key={i} className={`font-black rounded-sm px-0.5 ${isInverse ? 'bg-white/40 text-slate-900 dark:text-white' : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'}`}>{part}</span> :
                        <span key={i}>{part}</span>
                ))}
            </span>
        );
    };
    const { currentRole, setCurrentRole, ROLES, logout, user } = useRole();
    const { assets, requests, tickets, createRequest, managerApproveRequest, managerRejectRequest, managerConfirmIT, userAcceptAsset, refreshData } = useAssetContext();
    const displayProfile = {
        name: user?.name || "Alex Johnson",
        role: currentRole?.slug === 'MANAGER' ? 'Manager' : (currentRole?.label || "Senior Software Engineer"),
        empId: user?.employee_id || "EMP-2024-8821",
        company: user?.company || "Acme Corp Global",
        doj: user?.createdAt ? new Date(user.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : "Recently Joined",
        location: user?.location || "New York HQ, Floor 4",
        email: user?.email || "alex.j@acmecorp.com",
        domain: user?.domain || "General",
        department: user?.department || "General"
    };

    // Filter assets assigned to current user and sort by latest assignment first
    const getAssignedAt = (asset) => {
        // Different code paths / data sources use different keys
        const raw =
            asset?.assignment_date ??
            asset?.assignedDate ??
            asset?.assigned_date ??
            asset?.updated_at ??
            asset?.created_at ??
            null;

        if (!raw) return new Date(0);

        const d = new Date(raw);
        return Number.isNaN(d.getTime()) ? new Date(0) : d;
    };

    const assignedAssets = assets
        .filter(a => {
            const matches = (a.assigned_to?.toLowerCase() === (user?.name || 'Alex Johnson').toLowerCase()) &&
                (a.status === ASSET_STATUS.IN_USE || a.status === 'Active' || a.status === 'Reserved');
            return matches;
        })
        .sort((a, b) => {
            const dateA = getAssignedAt(a);
            const dateB = getAssignedAt(b);
            return dateB - dateA; // Latest first
        });

    const [selectedRequest, setSelectedRequest] = useState(null); // For viewing details
    const [requestFilter, setRequestFilter] = useState('active'); // 'active' | 'history'

    const handleQuickAction = (action) => {
        const routeMap = {
            'profile': '/dashboard/profile',
            'byod': '/dashboard/register-byod',
            'asset': '/dashboard/request-asset',
            'ticket': '/tickets'
        };
        if (routeMap[action]) {
            router.push(routeMap[action]);
        }
    };

    const pendingAcceptance = requests.filter(r => r.status === REQUEST_STATUS.USER_ACCEPTANCE_PENDING).length;
    const managerApprovalsNeeded = (currentRole?.slug === 'MANAGER')
        ? requests.filter(r => r.currentOwnerRole === OWNER_ROLE.MANAGER).length
        : 0;
    const openTicketsCount = tickets.filter(t => !['CLOSED', 'RESOLVED', 'REJECTED', 'CANCELLED'].includes(t.status?.toUpperCase())).length;

    return (
        <div className="space-y-6 relative">
            {/* Offboarding Banner */}
            {user?.status === 'EXITING' && (
                <div className="bg-orange-500/10 border border-orange-500/20 backdrop-blur-md p-6 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-6 animate-in slide-in-from-top duration-500 shadow-xl shadow-orange-500/10 mb-6">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-orange-500/20 flex items-center justify-center text-orange-400 border border-orange-500/20 shadow-sm dark:shadow-inner">
                            <LogOut size={28} />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white">Active Offboarding Workflow</h3>
                            <p className="text-orange-600/70 dark:text-orange-200/70 text-sm mt-0.5">Your exit process has been initiated. Please ensure all company assets are returned to IT.</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Actions needed — same line as banner for all roles */}
            <ActionsNeededBanner
                title="Actions needed"
                items={[
                    ...(pendingAcceptance > 0 ? [{ label: 'Confirm asset acceptance', count: pendingAcceptance, icon: CheckCircle, variant: 'success' }] : []),
                    ...(managerApprovalsNeeded > 0 ? [{ label: 'Team approvals needed', count: managerApprovalsNeeded, icon: Briefcase, variant: 'primary' }] : []),
                    ...(openTicketsCount > 0 ? [{ label: 'Open support tickets', count: openTicketsCount, icon: Ticket, variant: 'warning' }] : []),
                ]}
            />

            {/* User Profile Section - The "Command HUD" */}
            <div className="glass-panel p-10 relative overflow-hidden border border-slate-200 dark:border-white/10 group shadow-2xl bg-white dark:bg-slate-900/40">
                {/* Dynamic Background Accents */}
                <div className="absolute -top-32 -right-32 w-[500px] h-[500px] bg-blue-500/5 blur-[120px] rounded-full group-hover:bg-blue-500/10 transition-all duration-1000"></div>
                <div className="absolute -bottom-32 -left-32 w-[400px] h-[400px] bg-indigo-500/5 blur-[100px] rounded-full group-hover:bg-indigo-500/10 transition-all duration-1000 delay-150"></div>

                <div className="flex flex-col lg:flex-row gap-12 relative z-10">
                    <div className="flex-shrink-0 flex flex-col items-center lg:items-start">
                        <div className="relative group/avatar">
                            <div className="w-32 h-32 rounded-[2rem] bg-gradient-to-br from-indigo-600 via-blue-600 to-sky-600 flex items-center justify-center shadow-[0_0_40px_rgba(37,99,235,0.2)] group-hover/avatar:scale-105 transition-transform duration-700 border border-slate-300 dark:border-white/20">
                                <span className="text-xl font-['Outfit'] font-black text-slate-900 dark:text-white drop-shadow-xl tracking-tighter">
                                    {displayProfile.name.split(' ').map(n => n[0]).join('')}
                                </span>
                            </div>
                            <div className="absolute -bottom-2 -right-2 w-12 h-12 bg-emerald-500 rounded-2xl border-4 border-[#0F172A] flex items-center justify-center shadow-lg animate-pulse">
                                <Shield size={20} className="text-slate-900 dark:text-white" />
                            </div>
                        </div>
                        <div className="mt-8 text-center lg:text-left">
                            <h1 className="text-2xl font-['Outfit'] font-black text-slate-900 dark:text-white tracking-tight mb-2 uppercase">{displayProfile.name}</h1>
                            <div className="flex items-center justify-center lg:justify-start gap-3 bg-indigo-500/10 px-4 py-1.5 rounded-xl border border-indigo-500/20 w-fit backdrop-blur-sm">
                                <Sparkles size={14} className="text-indigo-600 dark:text-indigo-400" />
                                <p className="text-indigo-600 dark:text-indigo-400 font-black text-[10px] uppercase tracking-[0.2em]">{displayProfile.role}</p>
                            </div>
                        </div>
                    </div>

                    <div className="flex-1">
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-8 mb-12">
                            <div className="space-y-1.5 group/item">
                                <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em] block group-hover/item:text-slate-500 dark:text-slate-400 transition-colors">Enterprise ID</label>
                                <p className="text-sm font-black text-slate-500 dark:text-slate-400 dark:text-slate-200 font-mono tracking-tight">{displayProfile.empId}</p>
                            </div>
                            <div className="space-y-1.5 group/item">
                                <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em] block group-hover/item:text-slate-500 dark:text-slate-400 transition-colors">Department</label>
                                <p className="text-sm font-black text-slate-500 dark:text-slate-400 dark:text-slate-200 uppercase tracking-tight">{displayProfile.department}</p>
                            </div>
                            <div className="space-y-1.5 group/item">
                                <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em] block group-hover/item:text-slate-700 dark:group-hover/item:text-slate-500 dark:text-slate-400 transition-colors">Domain Sync</label>
                                <p className="text-sm font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-tight">{displayProfile.domain?.replace('/', ' / ')}</p>
                            </div>
                            <div className="space-y-1.5 group/item">
                                <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em] block group-hover/item:text-slate-500 dark:text-slate-400 transition-colors">Deployment Date</label>
                                <p className="text-sm font-black text-slate-500 dark:text-slate-400 dark:text-slate-200 tracking-tight">{displayProfile.doj}</p>
                            </div>
                            <div className="space-y-1.5 group/item">
                                <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em] block group-hover/item:text-slate-500 dark:text-slate-400 transition-colors">Base Location</label>
                                <p className="text-sm font-black text-slate-500 dark:text-slate-400 dark:text-slate-200 tracking-tight">{displayProfile.location}</p>
                            </div>
                            <div className="space-y-1.5 group/item">
                                <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em] block group-hover/item:text-slate-500 dark:text-slate-400 transition-colors">Verified Email</label>
                                <p className="text-sm font-black text-slate-500 dark:text-slate-400 italic tracking-tight">{displayProfile.email}</p>
                            </div>
                        </div>

                        {/* Quick Action Grid - Premium Cards */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-5">
                            {[
                                { id: 'profile', icon: User, label: 'Manage Profile', color: 'indigo', action: () => handleQuickAction('profile') },
                                { id: 'byod', icon: Smartphone, label: 'Register BYOD', color: 'sky', action: () => handleQuickAction('byod') },
                                { id: 'asset', icon: Laptop, label: 'Request Asset', color: 'blue', action: () => handleQuickAction('asset') },
                                { id: 'ticket', icon: Ticket, label: 'Get Support', color: 'rose', action: () => handleQuickAction('ticket') }
                            ].map((item) => (
                                <button
                                    key={item.id}
                                    onClick={item.action}
                                    className="p-5 rounded-2xl bg-slate-100 dark:bg-white/[0.03] border border-slate-200 dark:border-white/5 hover:border-slate-300 dark:hover:border-slate-300 dark:border-white/20 hover:bg-slate-200 dark:hover:bg-white/[0.06] transition-all group/btn flex flex-col items-center text-center gap-3 relative overflow-hidden active:scale-95"
                                >
                                    <div className={`absolute inset-0 bg-gradient-to-br from-${item.color}-500/10 to-transparent opacity-0 group-hover/btn:opacity-100 transition-opacity`}></div>
                                    <div className={`w-12 h-12 rounded-xl bg-${item.color}-500/10 flex items-center justify-center border border-${item.color}-500/20 group-hover/btn:scale-110 transition-transform duration-500 relative z-10 shadow-lg shadow-${item.color}-500/5`}>
                                        <item.icon size={22} className={`text-${item.color}-600 dark:text-${item.color}-400 group-hover/btn:text-${item.color}-500 dark:group-hover/btn:text-${item.color}-300`} />
                                    </div>
                                    <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em] relative z-10 group-hover/btn:text-indigo-600 dark:group-hover/btn:text-slate-900 dark:text-white transition-colors">{item.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Assigned Assets Detail */}
                    <div className="lg:col-span-2 space-y-8">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20 shadow-lg shadow-blue-500/5">
                                    <Laptop className="text-blue-400" size={24} />
                                </div>
                                <div>
                                    <h3 className="text-2xl font-['Outfit'] font-black text-slate-900 dark:text-white tracking-tight uppercase">Assigned Fleet</h3>
                                    <p className="text-[10px] text-slate-500 dark:text-slate-400 font-black uppercase tracking-[0.2em] mt-1">Managed Enterprise Devices</p>
                                </div>
                            </div>
                            <span className="px-3 py-1 bg-slate-100 dark:bg-white/5 rounded-lg border border-slate-200 dark:border-white/10 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">{assignedAssets.length} Active Units</span>
                        </div>

                        {assignedAssets.length === 0 ? (
                            <div className="glass-panel p-16 text-center border-dashed border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.01]">
                                <div className="w-20 h-20 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center mx-auto mb-6 border border-slate-200 dark:border-white/5 shadow-sm dark:shadow-inner">
                                    <Laptop className="text-slate-700 dark:text-slate-300" size={40} />
                                </div>
                                <h4 className="text-lg font-['Outfit'] font-black text-slate-500 dark:text-slate-400 dark:text-slate-400 uppercase tracking-widest mb-2">No Active Inventory</h4>
                                <p className="text-slate-500 dark:text-slate-400 italic text-sm max-w-xs mx-auto">No corporate assets are currently registered to your operational profile.</p>
                            </div>
                        ) : assignedAssets.map((asset) => (
                            <div key={asset.id} className="glass-panel p-0 overflow-hidden group hover:border-blue-500/40 transition-all duration-700 border border-slate-200 dark:border-white/10 shadow-xl bg-white dark:bg-slate-900/60">
                                <div className="p-8 border-b border-slate-100 dark:border-white/5 bg-gradient-to-r from-blue-500/[0.07] to-transparent flex justify-between items-center relative overflow-hidden">
                                    {/* Decorative Background Icon */}
                                    <Laptop className="absolute -right-8 -bottom-8 w-32 h-32 text-slate-900 dark:text-white/[0.02] -rotate-12" />

                                    <div className="flex items-center gap-6 relative z-10">
                                        <div className="w-16 h-16 rounded-[1.25rem] bg-slate-200 dark:bg-slate-950/80 flex items-center justify-center text-blue-500 dark:text-blue-400 border border-slate-300 dark:border-white/10 shadow-2xl group-hover:scale-105 transition-transform duration-500">
                                            {asset.type?.toLowerCase().includes('laptop') ? <Laptop size={32} /> : <Smartphone size={32} />}
                                        </div>
                                        <div>
                                            <h4 className="text-xl font-['Outfit'] font-black text-slate-900 dark:text-white leading-tight uppercase tracking-tight">
                                                {asset.name}
                                                {asset.model && asset.model !== asset.name && <span className="text-slate-500 dark:text-slate-400 font-bold text-xs ml-3 lowercase">[{asset.model}]</span>}
                                            </h4>
                                            <div className="flex items-center gap-4 mt-2.5">
                                                <div className="flex items-center gap-2 px-2.5 py-1 bg-blue-500/10 rounded-lg border border-blue-500/20">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
                                                    <span className="text-[9px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest">{asset.vendor || 'Standard OEM'}</span>
                                                </div>
                                                <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-white/5 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-white/5">SRL: {asset.serial_number || 'ST-2024-XXXX'}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right relative z-10">
                                        <div className="flex items-center gap-2 justify-end mb-2">
                                            <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.5)] animate-pulse"></div>
                                            <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-[0.2em]">Operational</span>
                                        </div>
                                        <p className="text-[9px] text-slate-500 dark:text-slate-400 uppercase tracking-widest font-black flex items-center gap-2 justify-end">
                                            <Calendar size={10} /> {asset.assignment_date || 'Recent Sync'}
                                        </p>
                                    </div>
                                </div>

                                <div className="p-10 bg-slate-50/50 dark:bg-black/20 backdrop-blur-sm">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                                        <div className="space-y-6">
                                            <div className="flex items-center justify-between border-b border-black/5 dark:border-white/5 pb-3">
                                                <p className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.3em]">Neural Registry</p>
                                                <Cpu size={14} className="text-slate-500 dark:text-slate-400 dark:text-slate-600" />
                                            </div>
                                            <div className="grid grid-cols-1 gap-3">
                                                {Object.entries(asset.specifications || asset.specs || {}).map(([key, value]) => {
                                                    const strVal = String(value ?? '');
                                                    let SpecIcon = Info;
                                                    const k = key.toLowerCase();
                                                    if (k.includes('cpu')) SpecIcon = Cpu;
                                                    else if (k.includes('ram') || k.includes('storage')) SpecIcon = Database;
                                                    else if (k.includes('ip') || k.includes('mac') || k.includes('network')) SpecIcon = Server;

                                                    return (
                                                        <div key={key} className="flex items-center justify-between p-4 rounded-xl bg-slate-100/50 dark:bg-white/[0.02] border border-slate-200/50 dark:border-white/5 hover:bg-slate-200/50 dark:hover:bg-slate-100 dark:bg-white/[0.05] transition-all group/spec">
                                                            <div className="flex items-center gap-4">
                                                                <SpecIcon size={14} className="text-slate-500 dark:text-slate-400 group-hover/spec:text-blue-400 transition-colors" />
                                                                <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest group-hover/spec:text-slate-500 dark:text-slate-400">{key}</span>
                                                            </div>
                                                            <span className="text-xs font-black text-slate-700 dark:text-slate-200 uppercase tracking-tighter">{strVal || 'UNSET'}</span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                        <div className="space-y-6">
                                            <div className="space-y-4">
                                                <p className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em]">Deployment Intelligence</p>
                                                <div className="space-y-2">
                                                    <div className="flex items-center gap-3 p-3 rounded-xl bg-indigo-500/5 border border-indigo-500/10">
                                                        <MapPin size={16} className="text-amber-500" />
                                                        <div>
                                                            <p className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Work Zone</p>
                                                            <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{asset.location || 'Remote HQ'}</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-3 p-3 rounded-xl bg-blue-500/5 border border-blue-500/10">
                                                        <Calendar size={16} className="text-blue-400" />
                                                        <div>
                                                            <p className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Compliance Audit</p>
                                                            <p className="text-sm font-bold text-slate-700 dark:text-slate-200">Scheduled: 15 Sept 2024</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex gap-4 pt-2">
                                                <button
                                                    onClick={() => handleQuickAction('ticket')}
                                                    className="flex-1 py-2.5 rounded-xl border border-rose-500/20 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 text-[11px] font-black uppercase tracking-widest transition-all"
                                                >
                                                    Report Issue
                                                </button>
                                                <button
                                                    onClick={() => handleQuickAction('asset')}
                                                    className="flex-1 py-2.5 rounded-xl border border-blue-500/20 text-blue-600 dark:text-blue-400 hover:bg-blue-500/10 text-[11px] font-black uppercase tracking-widest transition-all"
                                                >
                                                    Upgrade Request
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Sidebar Widgets */}
                    <div className="space-y-8">
                        {/* Procurement & Support Sync */}
                        <div className="glass-card p-8 border border-slate-200 dark:border-white/10 space-y-10 shadow-xl relative overflow-hidden bg-white dark:bg-slate-900/40">
                            <div className="absolute -top-12 -right-12 w-32 h-32 bg-indigo-500/5 blur-[60px] rounded-full"></div>

                            {/* Filter Toggle */}
                            <div className="flex bg-slate-100 dark:bg-slate-950/60 rounded-xl p-1 border border-slate-200 dark:border-white/5 h-11 relative z-10">
                                <button
                                    onClick={() => setRequestFilter('active')}
                                    className={`flex-1 text-[10px] font-black uppercase tracking-[0.2em] rounded-lg transition-all ${requestFilter === 'active' ? 'bg-indigo-600 text-slate-900 dark:text-white shadow-lg shadow-indigo-500/20' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:text-slate-300'}`}
                                >
                                    Active Trace
                                </button>
                                <button
                                    onClick={() => setRequestFilter('history')}
                                    className={`flex-1 text-[10px] font-black uppercase tracking-[0.2em] rounded-lg transition-all ${requestFilter === 'history' ? 'bg-indigo-600 text-slate-900 dark:text-white shadow-lg shadow-indigo-500/20' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:text-slate-300'}`}
                                >
                                    Audit Logs
                                </button>
                            </div>

                            {/* Asset Procurement Stream */}
                            <div className="space-y-6 relative z-10">
                                <div className="flex items-center justify-between border-b border-black/5 dark:border-white/5 pb-3">
                                    <div className="flex items-center gap-3">
                                        <Briefcase size={18} className="text-blue-400" />
                                        <h3 className="text-[11px] font-black text-slate-900 dark:text-white uppercase tracking-[0.3em]">Procurement</h3>
                                    </div>
                                    <button onClick={() => refreshData?.()} className="p-1.5 hover:bg-black/5 dark:hover:bg-slate-100 dark:bg-white/5 rounded-lg transition-colors group">
                                        <RefreshCw size={14} className="text-slate-500 dark:text-slate-400 group-hover:rotate-180 transition-transform duration-700" />
                                    </button>
                                </div>

                                <div className="space-y-4 max-h-[350px] overflow-y-auto custom-scrollbar pr-2">
                                    {requests.filter(req => {
                                        const isCompleted = ['FULFILLED', 'REJECTED', 'CLOSED', 'CANCELLED'].includes(req.status);
                                        return requestFilter === 'active' ? !isCompleted : isCompleted;
                                    }).length === 0 ? (
                                        <div className="text-center py-12 opacity-50 bg-slate-50 dark:bg-white/[0.01] rounded-2xl border border-dashed border-slate-200 dark:border-white/5">
                                            <p className="text-[10px] font-black text-slate-500 dark:text-slate-400 dark:text-slate-600 uppercase tracking-widest">No Signals Detected</p>
                                        </div>
                                    ) : requests.filter(req => {
                                        const isCompleted = ['FULFILLED', 'REJECTED', 'CLOSED', 'CANCELLED'].includes(req.status);
                                        return requestFilter === 'active' ? !isCompleted : isCompleted;
                                    })
                                        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
                                        .map(req => (
                                            <div key={req.id} onClick={() => setSelectedRequest(req)} className="p-4 rounded-xl glass-interactive border border-slate-200 dark:border-white/5 group">
                                                <div className="flex justify-between items-start mb-3">
                                                    <span className={`px-2 py-0.5 text-[9px] font-black uppercase tracking-widest rounded-lg border 
                                        ${req.status === 'FULFILLED' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                                            req.status === 'REJECTED' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' :
                                                                'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'}`}>
                                                        {req.status}
                                                    </span>
                                                    <span className="text-[9px] font-mono text-slate-500 dark:text-slate-400">{new Date(req.createdAt).toLocaleDateString()}</span>
                                                </div>
                                                <h4 className="text-xs font-black text-slate-700 dark:text-slate-300 group-hover:text-indigo-400 transition-colors mb-2 uppercase tracking-tight">{req.assetType} Provisioning</h4>

                                                {req.status === REQUEST_STATUS.USER_ACCEPTANCE_PENDING && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            if (confirm(`Confirm you have received the ${req.assetType}?`)) {
                                                                userAcceptAsset(req.id);
                                                            }
                                                        }}
                                                        className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-slate-900 dark:text-white text-[10px] font-black uppercase tracking-widest rounded-xl shadow-lg shadow-emerald-500/20 transition-all active:scale-95 flex items-center justify-center gap-2 mt-3"
                                                    >
                                                        <CheckCircle size={14} /> Confirm Receipt
                                                    </button>
                                                )}
                                                <div className="mt-4 flex items-center justify-between text-[10px] border-t border-black/5 dark:border-white/5 pt-3">
                                                    <span className="text-slate-500 dark:text-slate-400 dark:text-slate-600 font-black uppercase tracking-widest">Ownership</span>
                                                    <span className="text-indigo-600 dark:text-indigo-400 font-black uppercase tracking-widest bg-indigo-500/5 px-2 py-0.5 rounded border border-indigo-500/10">{req.currentOwnerRole}</span>
                                                </div>
                                            </div>
                                        ))}
                                </div>
                            </div>

                            {/* Support Channel Trace */}
                            <div className="space-y-6 pt-10 border-t border-black/5 dark:border-white/5 relative z-10">
                                <div className="flex items-center gap-3 border-b border-black/5 dark:border-white/5 pb-3">
                                    <Ticket size={18} className="text-rose-500 dark:text-rose-400" />
                                    <h3 className="text-[11px] font-black text-slate-900 dark:text-white uppercase tracking-[0.3em]">Support Tickets</h3>
                                </div>

                                <div className="space-y-4 max-h-[350px] overflow-y-auto custom-scrollbar pr-2">
                                    {tickets.filter(t => {
                                        const isCompleted = ['CLOSED', 'RESOLVED', 'REJECTED', 'CANCELLED'].includes(t.status?.toUpperCase());
                                        return requestFilter === 'active' ? !isCompleted : isCompleted;
                                    }).length === 0 ? (
                                        <div className="text-center py-12 opacity-50 bg-white dark:bg-white/[0.01] rounded-2xl border border-dashed border-slate-200 dark:border-white/5">
                                            <p className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em]">All Clear</p>
                                        </div>
                                    ) : tickets.filter(t => {
                                        const isCompleted = ['CLOSED', 'RESOLVED', 'REJECTED', 'CANCELLED'].includes(t.status?.toUpperCase());
                                        return requestFilter === 'active' ? !isCompleted : isCompleted;
                                    })
                                        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
                                        .map(ticket => (
                                            <div key={ticket.id} onClick={() => setSelectedRequest(ticket)} className="p-4 rounded-xl glass-interactive border border-slate-200 dark:border-white/5 group">
                                                <div className="flex justify-between items-start mb-3">
                                                    <span className={`px-2 py-0.5 text-[9px] font-black uppercase tracking-widest rounded-lg border 
                                        ${ticket.status === 'RESOLVED' || ticket.status === 'CLOSED' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                                            ticket.priority === 'HIGH' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' :
                                                                'bg-blue-500/10 text-blue-400 border-blue-500/20'}`}>
                                                        {ticket.status}
                                                    </span>
                                                    <span className="text-[9px] font-mono text-slate-500 dark:text-slate-400">{new Date(ticket.createdAt).toLocaleDateString()}</span>
                                                </div>
                                                <h4 className="text-xs font-black text-slate-700 dark:text-slate-300 group-hover:text-rose-400 transition-colors mb-1 truncate uppercase tracking-tight">{ticket.subject || 'Incident Report'}</h4>
                                                <div className="flex items-center justify-between mb-4">
                                                    <p className="text-[9px] text-slate-500 dark:text-slate-400 font-black uppercase tracking-[0.2em]">{ticket.category}</p>
                                                    {ticket.related_asset_id && (
                                                        <div className="flex items-center gap-1.5 px-2 py-0.5 bg-blue-500/5 rounded-lg border border-blue-500/10">
                                                            <Laptop size={10} className="text-blue-400" />
                                                            <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest">
                                                                {assignedAssets.find(a => a.id === ticket.related_asset_id)?.name || 'Linked Asset'}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="flex items-center justify-between mt-2 pt-3 border-t border-slate-200 dark:border-white/5">
                                                    <div className="flex items-center gap-2">
                                                        <div className={`w-1.5 h-1.5 rounded-full ${ticket.priority === 'HIGH' ? 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]' : 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]'}`}></div>
                                                        <span className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">{ticket.priority} IMPACT</span>
                                                    </div>
                                                    {ticket.resolution_percentage > 0 && (
                                                        <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest bg-indigo-500/5 px-2 py-0.5 rounded border border-indigo-500/10">{Math.round(ticket.resolution_percentage)}% DONE</span>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                </div>
                            </div>

                            {/* IT Advisory */}
                            <div className="pt-10 border-t border-black/5 dark:border-white/5 relative z-10">
                                <h3 className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.4em] mb-6">Operational Advisory</h3>
                                <div className="space-y-4">
                                    {[
                                        { label: 'Cloud Access Protocol', icon: Server, color: 'text-blue-500 dark:text-blue-400' },
                                        { label: 'Multi-Factor Validation', icon: Database, color: 'text-indigo-500 dark:text-indigo-400' },
                                        { label: 'Asset Custody Standards', icon: Briefcase, color: 'text-emerald-500 dark:text-emerald-400' }
                                    ].map((policy, i) => (
                                        <div key={i} className="flex items-center gap-4 group cursor-pointer p-2 hover:bg-black/[0.02] dark:hover:bg-slate-50 dark:bg-white/[0.02] rounded-lg transition-all">
                                            <div className="w-1.5 h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 transition-all group-hover:bg-indigo-500 group-hover:scale-125"></div>
                                            <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200 transition-colors uppercase tracking-[0.15em]">{policy.label}</span>
                                            <policy.icon size={12} className={`ml-auto opacity-0 group-hover:opacity-100 transition-opacity ${policy.color}`} />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div >

                {/* Quick Policies */}
                <div className="glass-card p-8 border border-slate-200 dark:border-white/10 shadow-xl relative overflow-hidden group bg-white dark:bg-slate-900/40">
                    <div className="absolute -top-12 -left-12 w-32 h-32 bg-indigo-500/5 blur-[60px] rounded-full group-hover:bg-indigo-500/10 transition-all duration-700"></div>
                    <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-[0.3em] mb-6 flex items-center gap-2 relative z-10">
                        <Shield size={16} className="text-indigo-600 dark:text-indigo-400" /> Operational Policies
                    </h3>
                    <div className="space-y-4 relative z-10">
                        {[
                            { label: 'Acceptable Use Protocol', icon: FileText },
                            { label: 'Data Security Standards', icon: ShieldCheck },
                            { label: 'Remote Connectivity Guidelines', icon: Globe }
                        ].map((item, i) => (
                            <div key={i} className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 hover:bg-slate-100 dark:hover:bg-slate-100 dark:bg-white/[0.05] hover:border-indigo-500/30 transition-all cursor-pointer group/policy">
                                <div className="flex items-center gap-4">
                                    <item.icon size={14} className="text-slate-500 dark:text-slate-400 group-hover/policy:text-indigo-600 dark:group-hover/policy:text-indigo-400 transition-colors" />
                                    <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 group-hover/policy:text-slate-800 dark:group-hover/policy:text-slate-200 uppercase tracking-widest">{item.label}</span>
                                </div>
                                <ArrowUpRight size={12} className="text-slate-700 dark:text-slate-300 group-hover/policy:text-indigo-600 dark:group-hover/policy:text-indigo-400 transition-all group-hover/policy:translate-x-0.5 group-hover/policy:-translate-y-0.5" />
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* MANAGER APPROVAL SECTION */}
            {
                (currentRole?.slug === 'MANAGER') && (
                    <div className="glass-panel p-10 border border-indigo-500/30 mt-12 shadow-2xl relative overflow-hidden group bg-white dark:bg-slate-900/40">
                        {/* Decorative Glow */}
                        <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-indigo-500/5 blur-[100px] rounded-full group-hover:bg-indigo-500/10 transition-all duration-700"></div>

                        <div className="flex items-center justify-between mb-10 relative z-10">
                            <div className="flex items-center gap-5">
                                <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20 shadow-lg shadow-indigo-500/5">
                                    <Briefcase className="text-indigo-400" size={32} />
                                </div>
                                <div>
                                    <h3 className="text-2xl font-['Outfit'] font-black text-slate-900 dark:text-white tracking-tight uppercase">Managerial Authorization</h3>
                                    <p className="text-[10px] text-slate-500 dark:text-slate-400 font-black uppercase tracking-[0.2em] mt-1 flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
                                        Team Provisioning Queue
                                    </p>
                                </div>
                            </div>
                            <span className="px-5 py-2 bg-indigo-500/10 text-indigo-400 text-[10px] font-black uppercase tracking-[0.2em] border border-indigo-500/20 rounded-xl">
                                {requests.filter(r => r.currentOwnerRole === OWNER_ROLE.MANAGER).length} Pending
                            </span>
                        </div>

                        {requests.filter(r => r.currentOwnerRole === OWNER_ROLE.MANAGER).length === 0 ? (
                            <div className="text-center py-16 bg-slate-50 dark:bg-white/[0.01] rounded-3xl border border-dashed border-slate-200 dark:border-white/5 relative z-10">
                                <CheckCircle className="text-slate-700 dark:text-slate-300 mx-auto mb-4" size={48} />
                                <p className="text-sm font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Queue Synchronized</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
                                {requests.filter(r => r.currentOwnerRole === OWNER_ROLE.MANAGER).map(req => (
                                    <div key={req.id} className="p-8 rounded-[2.5rem] bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 flex flex-col justify-between group/task hover:bg-slate-100 dark:bg-white/[0.05] hover:border-indigo-500/30 transition-all shadow-xl">
                                        <div>
                                            <div className="flex items-center justify-between gap-4 mb-6">
                                                <div className="flex items-center gap-4">
                                                    <h4 className="text-lg font-['Outfit'] font-black text-slate-900 dark:text-white uppercase tracking-tight ">{req.assetType} Request</h4>
                                                    {req.assetType === 'BYOD' && <span className="text-[10px] font-black bg-sky-500/20 text-sky-400 px-2 py-0.5 rounded-lg border border-sky-500/20 uppercase tracking-widest">BYOD</span>}
                                                </div>
                                                <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 lowercase">{new Date(req.createdAt).toLocaleDateString()}</span>
                                            </div>
                                            <div className="space-y-4 mb-8">
                                                <div className="p-4 rounded-2xl bg-slate-100 dark:bg-black/20 border border-slate-200 dark:border-white/5">
                                                    <p className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1">Requester Signature</p>
                                                    <p className="text-sm font-black text-slate-900 dark:text-slate-200 uppercase">{req.requestedBy?.name || req.requester_name}</p>
                                                    <p className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold italic mt-0.5">{req.requestedBy?.email || req.requester_email || 'SECURE_CHANNEL_NO_MAIL'}</p>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2">Justification Trace</p>
                                                    <p className="text-xs text-slate-500 dark:text-slate-400 italic bg-slate-50 dark:bg-white/5 p-4 rounded-2xl border border-slate-200 dark:border-white/5 leading-relaxed">
                                                        "{req.justification || req.reason || 'No mission objective provided'}"
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex gap-4 pt-6 border-t border-slate-200 dark:border-white/5">
                                            <button
                                                onClick={() => setSelectedRequest(req)}
                                                className="flex-1 py-3 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:bg-white/10 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-white rounded-xl transition-all flex items-center justify-center gap-2 border border-slate-300 dark:border-white/10 active:scale-95"
                                            >
                                                <Eye size={18} /> <span className="text-[10px] font-black uppercase tracking-widest">Inspect</span>
                                            </button>
                                            <button
                                                onClick={() => {
                                                    const reason = prompt("Reason for rejection:");
                                                    if (reason) managerRejectRequest(req.id, reason, user.id, user.name);
                                                }}
                                                className="flex-1 py-3 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-xl border border-rose-500/20 transition-all flex items-center justify-center gap-2 active:scale-95"
                                            >
                                                <X size={18} /> <span className="text-[10px] font-black uppercase tracking-widest">Deny</span>
                                            </button>
                                            <button
                                                onClick={() => managerApproveRequest(req.id, user.id, user.name)}
                                                className="flex-[2] py-3 bg-indigo-600 hover:bg-indigo-500 text-slate-900 dark:text-white rounded-xl shadow-lg shadow-indigo-500/20 transition-all flex items-center justify-center gap-2 active:scale-105"
                                            >
                                                <CheckCircle size={18} /> <span className="text-[10px] font-black uppercase tracking-widest">Authorize</span>
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )
            } {/* MANAGER HISTORY */}
            <div className="mt-8 pt-6 border-t border-slate-200 dark:border-white/5">
                <h4 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4">Request History</h4>
                <div className="space-y-3">
                    {requests.filter(r => r.currentOwnerRole !== OWNER_ROLE.MANAGER).length === 0 ? (
                        <p className="text-slate-500 dark:text-slate-400 text-xs italic">No history available.</p>
                    ) : requests.filter(r => r.currentOwnerRole !== OWNER_ROLE.MANAGER).map(req => (
                        <div key={req.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-white/5 rounded-lg border border-slate-200 dark:border-white/5 opacity-75 hover:opacity-100 transition-opacity">
                            <div className="flex items-center gap-3">
                                <div className={`w-2 h-2 rounded-full ${req.status === 'REJECTED' ? 'bg-rose-500' : 'bg-emerald-500'}`}></div>
                                <div>
                                    <p className="text-sm font-medium text-slate-900 dark:text-white">{req.assetType} Request</p>
                                    <div className="flex flex-col mt-0.5">
                                        <p className="text-xs text-slate-500 dark:text-slate-400">Sent by: <span className="text-slate-700 dark:text-slate-200">{req.requestedBy?.name || req.requester_name}</span></p>
                                        <div className="flex flex-col mt-0.5">
                                            <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[180px] italic">{req.requestedBy?.email || req.requester_email}</p>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <span className="text-xs text-indigo-400 font-medium">Dept: {req.requester_department || 'General'}</span>
                                                <span className="text-xs text-slate-500 dark:text-slate-400">{new Date(req.createdAt).toLocaleString()}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => setSelectedRequest(req)}
                                    className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-slate-900 dark:text-white text-xs font-medium rounded-lg border border-slate-200 dark:border-white/10 transition-colors"
                                >
                                    <Eye size={14} />
                                    View
                                </button>
                                <div className="text-right">
                                    <span className={`text-xs px-2 py-1 rounded border ${req.status === 'MANAGER_APPROVED' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                                        req.status === 'REJECTED' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' :
                                            'bg-slate-500/10 text-slate-500 dark:text-slate-400'
                                        }`}>
                                        {req.status}
                                    </span>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Current: {req.currentOwnerRole}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Modal Logic removed in favor of dedicated pages */}

            {/* Request Details Modal */}
            {/* Integrated Detail Modal - The "Tactical Briefing" */}
            {
                selectedRequest && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8 animate-in fade-in duration-300">
                        <div className="absolute inset-0 bg-slate-50 dark:bg-slate-950/40 dark:bg-slate-950/80 backdrop-blur-md" onClick={() => setSelectedRequest(null)}></div>

                        <div className="glass-panel w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col relative z-10 border border-slate-200 dark:border-white/10 shadow-[0_0_100px_rgba(0,0,0,0.1)] dark:shadow-[0_0_100px_rgba(37,99,235,0.15)] animate-in zoom-in-95 duration-300 bg-white dark:bg-slate-900/90">
                            {/* Modal Header */}
                            <div className="p-8 border-b border-black/5 dark:border-white/10 bg-gradient-to-r from-indigo-500/5 dark:from-indigo-500/10 via-transparent to-transparent flex justify-between items-center relative overflow-hidden">
                                <div className="absolute -top-12 -left-12 w-32 h-32 bg-indigo-500/5 dark:bg-indigo-500/10 blur-[60px] rounded-full"></div>
                                <div className="flex items-center gap-6 relative z-10">
                                    <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20 shadow-lg shadow-indigo-500/5">
                                        {selectedRequest.priority ? <Ticket size={32} className="text-rose-600 dark:text-rose-400" /> : <Briefcase size={32} className="text-blue-600 dark:text-blue-400" />}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-3 mb-1.5">
                                            <span className={`px-2.5 py-1 text-[10px] font-black uppercase tracking-widest rounded-lg border 
                                ${selectedRequest.status === 'FULFILLED' || selectedRequest.status === 'RESOLVED' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' :
                                                    selectedRequest.status === 'REJECTED' ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20' :
                                                        'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20'}`}>
                                                {selectedRequest.status}
                                            </span>
                                            <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-white/5 px-2 py-1 rounded-lg border border-slate-200 dark:border-white/5">ID: {selectedRequest.id?.slice(-8).toUpperCase() || 'SYS-TRACE'}</span>
                                        </div>
                                        <h2 className="text-2xl font-['Outfit'] font-black text-slate-900 dark:text-white uppercase tracking-tight">
                                            {selectedRequest.assetType ? `${selectedRequest.assetType} Provisioning` : (selectedRequest.subject || 'Incident Briefing')}
                                        </h2>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setSelectedRequest(null)}
                                    className="p-3 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-slate-200 dark:bg-white/10 rounded-2xl border border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-900 dark:text-white transition-all active:scale-90"
                                >
                                    <X size={24} />
                                </button>
                            </div>

                            {/* Modal Content */}
                            <div className="flex-1 overflow-y-auto p-10 custom-scrollbar space-y-12">
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                                    {/* Left Column: Context */}
                                    <div className="space-y-10">
                                        <section>
                                            <h4 className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.3em] mb-6 flex items-center gap-2">
                                                <Info size={14} className="text-blue-400" /> Executive Summary
                                            </h4>
                                            <div className="glass-panel p-6 bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5">
                                                <p className="text-sm text-slate-500 dark:text-slate-400 dark:text-slate-200 leading-relaxed font-medium italic">
                                                    "{selectedRequest.justification || selectedRequest.description || selectedRequest.reason || 'No detailed briefing provided.'}"
                                                </p>
                                            </div>
                                        </section>

                                        <section>
                                            <h4 className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.3em] mb-6">Object Parameters</h4>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="p-4 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5">
                                                    <p className="text-[9px] font-black text-slate-500 dark:text-slate-400 dark:text-slate-600 uppercase tracking-widest mb-1">Category</p>
                                                    <p className="text-xs font-black text-slate-700 dark:text-slate-200 uppercase">{selectedRequest.category || selectedRequest.assetType || 'GENERAL'}</p>
                                                </div>
                                                <div className="p-4 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5">
                                                    <p className="text-[9px] font-black text-slate-500 dark:text-slate-400 dark:text-slate-600 uppercase tracking-widest mb-1">Established</p>
                                                    <p className="text-xs font-black text-slate-700 dark:text-slate-200 uppercase">{new Date(selectedRequest.createdAt || selectedRequest.created_at).toLocaleDateString()}</p>
                                                </div>
                                                {selectedRequest.related_asset_id && (
                                                    <div className="p-4 rounded-xl bg-blue-500/5 dark:bg-blue-500/5 border border-blue-500/10 col-span-2">
                                                        <p className="text-[9px] font-black text-blue-600 dark:text-blue-500 uppercase tracking-widest mb-1 flex items-center gap-2">
                                                            <Laptop size={10} /> Target Asset
                                                        </p>
                                                        <p className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase">
                                                            {assignedAssets.find(a => a.id === selectedRequest.related_asset_id)?.name || 'Linked Asset'}
                                                            <span className="text-[10px] text-slate-500 dark:text-slate-400 ml-2 font-normal lowercase">({selectedRequest.related_asset_id.slice(0, 8)})</span>
                                                        </p>
                                                    </div>
                                                )}
                                                {selectedRequest.priority && (
                                                    <div className="p-4 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5">
                                                        <p className="text-[9px] font-black text-slate-500 dark:text-slate-400 dark:text-slate-600 uppercase tracking-widest mb-1">Priority</p>
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></div>
                                                            <p className="text-xs font-black text-rose-600 dark:text-rose-400 uppercase">{selectedRequest.priority} IMPACT</p>
                                                        </div>
                                                    </div>
                                                )}
                                                <div className="p-4 rounded-xl bg-indigo-500/5 dark:bg-indigo-500/5 border border-indigo-500/10 dark:border-indigo-500/10">
                                                    <p className="text-[9px] font-black text-indigo-600 dark:text-indigo-500 uppercase tracking-widest mb-1">Custody</p>
                                                    <p className="text-xs font-black text-indigo-600 dark:text-indigo-400 uppercase">{selectedRequest.currentOwnerRole || 'RESOLVED'}</p>
                                                </div>
                                            </div>
                                        </section>
                                    </div>

                                    {/* Right Column: Analytics & Status */}
                                    <div className="space-y-10">
                                        <section>
                                            <h4 className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.3em] mb-6 flex items-center gap-2">
                                                <Zap size={14} className="text-amber-400" /> Deployment Logistics
                                            </h4>
                                            <div className="space-y-4">
                                                {selectedRequest.resolution_percentage >= 0 && (
                                                    <div className="glass-panel p-6 border border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-transparent">
                                                        <div className="flex justify-between items-center mb-4">
                                                            <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 dark:text-slate-400 uppercase tracking-widest">Protocol Resolution</span>
                                                            <span className="text-xl font-['Outfit'] font-black text-indigo-600 dark:text-indigo-400">{Math.round(selectedRequest.resolution_percentage)}%</span>
                                                        </div>
                                                        <div className="h-2 w-full bg-slate-200 dark:bg-slate-900 rounded-full overflow-hidden border border-slate-300 dark:border-white/5">
                                                            <div
                                                                className="h-full bg-gradient-to-r from-indigo-600 to-blue-400 transition-all duration-1000"
                                                                style={{ width: `${selectedRequest.resolution_percentage}%` }}
                                                            ></div>
                                                        </div>
                                                    </div>
                                                )}

                                                {selectedRequest.rejectionReason && (
                                                    <div className="glass-panel p-6 bg-rose-500/5 dark:bg-rose-500/5 border border-rose-500/20 dark:border-rose-500/20">
                                                        <h4 className="text-[10px] font-black text-rose-600 dark:text-rose-400 uppercase tracking-[0.2em] mb-3 flex items-center gap-2">
                                                            <AlertCircle size={14} /> Protocol Terminated
                                                        </h4>
                                                        <p className="text-xs text-rose-600 dark:text-rose-300 italic leading-relaxed">"{selectedRequest.rejectionReason}"</p>
                                                    </div>
                                                )}

                                                {!selectedRequest.rejectionReason && !selectedRequest.resolution_percentage && (
                                                    <div className="glass-panel p-10 border border-slate-200 dark:border-white/5 flex flex-col items-center justify-center text-center bg-slate-50 dark:bg-white/[0.01]">
                                                        <div className="w-16 h-16 bg-indigo-500/10 rounded-full flex items-center justify-center mb-4 border border-indigo-500/20 shadow-lg shadow-indigo-500/5">
                                                            <RefreshCw size={24} className="text-indigo-600 dark:text-indigo-400 animate-spin-slow" />
                                                        </div>
                                                        <p className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.3em]">Syncing Payload Logs...</p>
                                                    </div>
                                                )}
                                            </div>
                                        </section>

                                        {/* Audit Timeline */}
                                        <section>
                                            <h4 className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.3em] mb-8">Operational History</h4>
                                            <div className="space-y-8 relative before:absolute before:left-3.5 before:top-4 before:bottom-0 before:w-px before:bg-slate-200 dark:before:bg-slate-100 dark:bg-white/5">
                                                {(selectedRequest.auditTrail || selectedRequest.timeline || []).map((log, idx) => (
                                                    <div key={idx} className="relative pl-12 group">
                                                        <div className={`absolute left-1 top-0.5 w-5 h-5 rounded-lg border border-slate-200 dark:border-white/10 flex items-center justify-center z-10 transition-transform group-hover:scale-110 shadow-lg
                                            ${(log.action || '').includes('CREATED') ? 'bg-blue-600/20 text-blue-600 dark:text-blue-400 border-blue-500/30' :
                                                                (log.action || '').includes('APPROVE') || (log.action || '').includes('RESOLVE') ? 'bg-emerald-600/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30' :
                                                                    (log.action || '').includes('REJECT') ? 'bg-rose-600/20 text-rose-600 dark:text-rose-400 border-rose-500/30' :
                                                                        'bg-slate-100 dark:bg-slate-700/50 text-slate-500 dark:text-slate-400 dark:text-slate-400 border-slate-200 dark:border-white/10'}`}>
                                                            <div className="w-1.5 h-1.5 rounded-full bg-current"></div>
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <div className="flex justify-between items-start mb-2">
                                                                <span className="text-xs font-black text-slate-700 dark:text-slate-200 uppercase tracking-tight">{log.action || log.status || 'PROTOCOL_UPDATE'}</span>
                                                                <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">{new Date(log.timestamp || log.date).toLocaleString([], { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' })}</span>
                                                            </div>
                                                            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest mb-2 flex items-center gap-2">
                                                                <User size={10} className="text-indigo-600 dark:text-indigo-400 opacity-50" /> {log.byRole || log.role || 'CORE_SYNC'} : {log.byUser || log.user || 'SYSTEM'}
                                                            </p>
                                                            {(log.comment || log.notes) && (
                                                                <div className="text-xs text-slate-500 dark:text-slate-400 italic bg-slate-50 dark:bg-white/[0.03] p-4 rounded-2xl border border-slate-200 dark:border-white/5 relative">
                                                                    <div className="absolute top-2 left-2 text-indigo-600 dark:text-indigo-500/20"><Quote size={8} /></div>
                                                                    {log.comment || log.notes}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </section>
                                    </div>
                                </div>
                            </div>

                            {/* Modal Footer */}
                            <div className="p-8 border-t border-black/5 dark:border-white/10 bg-slate-50 dark:bg-white/[0.03] flex justify-end gap-5 shrink-0 relative z-10">
                                {selectedRequest.status === REQUEST_STATUS.USER_ACCEPTANCE_PENDING && (
                                    <button
                                        onClick={() => {
                                            if (confirm(`Confirm you have received the ${selectedRequest.assetType}?`)) {
                                                userAcceptAsset(selectedRequest.id);
                                                setSelectedRequest(null);
                                            }
                                        }}
                                        className="px-8 py-4 bg-emerald-600 hover:bg-emerald-500 text-slate-900 dark:text-white text-[11px] font-black uppercase tracking-[0.2em] rounded-2xl shadow-xl shadow-emerald-500/20 transition-all active:scale-95 flex items-center gap-3 animate-pulse"
                                    >
                                        <CheckCircle size={20} /> Authorize Receipt
                                    </button>
                                )}
                                <button
                                    onClick={() => setSelectedRequest(null)}
                                    className="px-8 py-4 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-slate-200 dark:bg-white/10 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-900 dark:text-white text-[11px] font-black uppercase tracking-[0.2em] rounded-2xl border border-slate-200 dark:border-white/10 transition-all active:scale-95"
                                >
                                    Seal Briefing
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

        </div>
    );
}
