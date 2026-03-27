import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import {
    User, Mail, Building2, MapPin, Shield, ShieldCheck,
    LogOut, RefreshCw, ChevronLeft, Calendar, Briefcase,
    Lock, Globe, Key, Clock, Settings, UserCheck, Smartphone, Laptop, CheckCircle
} from 'lucide-react';
import { useRole } from '@/contexts/RoleContext';
import { useAssetContext, ASSET_STATUS } from '@/contexts/AssetContext';
import { useToast } from '@/components/common/Toast';
import apiClient from '@/lib/apiClient';

function UpdateProfileModal({ isOpen, onClose, user, onUpdate }) {
    const [formData, setFormData] = useState({
        full_name: user?.full_name || '',
        phone: user?.phone || '',
        location: user?.location || '',
        company: user?.company || ''
    });
    const [loading, setLoading] = useState(false);
    const toast = useToast();

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const updated = await apiClient.updateMe(formData);
            onUpdate(updated);
            toast.show('Identity parameters synchronized successfully', 'success');
            onClose();
        } catch (error) {
            toast.show(error.message || 'Synchronization failed', 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xl z-[100] flex items-center justify-center p-6">
            <div className="w-full max-w-lg glass-panel p-10 border border-white/10 shadow-2xl bg-slate-900 animate-in fade-in zoom-in duration-300">
                <div className="flex items-center gap-4 mb-8">
                    <div className="p-3 bg-indigo-500/10 rounded-2xl text-indigo-400">
                        <Settings size={24} className="animate-spin-slow" />
                    </div>
                    <div>
                        <h3 className="text-xl font-black text-white uppercase tracking-tighter">Parameter Configuration</h3>
                        <p className="text-[10px] text-slate-500 uppercase tracking-[0.3em] mt-1">Update Unified Security Identity</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-4">
                        {[
                            { name: 'full_name', label: 'Display Name', icon: User, placeholder: 'Enter full name' },
                            { name: 'phone', label: 'Primary Terminal', icon: Smartphone, placeholder: '+1 (555) 000-0000' },
                            { name: 'location', label: 'Deployment Hub', icon: MapPin, placeholder: 'Remote / HQ / Node' },
                            { name: 'company', label: 'Organization', icon: Building2, placeholder: 'Entity Name' }
                        ].map((field) => (
                            <div key={field.name} className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                    <field.icon size={12} /> {field.label}
                                </label>
                                <input
                                    type="text"
                                    value={formData[field.name]}
                                    onChange={(e) => setFormData({ ...formData, [field.name]: e.target.value })}
                                    className="w-full bg-slate-950/50 border border-white/5 rounded-2xl px-5 py-4 text-sm text-white focus:outline-none focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/10 transition-all placeholder:text-slate-700"
                                    placeholder={field.placeholder}
                                />
                            </div>
                        ))}
                    </div>

                    <div className="flex gap-4 pt-6">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-4 bg-white/5 hover:bg-white/10 text-[11px] font-black text-slate-400 uppercase tracking-widest rounded-2xl border border-white/5 transition-all"
                        >
                            Abort
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-[2] py-4 bg-indigo-600 hover:bg-indigo-500 text-[11px] font-black text-white uppercase tracking-widest rounded-2xl shadow-lg shadow-indigo-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            {loading ? <RefreshCw className="animate-spin" size={14} /> : <ShieldCheck size={14} />}
                            Synchronize
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default function ProfilePage() {
    const router = useRouter();
    const toast = useToast();
    const { user, currentRole, logout, setAuth } = useRole();
    const { assets } = useAssetContext();
    const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);

    // Fallback profile if user context is thin
    const displayProfile = {
        name: user?.name,
        email: user?.email,
        role: currentRole?.label || 'End User',
        department: user?.department || 'Operations',
        location: user?.location || 'Remote Node',
        joinDate: '2023-08-14'
    };

    const assignedAssets = assets
        .filter(a => {
            const matches = (a.assigned_to?.toLowerCase() === (user?.name || '').toLowerCase()) &&
                (a.status === ASSET_STATUS.IN_USE || a.status === 'Active');
            return matches;
        });

    const handleLogout = () => {
        logout();
        window.location.href = '/login';
    };

    const handleUpdateComplete = (updatedUser) => {
        setAuth({ user: { ...user, ...updatedUser } });
    };

    return (
        <div className="max-w-6xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header / Back */}
            <div className="flex items-center gap-6">
                <button
                    onClick={() => router.back()}
                    className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-app-border hover:bg-slate-50 dark:hover:bg-app-surface-soft transition-all group"
                >
                    <ChevronLeft size={24} className="text-app-text-muted group-hover:text-slate-900 dark:group-hover:text-app-text group-hover:-translate-x-1 transition-all" />
                </button>
                <div>
                    <h1 className="text-2xl font-['Outfit'] font-black text-app-text uppercase tracking-tight">Identity Profile</h1>
                    <p className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.3em] mt-1 flex items-center gap-2">
                        <UserCheck size={12} className="animate-pulse" /> Unified Security Identity
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                {/* Left Column: Identity Card */}
                <div className="lg:col-span-4 space-y-8">
                    <div className="glass-panel p-10 border border-app-border shadow-2xl bg-white dark:bg-slate-900/60 transition-all flex flex-col items-center text-center relative overflow-hidden group">
                        <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-br from-indigo-600/20 via-blue-600/10 to-transparent"></div>

                        <div className="relative z-10 mt-6">
                            <div className="w-32 h-32 rounded-[2.5rem] bg-gradient-to-br from-indigo-600 to-blue-600 flex items-center justify-center border-4 border-white dark:border-slate-800 shadow-2xl group-hover:scale-105 transition-transform duration-500">
                                <span className="text-2xl font-black text-app-text drop-shadow-lg">
                                    {(displayProfile.name || 'U').split(' ').map(n => n[0]).join('')}
                                </span>
                            </div>
                            <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-emerald-500 rounded-2xl border-4 border-white dark:border-slate-900 flex items-center justify-center shadow-lg">
                                <CheckCircle size={18} className="text-app-text" />
                            </div>
                        </div>

                        <div className="relative z-10 mt-8 space-y-2">
                            <h2 className="text-2xl font-bold text-app-text tracking-tight">{displayProfile.name}</h2>
                            <p className="text-sm font-medium text-app-text-muted">{displayProfile.email}</p>
                        </div>

                        <div className="relative z-10 mt-8 flex flex-wrap justify-center gap-2">
                            <span className="px-4 py-1.5 bg-indigo-500/10 rounded-full border border-indigo-500/20 text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">{displayProfile.role}</span>
                            <span className="px-4 py-1.5 bg-blue-500/10 rounded-full border border-blue-500/20 text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest">{displayProfile.department}</span>
                        </div>

                        <div className="relative z-10 w-full mt-10 space-y-3">
                            <button 
                                onClick={() => setIsUpdateModalOpen(true)}
                                className="w-full py-4 bg-app-surface-soft hover:bg-slate-200 dark:hover:bg-app-surface text-[11px] font-black text-slate-700 text-app-text uppercase tracking-widest rounded-2xl border border-app-border transition-all flex items-center justify-center gap-2"
                            >
                                <Settings size={14} /> Update Parameters
                            </button>
                            <button
                                onClick={handleLogout}
                                className="w-full py-4 bg-rose-500/10 hover:bg-rose-500/20 text-[11px] font-black text-rose-500 uppercase tracking-widest rounded-2xl border border-rose-500/20 transition-all flex items-center justify-center gap-2"
                            >
                                <LogOut size={14} /> Terminate Session
                            </button>
                        </div>
                    </div>

                    {/* Quick Stats */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="glass-panel p-6 border border-app-border bg-white dark:bg-transparent">
                            <p className="text-[10px] font-black text-app-text-muted uppercase tracking-widest mb-1">Active Assets</p>
                            <p className="text-xl font-black text-indigo-500">{assignedAssets.length}</p>
                        </div>
                        <div className="glass-panel p-6 border border-app-border bg-white dark:bg-transparent">
                            <p className="text-[10px] font-black text-app-text-muted uppercase tracking-widest mb-1">Account Age</p>
                            <p className="text-xl font-black text-blue-500">2.4Y</p>
                        </div>
                    </div>
                </div>

                {/* Right Column: Details & Fleet */}
                <div className="lg:col-span-8 space-y-8">
                    {/* Security & Access Section */}
                    <div className="glass-panel p-8 border border-app-border bg-white dark:bg-slate-900/40 rounded-[2.5rem] space-y-8">
                        <div className="flex items-center gap-4 border-b border-black/5 border-app-border pb-6">
                            <div className="p-3 bg-amber-500/10 rounded-2xl text-amber-600 dark:text-amber-400 border border-amber-500/20">
                                <Shield size={24} />
                            </div>
                            <div>
                                <h3 className="text-base font-black text-app-text uppercase tracking-widest">Security Configuration</h3>
                                <p className="text-[10px] text-app-text-muted uppercase tracking-widest mt-0.5">Access Control & Encryption</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {[
                                { label: 'Primary Password', value: 'Last rotated 92 days ago', icon: Key, action: 'Rotate' },
                                { label: 'Multi-Factor Auth', value: 'Enabled via Authenticator', icon: ShieldCheck, action: 'Configure' },
                                { label: 'Cloud Identity', value: 'Synced via Azure AD', icon: Globe, action: 'Verify' },
                                { label: 'Session Integrity', value: 'Last login from New York, US', icon: Clock, action: 'Logs' }
                            ].map((item, i) => (
                                <div key={i} className="p-6 rounded-3xl bg-slate-50 dark:bg-white/[0.02] border border-app-border hover:bg-slate-100 dark:hover:bg-app-surface-soft transition-all group/item">
                                    <div className="flex justify-between items-start">
                                        <div className="flex items-center gap-4">
                                            <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800 text-app-text-muted group-hover/item:text-indigo-500 transition-colors">
                                                <item.icon size={18} />
                                            </div>
                                            <div>
                                                <p className="text-sm font-black text-slate-800 text-app-text uppercase tracking-tight">{item.label}</p>
                                                <p className="text-xs text-app-text-muted mt-0.5 italic">{item.value}</p>
                                            </div>
                                        </div>
                                        <button className="text-[10px] font-black text-indigo-400 uppercase tracking-widest opacity-0 group-hover/item:opacity-100 transition-all hover:scale-110">
                                            {item.action}
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Assigned Fleet Section */}
                    <div className="glass-panel p-8 border border-app-border bg-white dark:bg-slate-900/40 rounded-[2.5rem] space-y-8">
                        <div className="flex items-center gap-4 border-b border-black/5 border-app-border pb-6">
                            <div className="p-3 bg-blue-500/10 rounded-2xl text-blue-600 dark:text-blue-400 border border-blue-500/20">
                                <Briefcase size={24} />
                            </div>
                            <div>
                                <h3 className="text-base font-black text-app-text uppercase tracking-widest">Assigned Hardware Fleet</h3>
                                <p className="text-[10px] text-app-text-muted uppercase tracking-widest mt-0.5">Inventory Tracking & Status</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            {assignedAssets.length > 0 ? assignedAssets.map((asset) => (
                                <div key={asset.id} className="flex items-center justify-between p-6 bg-slate-50 dark:bg-white/[0.02] border border-app-border rounded-3xl group/asset">
                                    <div className="flex items-center gap-6">
                                        <div className="w-14 h-14 rounded-2xl bg-white dark:bg-slate-800 flex items-center justify-center text-app-text-muted group-hover/asset:text-blue-500 transition-colors shadow-sm">
                                            {(asset.asset_type || '').toLowerCase().includes('laptop') ? <Laptop size={28} /> :
                                                (asset.asset_type || '').toLowerCase().includes('phone') ? <Smartphone size={28} /> : <Briefcase size={28} />}
                                        </div>
                                        <div>
                                            <p className="text-base font-bold text-app-text">{asset.name}</p>
                                            <div className="flex items-center gap-3 mt-1">
                                                <span className="text-[10px] font-black text-app-text-muted uppercase tracking-widest">{asset.asset_type}</span>
                                                <span className="w-1 h-1 rounded-full bg-slate-400"></span>
                                                <span className="text-[10px] font-mono text-app-text-muted tracking-tighter">S/N: {asset.serial_number || 'N/A'}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <span className="px-3 py-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-black uppercase tracking-widest rounded-lg border border-emerald-500/20">
                                            {asset.status}
                                        </span>
                                        <p className="text-[10px] text-app-text-muted uppercase tracking-widest mt-2">Health: Optimal</p>
                                    </div>
                                </div>
                            )) : (
                                <div className="text-center py-10">
                                    <p className="text-app-text-muted text-sm italic">No hardware currently assigned to this profile.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <UpdateProfileModal 
                isOpen={isUpdateModalOpen} 
                onClose={() => setIsUpdateModalOpen(false)} 
                user={user}
                onUpdate={handleUpdateComplete}
            />
        </div>
    );
}
