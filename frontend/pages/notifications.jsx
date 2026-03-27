import { Bell, Clock, ChevronLeft, Check, AlertCircle, ShoppingBag, History, Trash2, Filter, Cpu, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { useState, useEffect, useCallback } from 'react';
import apiClient from '@/lib/apiClient';
import { useRouter } from 'next/router';

const TYPE_META = {
    discovery: { icon: Cpu, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
    alert: { icon: AlertCircle, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
    workflow: { icon: Bell, color: 'text-indigo-400', bg: 'bg-indigo-500/10', border: 'border-indigo-500/20' },
    warranty: { icon: AlertCircle, color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20' },
    renewal: { icon: Clock, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
    procurement: { icon: ShoppingBag, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
    system: { icon: Bell, color: 'text-slate-400', bg: 'bg-slate-500/10', border: 'border-slate-500/20' },
};

export default function NotificationsPage() {
    const router = useRouter();
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all'); // all, unread

    const fetchNotifications = useCallback(async () => {
        try {
            setLoading(true);
            const data = await apiClient.getNotifications(100);
            if (Array.isArray(data)) {
                setNotifications(data);
            }
        } catch (err) {
            console.error("Failed to fetch notifications:", err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchNotifications();
    }, [fetchNotifications]);

    const markAllAsRead = async () => {
        try {
            await apiClient.markAllNotificationsRead();
            setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
        } catch (err) {
            console.error("Failed to mark all as read:", err);
        }
    };

    const markAsRead = async (id) => {
        try {
            await apiClient.markNotificationRead(id);
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
        } catch (err) {
            console.error("Failed to mark read:", err);
        }
    };

    const formatTime = (dateStr) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diff = Math.floor((now - date) / 1000);
        if (diff < 60) return 'just now';
        if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
        if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
        return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    };

    const filteredNotifications = notifications.filter(n => {
        if (filter === 'unread') return !n.is_read;
        return true;
    });

    return (
        <div className="animate-in fade-in duration-700 space-y-8">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-app-border">
                <div className="flex items-center gap-5">
                    <button 
                        onClick={() => router.back()}
                        className="p-3 rounded-2xl bg-app-surface border border-app-border text-app-text-muted hover:text-app-text hover:shadow-lg transition-all active:scale-95"
                    >
                        <ChevronLeft size={22} />
                    </button>
                    <div>
                        <h1 className="text-3xl font-black tracking-tight text-app-text">
                            Notification Center
                        </h1>
                        <p className="text-sm text-app-text-muted mt-1 font-medium">Manage your system alerts and activity history</p>
                    </div>
                </div>
                
                <div className="flex items-center gap-4">
                    <div className="flex bg-app-surface-soft p-1.5 rounded-2xl border border-app-border shadow-inner">
                        {['all', 'unread'].map(f => (
                            <button
                                key={f}
                                onClick={() => setFilter(f)}
                                className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${filter === f ? 'bg-primary text-white shadow-lg shadow-primary/30 scale-105' : 'text-app-text-muted hover:text-app-text'}`}
                            >
                                {f}
                            </button>
                        ))}
                    </div>
                    <button 
                        onClick={markAllAsRead}
                        disabled={!notifications.some(n => !n.is_read)}
                        className="flex items-center gap-2 px-6 py-3 bg-app-surface border border-app-border hover:border-emerald-500/50 hover:bg-emerald-500/5 text-app-text rounded-2xl text-xs font-black uppercase tracking-widest transition-all disabled:opacity-30 disabled:cursor-not-allowed group shadow-sm hover:shadow-emerald-500/10"
                    >
                        <CheckCircle2 size={16} className="group-hover:text-emerald-400 transition-colors" />
                        Mark All Read
                    </button>
                </div>
            </div>

            {/* List Section */}
            <div className="max-w-4xl">
                {loading && notifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-32 gap-6 bg-app-surface/30 rounded-[2.5rem] border border-dashed border-app-border">
                        <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                        <p className="text-sm font-black uppercase tracking-widest text-app-text-muted animate-pulse">Synchronizing Intelligence...</p>
                    </div>
                ) : filteredNotifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-32 rounded-[2.5rem] border border-dashed border-app-border bg-app-surface/30 animate-in zoom-in-95 duration-500">
                        <div className="w-20 h-20 rounded-3xl bg-app-surface flex items-center justify-center mb-6 shadow-xl shadow-black/5">
                            <Bell className="text-app-text-muted" size={40} />
                        </div>
                        <h3 className="text-2xl font-black text-app-text">Zero Unread Alerts</h3>
                        <p className="text-sm text-app-text-muted mt-2 font-medium">You are completely up to date with the system.</p>
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {filteredNotifications.map((n) => {
                            const meta = TYPE_META[n.type] || TYPE_META.system;
                            const Icon = meta.icon;
                            
                            return (
                                <div 
                                    key={n.id}
                                    onClick={() => n.link && router.push(n.link)}
                                    className={`group relative overflow-hidden p-6 rounded-[2rem] border transition-all duration-500 cursor-pointer ${!n.is_read ? 'bg-app-surface border-primary/30 shadow-xl shadow-primary/5 hover:shadow-primary/10' : 'bg-app-surface/40 border-app-border/50 hover:bg-app-surface hover:border-app-border opacity-90'}`}
                                >
                                    {/* Unread Glow Line */}
                                    {!n.is_read && (
                                        <div className="absolute top-0 left-0 w-1.5 h-full bg-primary shadow-[4px_0_20px_rgba(99,102,241,0.4)]"></div>
                                    )}

                                    <div className="flex items-start gap-6">
                                        <div className={`shrink-0 p-4 rounded-2xl ${meta.bg} ${meta.color} border border-white/5 shadow-inner`}>
                                            <Icon size={24} />
                                        </div>
                                        
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between mb-2">
                                                <h4 className={`text-lg font-bold tracking-tight truncate ${!n.is_read ? 'text-app-text' : 'text-app-text-muted'}`}>
                                                    {n.title}
                                                </h4>
                                                <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-app-surface-soft border border-app-border shadow-sm">
                                                    <Clock size={12} className="text-app-text-muted" />
                                                    <span className="text-[10px] font-black uppercase tracking-tighter text-app-text-muted">
                                                        {formatTime(n.created_at)}
                                                    </span>
                                                </div>
                                            </div>
                                            
                                            <p className="text-sm text-app-text-muted leading-relaxed mb-4">
                                                {n.message}
                                            </p>
                                            
                                            <div className="flex items-center gap-6">
                                                {!n.is_read && (
                                                    <button 
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            markAsRead(n.id);
                                                        }}
                                                        className="text-[11px] font-black uppercase tracking-[0.2em] text-primary hover:text-white transition-colors relative after:absolute after:bottom-[-2px] after:left-0 after:w-full after:h-[1px] after:bg-primary after:scale-x-0 group-hover:after:scale-x-100 after:transition-transform after:origin-left"
                                                    >
                                                        Mark as Read
                                                    </button>
                                                )}
                                                {n.link && (
                                                    <span className="text-[11px] font-black uppercase tracking-[0.2em] text-app-text-muted group-hover:text-app-text transition-colors flex items-center gap-2">
                                                        View Intelligence <ChevronLeft size={12} className="rotate-180 group-hover:translate-x-1 transition-transform" />
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    
                                    {/* Hover Highlight */}
                                    <div className="absolute inset-0 bg-gradient-to-tr from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
