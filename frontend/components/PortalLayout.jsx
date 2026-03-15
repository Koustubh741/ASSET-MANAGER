import Link from 'next/link';
import { useRouter } from 'next/router';
import { useState } from 'react';
import { LayoutDashboard, DollarSign, PieChart, Settings, Menu, X, User, ShoppingBag, Truck, FileText, LifeBuoy } from 'lucide-react';
import { useRole } from '@/contexts/RoleContext';

const FINANCE_NAV = [
    { label: 'Dashboard', href: '/finance', icon: LayoutDashboard, exactMatch: true },
    { label: 'Budget queue', href: '/finance/budget-queue', icon: DollarSign },
    { label: 'Analytics', href: '/finance/analytics', icon: PieChart },
    { label: 'Support', href: '/tickets', icon: LifeBuoy },
    // Root fix: keep Finance users inside the Finance hub for settings
    { label: 'Settings', href: '/finance/settings', icon: Settings },
];

const PROCUREMENT_NAV = [
    { label: 'Dashboard', href: '/procurement', icon: LayoutDashboard, exactMatch: true },
    { label: 'Purchase orders', href: '/procurement/purchase-orders', icon: FileText },
    { label: 'Deliveries', href: '/procurement/deliveries', icon: Truck },
    { label: 'Analytics', href: '/procurement/analytics', icon: PieChart },
    { label: 'Support', href: '/tickets', icon: LifeBuoy },
    // Root fix: keep Procurement users inside the Procurement hub for settings
    { label: 'Settings', href: '/procurement/settings', icon: Settings },
];

export default function PortalLayout({ children, variant }) {
    const router = useRouter();
    const { logout, user, currentRole } = useRole();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    const isFinance = variant === 'finance';
    const navItems = isFinance ? FINANCE_NAV : PROCUREMENT_NAV;
    const portalName = isFinance ? 'Finance Portal' : 'Procurement Portal';
    const accentClass = isFinance
        ? 'from-emerald-500 to-teal-500'
        : 'from-blue-500 to-indigo-500';

    return (
        <div className="app-shell min-h-screen flex text-slate-900 dark:text-slate-100 font-sans text-slate-900 dark:text-slate-800 font-normal">
            <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:rounded-lg focus:bg-indigo-600 focus:text-slate-900 dark:text-white focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 focus:ring-offset-slate-950 focus:ring-offset-slate-100 focus:outline-none">
                Skip to main content
            </a>

            {/* Mobile header */}
            <header className={`md:hidden fixed top-0 left-0 right-0 z-30 h-14 bg-white dark:bg-slate-900/95 backdrop-blur-xl border-b border-slate-200 dark:border-white/10 bg-white/95 border-slate-200 flex items-center justify-between px-4`}>
                <h1 className={`text-lg font-bold bg-gradient-to-r ${accentClass} bg-clip-text text-transparent truncate`}>
                    {portalName}
                </h1>
                <button
                    onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                    className="p-2.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-white hover:bg-slate-200 hover:text-slate-900 dark:hover:bg-slate-200 dark:bg-white/10 text-slate-500 dark:text-slate-400 hover:text-slate-900 hover:bg-slate-200/80 focus:outline-none focus:ring-2 focus:ring-indigo-500 min-h-[44px] min-w-[44px] flex items-center justify-center"
                    aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
                >
                    {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
                </button>
            </header>

            {/* Mobile drawer */}
            <div className={`md:hidden fixed inset-0 z-20 transition-opacity duration-200 ${mobileMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)} aria-hidden="true" />
                <aside className={`absolute top-14 left-0 right-0 bottom-0 bg-white dark:bg-slate-900/98 backdrop-blur-xl border-r border-slate-200 dark:border-white/10 bg-white/98 border-slate-200 transform transition-transform duration-200 ease-out ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
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
                                    className={`flex items-center gap-3 px-4 py-3 rounded-xl min-h-[44px] transition-all ${isActive ? 'bg-blue-600/20 text-blue-300 border border-blue-500/30 bg-blue-100 text-blue-700 border-blue-200' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-100 dark:bg-white/5 text-slate-700 hover:bg-slate-100'}`}
                                >
                                    <Icon size={20} />
                                    <span className="font-medium">{item.label}</span>
                                </Link>
                            );
                        })}
                        <div className="mt-6 pt-4 border-t border-slate-200 dark:border-white/10">
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
                <div className={`h-full m-4 rounded-[2.5rem] glass-panel group-hover:bg-white/95 dark:group-hover:bg-white dark:bg-slate-900/80 flex flex-col shadow-[0_0_50px_-12px_rgba(0,0,0,0.15)] dark:shadow-[0_0_50px_-12px_rgba(0,0,0,0.5)] relative overflow-hidden transition-all duration-500`}>

                    {/* Background Glows */}
                    <div className={`absolute -top-24 -left-24 w-48 h-48 ${isFinance ? 'bg-emerald-500/10' : 'bg-blue-500/10'} blur-[80px] rounded-full pointer-events-none`}></div>
                    <div className={`absolute -bottom-24 -right-24 w-48 h-48 ${isFinance ? 'bg-teal-500/10' : 'bg-indigo-500/10'} blur-[80px] rounded-full pointer-events-none`}></div>

                    <div className="absolute inset-0 flex flex-col items-center pt-10 opacity-100 group-hover:opacity-0 transition-all duration-300 pointer-events-none z-10 scale-100 group-hover:scale-90">
                        <div className={`w-12 h-12 rounded-2xl bg-gradient-to-r ${accentClass} opacity-90 flex items-center justify-center mb-6 animate-float shadow-lg`}>
                            {isFinance ? <DollarSign size={22} className="text-slate-900 dark:text-white" /> : <ShoppingBag size={22} className="text-slate-900 dark:text-white" />}
                        </div>
                        <div className="flex flex-col gap-5 mt-4">
                            {navItems.map((item) => {
                                const Icon = item.icon;
                                const isActive = item.exactMatch
                                    ? (router.asPath === item.href || router.asPath === item.href + '/')
                                    : (router.asPath === item.href || (item.href !== '/' && router.asPath.startsWith(item.href)));
                                return (
                                    <div key={item.label} className={`p-2.5 rounded-xl ${isActive ? (isFinance ? 'text-emerald-500 dark:text-emerald-400 bg-emerald-500/10' : 'text-blue-500 dark:text-blue-400 bg-blue-500/10') : 'text-slate-500 dark:text-slate-400'}`}>
                                        <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div className="opacity-0 group-hover:opacity-100 transition-all duration-500 delay-100 flex flex-col h-full min-w-[17rem] pointer-events-none group-hover:pointer-events-auto">
                        <div className={`p-8 border-b border-slate-200 dark:border-white/5`}>
                            <h1 className="text-2xl font-bold bg-gradient-to-r from-slate-900 via-slate-600 to-slate-500 dark:from-white dark:via-slate-200 dark:to-slate-400 bg-clip-text text-transparent">{portalName}</h1>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 font-medium tracking-wide uppercase opacity-70">
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
                                            ? `${isFinance ? 'bg-emerald-500/15 dark:bg-emerald-600/20 text-emerald-600 dark:text-emerald-300 border-emerald-400/30 dark:border-emerald-500/30' : 'bg-blue-500/15 dark:bg-blue-600/20 text-blue-600 dark:text-blue-300 border-blue-400/30 dark:border-blue-500/30'} border shadow-lg`
                                            : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-100 dark:bg-white/5 hover:text-slate-900 dark:hover:text-slate-900 dark:text-white hover:pl-6'}`}
                                    >
                                        <div className={`p-1.5 rounded-lg transition-colors ${isActive ? (isFinance ? 'bg-emerald-500/20' : 'bg-blue-500/20') : 'group-hover/nav:bg-slate-200 dark:group-hover/nav:bg-slate-100 dark:bg-white/5'}`}>
                                            <Icon size={20} className={isActive ? (isFinance ? 'text-emerald-600 dark:text-emerald-300' : 'text-blue-600 dark:text-blue-300') : 'text-slate-500 dark:text-slate-400 group-hover/nav:text-slate-900 dark:group-hover/nav:text-slate-900 dark:text-white'} />
                                        </div>
                                        <span className={`font-medium tracking-tight ${isActive ? (isFinance ? 'text-emerald-700 dark:text-white' : 'text-blue-700 dark:text-white') : 'text-slate-500 dark:text-slate-400 group-hover/nav:text-slate-900 dark:group-hover/nav:text-slate-900 dark:text-white'}`}>{item.label}</span>
                                    </Link>
                                );
                            })}
                        </nav>
                        <div className="p-4 mt-auto">
                            <div className="p-4 rounded-2xl bg-slate-100 dark:bg-white/[0.03] border border-slate-200 dark:border-white/5 backdrop-blur-md">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-indigo-500 flex items-center justify-center border-2 border-indigo-300/30 dark:border-white/10 shrink-0 shadow-lg">
                                        <User size={20} className="text-slate-900 dark:text-white" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{user?.name || 'User'}</p>
                                        <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest truncate">{currentRole?.label}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => { logout(); window.location.href = '/login'; }}
                                    className="mt-4 w-full py-2.5 rounded-xl bg-slate-200 dark:bg-white/5 hover:bg-rose-500/10 text-slate-500 dark:text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 text-[11px] font-bold uppercase tracking-wider transition-all border border-slate-300 dark:border-white/5 hover:border-rose-500/30"
                                >
                                    Sign Out
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </aside>

            <main id="main-content" className="flex-1 md:ml-28 pt-20 md:pt-0 p-6 md:p-8 overflow-auto text-slate-900 dark:text-slate-800">
                {children}
            </main>
        </div>
    );
}
