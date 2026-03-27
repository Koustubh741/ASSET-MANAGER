import Link from 'next/link';
import { useRouter } from 'next/router';
import { useState } from 'react';
import { LayoutDashboard, DollarSign, PieChart, Settings, Menu, X, User, ShoppingBag, Truck, FileText, LifeBuoy, Bell } from 'lucide-react';
import { useRole } from '@/contexts/RoleContext';
import { useNotifications } from '@/contexts/NotificationContext';
import NotificationToast from '@/components/NotificationToast';
import NotificationDrawer from '@/components/NotificationDrawer';

const FINANCE_NAV = [
    { label: 'Dashboard', href: '/finance', icon: LayoutDashboard, exactMatch: true },
    { label: 'Budget queue', href: '/finance/budget-queue', icon: DollarSign },
    { label: 'Analytics', href: '/finance/analytics', icon: PieChart },
    { label: 'Support & Tickets', href: '/tickets', icon: LifeBuoy },
    // Root fix: keep Finance users inside the Finance hub for settings
    { label: 'Settings', href: '/finance/settings', icon: Settings },
];

const PROCUREMENT_NAV = [
    { label: 'Dashboard', href: '/procurement', icon: LayoutDashboard, exactMatch: true },
    { label: 'Purchase orders', href: '/procurement/purchase-orders', icon: FileText },
    { label: 'Deliveries', href: '/procurement/deliveries', icon: Truck },
    { label: 'Analytics', href: '/procurement/analytics', icon: PieChart },
    { label: 'Support & Tickets', href: '/tickets', icon: LifeBuoy },
    // Root fix: keep Procurement users inside the Procurement hub for settings
    { label: 'Settings', href: '/procurement/settings', icon: Settings },
];

export default function PortalLayout({ children, variant }) {
    const router = useRouter();
    const { logout, user, currentRole } = useRole();
    const { unreadCount } = useNotifications();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [isNotificationOpen, setIsNotificationOpen] = useState(false);

    const isFinance = variant === 'finance';
    const navItems = isFinance ? FINANCE_NAV : PROCUREMENT_NAV;
    const portalName = isFinance ? 'Finance Portal' : 'Procurement Portal';
    const accentClass = isFinance
        ? 'from-emerald-500 to-teal-500'
        : 'from-blue-500 to-indigo-500';

    return (
        <div className="app-shell min-h-screen flex text-app-text font-sans font-normal bg-app-bg">
            <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:rounded-lg bg-primary text-white focus:ring-2 focus:ring-offset-2 focus:ring-primary focus:outline-none">
                Skip to main content
            </a>

            {/* Mobile header */}
            <header className={`md:hidden fixed top-0 left-0 right-0 z-30 h-14 bg-app-surface/95 backdrop-blur-xl border-b border-app-border flex items-center justify-between px-4`}>
                <h1 className={`text-lg font-bold bg-gradient-to-r ${accentClass} bg-clip-text text-transparent truncate`}>
                    {portalName}
                </h1>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setIsNotificationOpen(true)}
                        className="p-2.5 rounded-lg text-app-text-muted hover:text-app-text hover:bg-app-surface-soft min-h-[44px] min-w-[44px] flex items-center justify-center transition-colors relative"
                    >
                        <Bell size={22} className={unreadCount > 0 ? "animate-swing" : ""} />
                        {unreadCount > 0 && (
                            <span className="absolute top-2 right-2 w-4 h-4 bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full border-2 border-app-surface">
                                {unreadCount > 9 ? '9+' : unreadCount}
                            </span>
                        )}
                    </button>
                    <button
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        className="p-2.5 rounded-lg text-app-text-muted hover:text-app-text hover:bg-app-surface-soft min-h-[44px] min-w-[44px] flex items-center justify-center transition-colors"
                        aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
                    >
                        {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
                    </button>
                </div>
            </header>

            {/* Mobile drawer */}
            <div className={`md:hidden fixed inset-0 z-20 transition-opacity duration-200 ${mobileMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)} aria-hidden="true" />
                <aside className={`absolute top-14 left-0 right-0 bottom-0 bg-white dark:bg-slate-900/98 backdrop-blur-xl border-r border-app-border bg-white/98 border-slate-200 transform transition-transform duration-200 ease-out ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                    <nav className="p-4 space-y-1 overflow-y-auto pt-6">
                        {navItems.map((item) => {
                            const Icon = item.icon;
                            const isActive = item.exactMatch
                                ? (router.asPath === item.href || router.asPath === item.href + '/')
                                : (router.asPath === item.href || (item.href !== '/' && router.asPath.startsWith(item.href)));
                            return (
                                <Link
                                    key={item.label}
                                    href={item.href}
                                    onClick={() => setMobileMenuOpen(false)}
                                    className={`flex items-center gap-3 px-4 py-3 rounded-xl min-h-[44px] transition-all ${isActive ? 'bg-primary/10 text-primary border border-primary/20 shadow-sm' : 'text-app-text-muted hover:bg-app-surface-soft hover:text-app-text'}`}
                                >
                                    <Icon size={20} />
                                    <span className="font-medium">{item.label}</span>
                                </Link>
                            );
                        })}
                        <div className="mt-6 pt-4 border-t border-app-border">
                            <button
                                onClick={() => { logout(); window.location.href = '/login'; }}
                                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl min-h-[44px] border border-rose-500/20 text-rose-400 hover:bg-rose-500/10 border-rose-200 text-rose-600 hover:bg-rose-50 font-medium"
                            >
                                Log Out
                            </button>
                        </div>
                    </nav>
                </aside>
            </div>

            {/* Desktop sidebar */}
            <aside className="fixed h-full z-20 hidden md:block group w-24 hover:w-72 transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]">
                <div className={`h-full m-4 rounded-[2.5rem] glass-panel dark:group-hover:bg-app-surface/95 flex flex-col shadow-[0_0_50px_-12px_rgba(0,0,0,0.15)] relative overflow-hidden transition-all duration-500`}>

                    {/* Background Glows */}
                    <div className={`absolute -top-24 -left-24 w-48 h-48 ${isFinance ? 'bg-emerald-500/10' : 'bg-blue-500/10'} blur-[80px] rounded-full pointer-events-none`}></div>
                    <div className={`absolute -bottom-24 -right-24 w-48 h-48 ${isFinance ? 'bg-teal-500/10' : 'bg-indigo-500/10'} blur-[80px] rounded-full pointer-events-none`}></div>

                    <div className="absolute inset-0 flex flex-col items-center pt-10 opacity-100 group-hover:opacity-0 transition-all duration-300 pointer-events-none z-10 scale-100 group-hover:scale-90">
                        <div className={`w-12 h-12 rounded-2xl bg-gradient-to-r ${accentClass} opacity-90 flex items-center justify-center mb-6 animate-float shadow-lg`}>
                            {isFinance ? <DollarSign size={22} className="text-white" /> : <ShoppingBag size={22} className="text-white" />}
                        </div>
                        <div className="flex flex-col gap-5 mt-4 flex-1">
                            {navItems.map((item) => {
                                const Icon = item.icon;
                                const isActive = item.exactMatch
                                    ? (router.asPath === item.href || router.asPath === item.href + '/')
                                    : (router.asPath === item.href || (item.href !== '/' && router.asPath.startsWith(item.href)));
                                return (
                                    <div key={item.label} className={`p-2.5 rounded-xl ${isActive ? (isFinance ? 'text-emerald-500 bg-emerald-500/10' : 'text-blue-500 bg-blue-500/10') : 'text-app-text-muted'}`}>
                                        <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
                                    </div>
                                );
                            })}
                        </div>

                        {/* Collapsed Bell */}
                        <div className="pb-8 mt-auto flex flex-col items-center">
                            <button 
                                onClick={() => setIsNotificationOpen(true)}
                                className={`p-2.5 rounded-xl transition-all relative pointer-events-auto ${isFinance ? 'hover:bg-emerald-500/10 hover:text-emerald-500' : 'hover:bg-blue-500/10 hover:text-blue-500'} text-app-text-muted`}
                            >
                                <Bell size={22} className={unreadCount > 0 ? "animate-swing" : ""} />
                                {unreadCount > 0 && (
                                    <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center rounded-full border-2 border-app-surface shadow-lg">
                                        {unreadCount > 9 ? '9+' : unreadCount}
                                    </span>
                                )}
                            </button>
                        </div>
                    </div>

                    <div className="opacity-0 group-hover:opacity-100 transition-all duration-500 delay-100 flex flex-col h-full min-w-[17rem] pointer-events-none group-hover:pointer-events-auto">
                        <div className={`p-8 border-b border-app-border`}>
                            <h1 className="text-2xl font-bold bg-gradient-to-r from-app-text via-app-text-muted to-app-text/60 bg-clip-text text-transparent">{portalName}</h1>
                            <p className="text-xs text-app-text-muted mt-2 font-medium tracking-wide uppercase opacity-70">
                                {isFinance ? 'Financial Governance' : 'Supply Chain Operations'}
                            </p>
                        </div>
                        <nav className="p-5 space-y-1.5 flex-1 overflow-y-auto custom-scrollbar">
                            {navItems.map((item) => {
                                const Icon = item.icon;
                                const isActive = item.exactMatch
                                    ? (router.asPath === item.href || router.asPath === item.href + '/')
                                    : (router.asPath === item.href || (item.href !== '/' && router.asPath.startsWith(item.href)));
                                return (
                                    <Link
                                        key={item.label}
                                        href={item.href}
                                        className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all duration-300 whitespace-nowrap group/nav ${isActive
                                            ? `${isFinance ? 'bg-emerald-500/15 text-emerald-600 border-emerald-400/30' : 'bg-blue-500/15 text-blue-600 border-blue-400/30'} border shadow-lg`
                                            : 'text-app-text-muted hover:bg-app-surface-soft hover:text-app-text hover:pl-6'}`}
                                    >
                                        <div className={`p-1.5 rounded-lg transition-colors ${isActive ? (isFinance ? 'bg-emerald-500/20' : 'bg-blue-500/20') : 'group-hover/nav:bg-app-surface'}`}>
                                            <Icon size={20} className={isActive ? (isFinance ? 'text-emerald-600' : 'text-blue-600') : 'text-app-text-muted group-hover/nav:text-app-text'} />
                                        </div>
                                        <span className={`font-medium tracking-tight ${isActive ? (isFinance ? 'text-emerald-700' : 'text-blue-700') : 'text-app-text-muted group-hover/nav:text-app-text'}`}>{item.label}</span>
                                    </Link>
                                );
                            })}
                        </nav>
                        <div className="p-4 mt-auto">
                            <div className="p-4 rounded-2xl bg-app-surface-soft border border-app-border backdrop-blur-md">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center border-2 border-primary/20 shrink-0 shadow-lg">
                                        <User size={20} className="text-white" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-bold text-app-text truncate">{user?.name || 'User'}</p>
                                        <p className="text-[10px] font-bold text-app-text-muted uppercase tracking-widest truncate">{currentRole?.label}</p>
                                    </div>
                                    <button 
                                        onClick={() => setIsNotificationOpen(true)}
                                        className="p-2 rounded-xl text-app-text-muted hover:text-primary hover:bg-primary/10 transition-all relative"
                                    >
                                        <Bell size={20} className={unreadCount > 0 ? "animate-swing" : ""} />
                                        {unreadCount > 0 && (
                                            <span className="absolute top-1 right-1 w-4 h-4 bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center rounded-full border-2 border-app-surface shadow-lg">
                                                {unreadCount > 9 ? '9+' : unreadCount}
                                            </span>
                                        )}
                                    </button>
                                </div>
                                <button
                                    onClick={() => { logout(); window.location.href = '/login'; }}
                                    className="mt-4 w-full py-2.5 rounded-xl bg-app-surface border border-app-border hover:bg-danger/10 text-app-text-muted hover:text-danger text-[11px] font-bold uppercase tracking-wider transition-all"
                                >
                                    Sign Out
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </aside>

            <main id="main-content" className="flex-1 md:ml-28 pt-20 md:pt-0 p-6 md:p-8 overflow-auto text-app-text">
                {children}
            </main>

            {/* Notifications */}
            <NotificationToast />
            <NotificationDrawer isOpen={isNotificationOpen} onClose={() => setIsNotificationOpen(false)} />

            <style jsx global>{`
                @keyframes swing {
                    0% { transform: rotate(0deg); }
                    10% { transform: rotate(15deg); }
                    20% { transform: rotate(-10deg); }
                    30% { transform: rotate(5deg); }
                    40% { transform: rotate(-5deg); }
                    50% { transform: rotate(0deg); }
                    100% { transform: rotate(0deg); }
                }
                .animate-swing {
                    animation: swing 2s ease-in-out infinite;
                    transform-origin: top center;
                }
            `}</style>
        </div>
    );
}
