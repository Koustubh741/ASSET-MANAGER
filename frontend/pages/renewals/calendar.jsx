import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { ArrowLeft, ChevronLeft, ChevronRight, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, addDays } from 'date-fns';

import apiClient from '@/lib/apiClient';

export default function RenewalsCalendarPage() {
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Fetch Data from API
        const fetchEvents = async () => {
            setLoading(true);
            try {
                const assetResponse = await apiClient.getAssets();
                const assetList = assetResponse.data || [];
                const warrantyEvents = assetList
                    .filter(a => a.warranty_expiry)
                    .map(a => ({
                        date: a.warranty_expiry,
                        title: 'Warranty Expiry',
                        asset: a.name,
                        type: 'Warranty' // Orange
                    }));

                const contractEvents = assetList
                    .filter(a => a.contract_expiry)
                    .map(a => ({
                        date: a.contract_expiry,
                        title: 'Contract Renewal',
                        asset: a.name,
                        type: 'Contract' // Blue
                    }));

                const licenseEvents = assetList
                    .filter(a => a.license_expiry)
                    .map(a => ({
                        date: a.license_expiry,
                        title: 'License Expiry',
                        asset: a.name,
                        type: 'License' // Purple/Cyan
                    }));

                setEvents([...warrantyEvents, ...contractEvents, ...licenseEvents]);
            } catch (e) {
                console.error('Failed to fetch calendar events:', e);
            } finally {
                setLoading(false);
            }
        };
        fetchEvents();
    }, [currentMonth]);

    // Calendar Generation
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    const dateFormat = "d";
    const days = eachDayOfInterval({ start: startDate, end: endDate });

    const getDayEvents = (day) => {
        return events.filter(e => isSameDay(new Date(e.date), day));
    };

    const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
    const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

    const selectedDayEvents = getDayEvents(selectedDate);

    return (
        <div className="min-h-screen p-8 bg-slate-100 dark:bg-slate-950 text-app-text">
            <Head>
                <title>Renewals Calendar | Asset Management</title>
            </Head>

            <div className="max-w-7xl mx-auto space-y-8">
                {/* Header */}
                <div className="flex items-center space-x-4">
                    <Link href="/enterprise-features" className="p-2 rounded-none hover:bg-slate-200 hover:text-slate-900 dark:hover:bg-app-surface text-app-text-muted hover:text-app-text transition-colors">
                        <ArrowLeft size={24} />
                    </Link>
                    <div>
                        <h1 className="text-xl font-bold bg-gradient-to-r from-emerald-400 to-sky-400 bg-clip-text text-transparent">Renewals Calendar</h1>
                        <p className="text-app-text-muted mt-1">Track contract and warranty expirations</p>
                    </div>
                </div>

                <div className="flex flex-col lg:flex-row gap-8">
                    {/* Calendar Grid */}
                    <div className="flex-1 glass-panel p-6 rounded-none bg-white dark:bg-slate-900 border border-app-border">
                        {/* Month Nav */}
                        <div className="flex justify-between items-center mb-8">
                            <button onClick={prevMonth} className="p-2 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-app-surface-soft rounded-full"><ChevronLeft /></button>
                            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-200">
                                {format(currentMonth, "MMMM yyyy")}
                            </h2>
                            <button onClick={nextMonth} className="p-2 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-app-surface-soft rounded-full"><ChevronRight /></button>
                        </div>

                        {/* Days Header */}
                        <div className="grid grid-cols-7 mb-4 text-center text-app-text-muted text-sm font-medium uppercase tracking-wider">
                            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => <div key={d}>{d}</div>)}
                        </div>

                        {/* Grid */}
                        <div className="grid grid-cols-7 gap-2">
                            {days.map((day, i) => {
                                const dayEvents = getDayEvents(day);
                                const isSelected = isSameDay(day, selectedDate);
                                const isCurrentMonth = isSameMonth(day, monthStart);

                                return (
                                    <div
                                        key={i}
                                        onClick={() => setSelectedDate(day)}
                                        className={`min-h-[100px] p-2 rounded-none border border-app-border transition-all cursor-pointer relative
                                            ${!isCurrentMonth ? 'opacity-30 bg-slate-100 dark:bg-slate-950' : 'bg-white dark:bg-slate-900/50 hover:bg-slate-100 dark:bg-slate-800'}
                                            ${isSelected ? 'ring-2 ring-emerald-500/50 bg-emerald-900/10' : ''}
                                        `}
                                    >
                                        <span className={`text-sm font-medium ${isSelected ? 'text-emerald-400' : 'text-app-text-muted'}`}>
                                            {format(day, dateFormat)}
                                        </span>

                                        <div className="mt-2 space-y-1">
                                            {dayEvents.slice(0, 3).map((e, idx) => {
                                                let bgColor = 'bg-blue-500';
                                                if (e.type === 'Warranty') bgColor = 'bg-orange-500';
                                                if (e.type === 'License') bgColor = 'bg-purple-500';
                                                return <div key={idx} className={`h-1.5 rounded-full w-full ${bgColor}`} />;
                                            })}
                                            {dayEvents.length > 3 && (
                                                <div className="text-[10px] text-app-text-muted text-center">+{dayEvents.length - 3} more</div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Details Sidebar */}
                    <div className="w-full lg:w-96 glass-panel p-6 rounded-none bg-white dark:bg-slate-900 border border-app-border h-fit">
                        <h3 className="text-lg font-semibold text-app-text mb-4 border-b border-app-border pb-4">
                            Events for {format(selectedDate, "MMM d, yyyy")}
                        </h3>

                        <div className="space-y-4">
                            {selectedDayEvents.length > 0 ? selectedDayEvents.map((e, i) => (
                                <div key={i} className="flex gap-4 p-4 rounded-none bg-app-surface-soft border border-app-border hover:border-app-border transition-colors">
                                    <div className={`mt-1 
                                        ${e.type === 'Warranty' ? 'text-orange-400' : 
                                          e.type === 'License' ? 'text-purple-400' : 'text-blue-400'}`}>
                                        {e.type === 'Warranty' ? <AlertCircle size={20} /> : 
                                         e.type === 'License' ? <CheckCircle size={20} /> : <Clock size={20} />}
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-slate-900 dark:text-slate-200">{e.title}</h4>
                                        <div className="text-sm text-app-text-muted mt-1">{e.asset}</div>
                                        <div className={`text-xs mt-2 inline-block px-2 py-0.5 rounded 
                                            ${e.type === 'Warranty' ? 'bg-orange-500/10 text-orange-400' : 
                                              e.type === 'License' ? 'bg-purple-500/10 text-purple-400' : 'bg-blue-500/10 text-blue-400'}`}>
                                            {e.type}
                                        </div>
                                    </div>
                                </div>
                            )) : (
                                <div className="text-center py-12 text-app-text-muted">
                                    <p>No renewals scheduled for this date.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
