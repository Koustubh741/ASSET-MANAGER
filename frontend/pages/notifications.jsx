import React, { useState } from 'react';
import { Bell, FileText, ShoppingBag, Clock, ChevronLeft, Check, AlertCircle } from 'lucide-react';
import Link from 'next/link';

export default function NotificationsPage() {
    // Mock Notifications - In a real app, this would come from a Context or API
    const [notifications] = useState([
        {
            id: 1,
            type: 'warranty',
            title: 'Warranty Expiring Soon',
            message: 'MacBook Pro M1 (SN-IT-003) warranty expires in 5 days.',
            time: '2 hours ago',
            icon: AlertCircle,
            color: 'text-red-400',
            bg: 'bg-red-500/10',
            border: 'border-red-500/20'
        },
        {
            id: 2,
            type: 'renewal',
            title: 'New Renewal Request',
            message: 'Sarah Jenkins requested renewal for Dell XPS 15.',
            time: '5 hours ago',
            icon: Clock,
            color: 'text-amber-400',
            bg: 'bg-amber-500/10',
            border: 'border-amber-500/20'
        },
        {
            id: 3,
            type: 'procurement',
            title: 'Procurement Approved',
            message: 'PO-2024-001 for 5 monitors has been approved.',
            time: '1 day ago',
            icon: Check,
            color: 'text-emerald-400',
            bg: 'bg-emerald-500/10',
            border: 'border-emerald-500/20'
        },
        {
            id: 4,
            type: 'asset',
            title: 'Asset Assigned',
            message: 'iPhone 13 assigned to New Hire (Mike Ross).',
            time: '1 day ago',
            icon: ShoppingBag,
            color: 'text-blue-400',
            bg: 'bg-blue-500/10',
            border: 'border-blue-500/20'
        },
        {
            id: 5,
            type: 'maintenance',
            title: 'Maintenance Overdue',
            message: 'Server Rack A-04 monthly maintenance missed.',
            time: '2 days ago',
            icon: AlertCircle,
            color: 'text-red-400',
            bg: 'bg-red-500/10',
            border: 'border-red-500/20'
        },
        {
            id: 6,
            type: 'procurement',
            title: 'New Requisition',
            message: 'IT requested 3 new ThinkPad laptops.',
            time: '3 days ago',
            icon: ShoppingBag,
            color: 'text-amber-400',
            bg: 'bg-amber-500/10',
            border: 'border-amber-500/20'
        }
    ]);

    return (
        <div className="flex flex-col h-full bg-[#0B1120] text-slate-700 dark:text-slate-700 min-h-screen">
            {/* Header */}
            <div className="flex items-center justify-between px-8 py-6 border-b border-slate-200 dark:border-white/5 bg-[#0B1120]/80 backdrop-blur-xl sticky top-0 z-10">
                <div className="flex items-center gap-4">
                    <Link href="/dashboard/system-admin">
                        <button className="p-2 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-100 dark:bg-white/5 rounded-lg transition-colors text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white">
                            <ChevronLeft size={20} />
                        </button>
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                            <Bell className="text-blue-500" />
                            Notifications
                        </h1>
                        <p className="text-sm text-slate-500 dark:text-slate-400">System alerts and activity logs</p>
                    </div>
                </div>
                <div className="flex gap-3">
                    <button className="px-4 py-2 bg-slate-50 dark:bg-white/5 hover:bg-slate-200 hover:text-slate-900 dark:hover:bg-slate-200 dark:bg-white/10 text-slate-900 dark:text-white rounded-lg text-sm font-medium transition-colors border border-slate-200 dark:border-white/10">
                        Mark all as read
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="p-8 max-w-4xl mx-auto w-full">
                <div className="space-y-4">
                    {notifications.map((notification) => (
                        <div key={notification.id} className={`p-4 rounded-xl border ${notification.border} ${notification.bg} flex items-start gap-4 transition-all hover:scale-[1.01]`}>
                            <div className={`mt-1 p-2 rounded-lg bg-black/20 ${notification.color}`}>
                                <notification.icon size={20} />
                            </div>
                            <div className="flex-1">
                                <div className="flex justify-between items-start">
                                    <h3 className={`font-semibold ${notification.color}`}>{notification.title}</h3>
                                    <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                                        <Clock size={12} />
                                        {notification.time}
                                    </span>
                                </div>
                                <p className="text-sm text-slate-700 dark:text-slate-700 mt-1">{notification.message}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
