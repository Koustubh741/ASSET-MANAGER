import React from 'react';
import { AlertCircle, Clock, CheckCircle2, AlertTriangle, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import apiClient from '@/lib/apiClient';
import { useRole } from '@/contexts/RoleContext';

const TYPE_STYLE = {
    warranty: { icon: AlertCircle, color: 'text-rose-500', bg: 'bg-rose-500/5', border: 'border-rose-500/30' },
    request: { icon: Clock, color: 'text-blue-500', bg: 'bg-blue-500/5', border: 'border-blue-500/30' },
    procurement_approved: { icon: CheckCircle2, color: 'text-success', bg: 'bg-success/5', border: 'border-success/30' },
    assignment: { icon: AlertTriangle, color: 'text-indigo-500', bg: 'bg-indigo-500/5', border: 'border-indigo-500/30' },
    maintenance: { icon: AlertCircle, color: 'text-rose-500', bg: 'bg-rose-500/5', border: 'border-rose-500/30' },
};

const defaultStyle = { icon: AlertTriangle, color: 'text-blue-500/70', bg: 'bg-white/5', border: 'border-white/10' };

function mapApiAlertToUi(apiAlert) {
    const style = TYPE_STYLE[apiAlert.type] || defaultStyle;
    return {
        id: apiAlert.id,
        type: apiAlert.type,
        title: apiAlert.title,
        message: apiAlert.message,
        time: apiAlert.time || 'T-RECOVERY',
        link: apiAlert.link || '/assets',
        icon: style.icon,
        color: style.color,
        bg: style.bg,
        border: style.border,
    };
}

function filterByNotificationSettings(alerts, notifications) {
    if (!notifications) return alerts;
    return alerts.filter((alert) => {
        if (alert.type === 'warranty' && notifications.expiry === false) return false;
        if ((alert.type === 'request' || alert.type === 'procurement_approved') && notifications.approvals === false) return false;
        return true;
    });
}

export default function AlertsFeed() {
    const { preferences } = useRole();
    const [alerts, setAlerts] = React.useState([]);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState(false);

    React.useEffect(() => {
        let cancelled = false;
        async function fetchAlerts() {
            setLoading(true);
            setError(false);
            try {
                const data = await apiClient.getAlerts({ limit: 12 });
                if (cancelled) return;
                const raw = Array.isArray(data) ? data : [];
                let list = raw.map(mapApiAlertToUi);
                if (preferences?.notification_settings) {
                    list = filterByNotificationSettings(list, preferences.notification_settings);
                }
                setAlerts(list);
            } catch (e) {
                if (!cancelled) {
                    console.error('Failed to load alerts', e);
                    setError(true);
                    setAlerts([]);
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        }
        fetchAlerts();
        return () => { cancelled = true; };
    }, []);

    if (loading) {
        return (
            <div className="p-8 text-center border border-white/10 bg-white/5">
                <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 animate-spin mx-auto mb-4"></div>
                <p className="text-[10px] font-mono text-app-text-muted/60 uppercase tracking-widest leading-none">Scanning_Sector_Metrics...</p>
            </div>
        );
    }

    if (alerts.length === 0) {
        return (
            <div className="p-10 text-center border border-white/10 bg-white/5 relative overflow-hidden group">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.05)_0%,transparent_70%)] opacity-50 group-hover:opacity-100 transition-opacity"></div>
                <div className="relative z-10">
                    <CheckCircle2 size={32} className="mx-auto text-emerald-500/20 mb-4 group-hover:text-emerald-500/40 transition-all duration-700" />
                    <p className="text-[10px] font-mono text-app-text-muted/60 uppercase tracking-widest">{error ? 'CONNECTION_ERROR_0x34' : 'NO_ACTIVE_INCIDENTS'}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4 relative">
            <div className="flex items-center justify-between mb-4 border-b border-white/10 pb-3">
                <h3 className="text-[11px] font-bold text-app-text uppercase tracking-[0.25em] flex items-center">
                    <span className="relative flex h-2 w-2 mr-3">
                        <span className="animate-ping absolute inline-flex h-full w-full bg-rose-500 opacity-75"></span>
                        <span className="relative inline-flex h-2 w-2 bg-rose-600"></span>
                    </span>
                    LIVE_HUB_TELEMETRY
                </h3>
                <div className="flex items-center gap-3">
                    <div className="text-[8px] font-mono text-app-text-muted/40 uppercase tracking-tighter tabular-nums px-2 py-0.5 border border-white/5 bg-white/[0.02]">
                        {alerts.length} ACTIVE_FEED
                    </div>
                </div>
            </div>

            <div className="space-y-2 max-h-[550px] overflow-y-auto pr-2 custom-scrollbar">
                {alerts.map((alert) => {
                    const Icon = alert.icon;
                    return (
                        <div
                            key={alert.id}
                            className={`p-4 border border-white/10 bg-white/[0.02] hover:bg-white/5 transition-all cursor-pointer group relative overflow-hidden`}
                        >
                            {/* Decorative Background Icon */}
                            <div className={`absolute top-0 right-0 p-1 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity ${alert.color}`}>
                                <Icon size={48} />
                            </div>
                            
                            <div className="flex gap-4 relative z-10">
                                <div className={`w-10 h-10 border ${alert.border} ${alert.bg} flex items-center justify-center shrink-0`}>
                                    <Icon size={18} className={alert.color} />
                                </div>
                                <div className="flex-1">
                                    <div className="flex justify-between items-start mb-0.5">
                                        <h4 className={`text-[11px] font-bold uppercase tracking-tight ${alert.color}`}>{alert.title}</h4>
                                        <span className="text-[8px] text-app-text-muted/40 font-mono tabular-nums tracking-tighter italic">[{alert.time}]</span>
                                    </div>
                                    <p className="text-[10px] text-app-text-muted/80 leading-relaxed uppercase tracking-tighter">
                                        {alert.message}
                                    </p>
                                    <Link href={alert.link}>
                                        <div className="mt-3 flex items-center text-[8px] font-bold text-blue-500/60 hover:text-blue-400 transition-all group/link tracking-widest uppercase">
                                            ACCESS_DOCKET_INTEL
                                            <ArrowRight size={10} className="ml-1.5 transition-transform group-hover/link:translate-x-1" />
                                        </div>
                                    </Link>
                                </div>
                            </div>
                            
                            {/* Corner Accents */}
                            <div className="absolute top-0 right-0 w-1 h-1 border-r border-t border-white/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                            <div className="absolute bottom-0 left-0 w-1 h-1 border-l border-b border-white/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        </div>
                    );
                })}
            </div>

            <Link href="/notifications" className="block w-full py-4 border border-white/10 bg-white/5 text-center text-[9px] font-bold text-app-text-muted/60 hover:text-white hover:bg-white/10 uppercase tracking-[0.35em] transition-all relative group overflow-hidden">
                <div className="absolute inset-0 bg-blue-500/0 group-hover:bg-blue-500/5 transition-colors"></div>
                VISUALIZE_LOG_HISTORY
            </Link>
        </div>
    );
}
