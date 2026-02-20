import Link from 'next/link';
import { useRouter } from 'next/router';
import { useState } from 'react';
import { LayoutDashboard, DollarSign, PieChart, Settings, Menu, X, User, ShoppingBag, Truck, FileText } from 'lucide-react';
import { useRole } from '@/contexts/RoleContext';

const FINANCE_NAV = [
    { label: 'Dashboard', href: '/finance', icon: LayoutDashboard },
    { label: 'Budget queue', href: '/finance', icon: DollarSign },
    { label: 'Analytics', href: '/finance/analytics', icon: PieChart },
    { label: 'Settings', href: '/settings', icon: Settings },
];

const PROCUREMENT_NAV = [
    { label: 'Dashboard', href: '/procurement', icon: LayoutDashboard, exactMatch: true },
    { label: 'Purchase orders', href: '/procurement/purchase-orders', icon: FileText },
    { label: 'Deliveries', href: '/procurement/deliveries', icon: Truck },
    { label: 'Analytics', href: '/procurement/analytics', icon: PieChart },
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
        <div className="app-shell min-h-screen flex text-slate-100 font-sans light:text-slate-800 light:font-normal">
            <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:rounded-lg focus:bg-indigo-600 focus:text-white focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 focus:ring-offset-slate-950 light:focus:ring-offset-slate-100 focus:outline-none">
                Skip to main content
            </a>

            {/* Mobile header */}
            <header className={`md:hidden fixed top-0 left-0 right-0 z-30 h-14 bg-slate-900/95 backdrop-blur-xl border-b border-white/10 light:bg-white/95 light:border-slate-200 flex items-center justify-between px-4`}>
                <h1 className={`text-lg font-bold bg-gradient-to-r ${accentClass} bg-clip-text text-transparent truncate`}>
                    {portalName}
                </h1>
                <button
                    onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                    className="p-2.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 light:text-slate-600 light:hover:text-slate-900 light:hover:bg-slate-200/80 focus:outline-none focus:ring-2 focus:ring-indigo-500 min-h-[44px] min-w-[44px] flex items-center justify-center"
                    aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
                >
                    {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
                </button>
            </header>

            {/* Mobile drawer */}
            <div className={`md:hidden fixed inset-0 z-20 transition-opacity duration-200 ${mobileMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)} aria-hidden="true" />
                <aside className={`absolute top-14 left-0 right-0 bottom-0 bg-slate-900/98 backdrop-blur-xl border-r border-white/10 light:bg-white/98 light:border-slate-200 transform transition-transform duration-200 ease-out ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
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
                                    className={`flex items-center gap-3 px-4 py-3 rounded-xl min-h-[44px] transition-all ${isActive ? 'bg-blue-600/20 text-blue-300 border border-blue-500/30 light:bg-blue-100 light:text-blue-700 light:border-blue-200' : 'text-slate-300 hover:bg-white/5 light:text-slate-700 light:hover:bg-slate-100'}`}
                                >
                                    <Icon size={20} />
                                    <span className="font-medium">{item.label}</span>
                                </Link>
                            );
                        })}
                        <div className="mt-6 pt-4 border-t border-white/10 light:border-slate-200">
                            <button
                                onClick={() => { logout(); window.location.href = '/login'; }}
                                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl min-h-[44px] border border-rose-500/20 text-rose-400 hover:bg-rose-500/10 light:border-rose-200 light:text-rose-600 light:hover:bg-rose-50 font-medium"
                            >
                                Log Out
                            </button>
                        </div>
                    </nav>
                </aside>
            </div>

            {/* Desktop sidebar */}
            <aside className="fixed h-full z-20 hidden md:block group w-24 hover:w-72 transition-all duration-300 ease-in-out">
                <div className={`h-full m-4 rounded-2xl bg-slate-900/40 backdrop-blur-xl border border-white/10 light:bg-white/90 light:border-slate-200 flex flex-col shadow-2xl relative overflow-hidden transition-all duration-300 group-hover:bg-slate-900/60`}>
                    <div className="absolute inset-0 flex flex-col items-center pt-8 opacity-100 group-hover:opacity-0 transition-opacity duration-300 pointer-events-none">
                        <div className={`w-10 h-10 rounded-xl bg-gradient-to-r ${accentClass} opacity-80 flex items-center justify-center mb-4`}>
                            {isFinance ? <DollarSign size={22} className="text-white" /> : <ShoppingBag size={22} className="text-white" />}
                        </div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center px-1">{portalName.split(' ')[0]}</span>
                        <div className="flex flex-col gap-4 mt-4">
                            {navItems.map((item) => {
                                const Icon = item.icon;
                                const isActive = item.exactMatch
                                    ? (router.asPath === item.href || router.asPath === item.href + '/')
                                    : (router.asPath === item.href || (item.href !== '/' && router.asPath.startsWith(item.href)));
                                return (
                                    <div key={item.label} className={`p-2 rounded-lg ${isActive ? 'text-blue-400 bg-blue-500/10 light:text-blue-700 light:bg-blue-100' : 'text-slate-500 light:text-slate-600'}`}>
                                        <Icon size={20} />
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-75 flex flex-col h-full min-w-[16rem]">
                        <div className={`p-6 border-b border-white/5 light:border-slate-200 bg-gradient-to-r ${accentClass} bg-opacity-10`}>
                            <h1 className="text-xl font-bold text-slate-100 light:text-slate-800">{portalName}</h1>
                            <p className="text-xs text-slate-400 light:text-slate-600 mt-1">
                                {isFinance ? 'Budget approvals & financial governance' : 'Purchase orders & delivery'}
                            </p>
                        </div>
                        <nav className="p-4 space-y-2 flex-1 overflow-y-auto">
                            {navItems.map((item) => {
                                const Icon = item.icon;
                                const isActive = item.exactMatch
                                    ? (router.asPath === item.href || router.asPath === item.href + '/')
                                    : (router.asPath === item.href || (item.href !== '/' && router.asPath.startsWith(item.href)));
                                return (
                                    <Link
                                        key={item.label}
                                        href={item.href}
                                        className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all whitespace-nowrap ${isActive ? 'bg-blue-600/20 text-blue-300 border border-blue-500/30 light:bg-blue-100 light:text-blue-700 light:border-blue-200' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200 light:text-slate-700 light:hover:bg-slate-100 light:hover:text-slate-900'}`}
                                    >
                                        <Icon size={20} />
                                        <span className="font-medium">{item.label}</span>
                                    </Link>
                                );
                            })}
                        </nav>
                        <div className="p-4 border-t border-white/10 light:border-slate-200">
                            <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-white/5 light:bg-slate-100">
                                <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center shrink-0">
                                    <User size={16} className="text-indigo-300" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-sm font-semibold text-white truncate light:text-slate-900">{user?.name || 'User'}</p>
                                    <p className="text-xs text-slate-400 truncate light:text-slate-600">{currentRole?.label}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => { logout(); window.location.href = '/login'; }}
                                className="mt-3 w-full py-2 rounded-lg border border-rose-500/20 text-rose-400 text-xs font-medium hover:bg-rose-500/10"
                            >
                                Log Out
                            </button>
                        </div>
                    </div>
                </div>
            </aside>

            <main id="main-content" className="flex-1 md:ml-28 pt-20 md:pt-0 p-6 md:p-8 overflow-auto light:text-slate-800">
                {children}
            </main>
        </div>
    );
}
