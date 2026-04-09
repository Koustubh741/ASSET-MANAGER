import React from 'react';
import { useNotifications } from '@/contexts/NotificationContext';
import { useRouter } from 'next/router';
import { X, Bell, Info, AlertTriangle, Cpu, ExternalLink, History, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

export default function NotificationDrawer({ isOpen, onClose }) {
    const router = useRouter();
    const { notifications, markAsRead, markAllAsRead, unreadCount, handleNotificationClick } = useNotifications();

    if (!isOpen) return null;

    const getIcon = (type) => {
        switch (type) {
            case 'discovery': return <div className="p-2 rounded-none bg-blue-500/10 text-blue-500 border border-blue-500/20"><Cpu size={18} /></div>;
            case 'alert': return <div className="p-2 rounded-none bg-amber-500/10 text-amber-500 border border-amber-500/20"><AlertTriangle size={18} /></div>;
            case 'workflow': return <div className="p-2 rounded-none bg-indigo-500/10 text-indigo-500 border border-indigo-500/20"><Info size={18} /></div>;
            default: return <div className="p-2 rounded-none bg-primary/10 text-primary border border-primary/20"><Bell size={18} /></div>;
        }
    };

    const formatDate = (dateStr) => {
        try {
            const date = new Date(dateStr);
            const now = new Date();
            const diffMs = now - date;
            const diffMin = Math.floor(diffMs / 60000);
            
            if (diffMin < 60) return `${diffMin}m ago`;
            if (diffMin < 1440) return `${Math.floor(diffMin / 60)}h ago`;
            return date.toLocaleDateString();
        } catch (e) {
            return dateStr;
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex justify-end">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose}></div>
            
            <aside className="w-full max-w-sm h-full bg-app-surface border-l border-app-border relative z-10 flex flex-col shadow-2xl animate-in slide-in-from-right duration-300">
                {/* Header */}
                <div className="p-6 border-b border-app-border flex items-center justify-between bg-app-surface/50 backdrop-blur-md sticky top-0 z-20">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-none bg-primary/10 text-primary shadow-[0_0_20px_rgba(99,102,241,0.1)]">
                            <Bell size={24} />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-app-text">Notifications</h2>
                            <p className="text-xs text-app-text-muted mt-0.5">{unreadCount} unread alerts</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-1">
                        {unreadCount > 0 && (
                            <button 
                                onClick={markAllAsRead}
                                className="p-2 rounded-none text-app-text-muted hover:text-primary hover:bg-primary/10 transition-all"
                                title="Mark all as read"
                            >
                                <CheckCircle2 size={20} />
                            </button>
                        )}
                        <button 
                            onClick={onClose}
                            className="p-2 rounded-none text-app-text-muted hover:text-app-text hover:bg-app-surface-soft transition-all"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                    {notifications.length === 0 ? (
                        <div className="h-48 flex flex-col items-center justify-center text-center p-8">
                            <div className="w-16 h-16 rounded-full bg-app-surface-soft flex items-center justify-center mb-4 text-app-text-muted">
                                <Bell size={32} opacity={0.3} />
                            </div>
                            <p className="text-sm font-medium text-app-text-muted">No notifications yet</p>
                            <p className="text-xs text-app-text-subtle mt-1 opacity-60">System alerts and discovery updates will appear here.</p>
                        </div>
                    ) : (
                        notifications.map((notif) => (
                            <div 
                                key={notif.id}
                                onClick={() => {
                                    handleNotificationClick(notif, router);
                                    onClose();
                                }}
                                className={`group p-4 rounded-none border transition-all duration-300 cursor-pointer hover:shadow-md ${notif.is_read 
                                    ? 'bg-app-surface border-app-border hover:bg-app-surface-soft' 
                                    : 'bg-primary/5 border-primary/20 shadow-sm relative overflow-hidden hover:bg-primary/10'}`}
                            >
                                {!notif.is_read && (
                                    <div className="absolute top-0 left-0 w-1 h-full bg-primary"></div>
                                )}
                                
                                <div className="flex gap-4">
                                    <div className="shrink-0 pt-0.5">
                                        {getIcon(notif.type)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-start justify-between gap-2">
                                            <h3 className={`text-sm font-bold truncate ${notif.is_read ? 'text-app-text' : 'text-primary'}`}>
                                                {notif.title}
                                            </h3>
                                            <span className="text-[10px] whitespace-nowrap text-app-text-muted font-medium mt-0.5">
                                                {formatDate(notif.created_at)}
                                            </span>
                                        </div>
                                        <p className="text-xs text-app-text-muted mt-1.5 leading-relaxed">
                                            {notif.message}
                                        </p>
                                        
                                        <div className="flex items-center justify-between mt-3">
                                            {notif.link ? (
                                                <div 
                                                    className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-primary hover:text-primary-hover transition-colors"
                                                >
                                                    <ExternalLink size={12} />
                                                    View Details
                                                </div>
                                            ) : <div></div>}
                                            
                                            {!notif.is_read && (
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); markAsRead(notif.id); }}
                                                    className="p-1 px-2 rounded-none text-[10px] font-bold bg-app-surface-soft text-app-text-muted hover:text-primary hover:bg-primary/10 opacity-0 group-hover:opacity-100 transition-all uppercase tracking-widest border border-app-border"
                                                >
                                                    Mark Read
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-app-border bg-app-surface/50 backdrop-blur-md">
                    <Link href="/notifications" onClick={onClose} className="w-full py-3 rounded-none bg-app-surface-soft border border-app-border text-app-text-muted text-xs font-bold hover:text-app-text hover:bg-app-surface transition-all flex items-center justify-center gap-2 group/hist">
                        <History size={14} className="group-hover/hist:rotate-[-45deg] transition-transform" />
                        View Notification History
                    </Link>
                </div>
            </aside>
        </div>
    );
}
