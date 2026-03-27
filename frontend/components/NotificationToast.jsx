import React, { useEffect, useState } from 'react';
import { useNotifications } from '@/contexts/NotificationContext';
import { useRouter } from 'next/router';
import { X, Bell, Info, AlertTriangle, Cpu, ExternalLink } from 'lucide-react';
import Link from 'next/link';

export default function NotificationToast() {
    const router = useRouter();
    const { lastNotification, handleNotificationClick } = useNotifications();
    const [visible, setVisible] = useState(false);
    const [notification, setNotification] = useState(null);

    useEffect(() => {
        if (lastNotification) {
            setNotification(lastNotification);
            setVisible(true);
            const timer = setTimeout(() => {
                setVisible(false);
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [lastNotification]);

    if (!notification) return null;

    const getIcon = (type) => {
        switch (type) {
            case 'discovery': return <Cpu className="text-blue-400" size={20} />;
            case 'alert': return <AlertTriangle className="text-amber-400" size={20} />;
            case 'workflow': return <Info className="text-indigo-400" size={20} />;
            default: return <Bell className="text-primary" size={20} />;
        }
    };

    return (
        <div className={`fixed top-6 right-6 z-[100] transition-all duration-500 transform ${visible ? 'translate-x-0 opacity-100 scale-100' : 'translate-x-12 opacity-0 scale-95 pointer-events-none'}`}>
            <div 
                onClick={() => {
                    handleNotificationClick(notification, router);
                    setVisible(false);
                }}
                className="w-80 glass-panel p-4 shadow-2xl border border-white/20 bg-app-surface/80 backdrop-blur-xl relative group overflow-hidden cursor-pointer hover:bg-app-surface transition-colors"
            >
                {/* Background glow */}
                <div className="absolute -top-10 -right-10 w-24 h-24 bg-primary/20 blur-2xl rounded-full pointer-events-none"></div>
                
                <div className="flex gap-3 relative z-10">
                    <div className="shrink-0 p-2 rounded-xl bg-app-surface-soft border border-app-border">
                        {getIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-bold text-app-text truncate">{notification.title}</h4>
                        <p className="text-xs text-app-text-muted mt-1 leading-relaxed line-clamp-2">
                            {notification.message}
                        </p>
                        
                        {notification.link && (
                            <div 
                                className="inline-flex items-center gap-1.5 mt-2.5 text-[11px] font-bold uppercase tracking-wider text-primary hover:text-primary-hover transition-colors"
                            >
                                <ExternalLink size={12} />
                                View Details
                            </div>
                        )}
                    </div>
                    <button 
                        onClick={() => setVisible(false)}
                        className="shrink-0 p-1 text-app-text-muted hover:text-app-text transition-colors"
                    >
                        <X size={16} />
                    </button>
                </div>
                
                {/* Progress bar */}
                <div className="absolute bottom-0 left-0 h-1 bg-gradient-to-r from-primary to-secondary animate-shrink-width" style={{ animationDuration: '5s' }}></div>
            </div>
            
            <style jsx>{`
                @keyframes shrink-width {
                    from { width: 100%; }
                    to { width: 0%; }
                }
                .animate-shrink-width {
                    animation-name: shrink-width;
                    animation-timing-function: linear;
                    animation-fill-mode: forwards;
                }
            `}</style>
        </div>
    );
}
