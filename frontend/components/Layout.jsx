import Link from 'next/link'
import { useRouter } from 'next/router'
import { useState, useEffect } from 'react'
import { LayoutDashboard, Server, Settings, User, RotateCcw, ShoppingBag, Trash2, Sparkles, Monitor, MapPin, ChevronUp, Check, Cpu, Network, DollarSign, Menu, X, Shield, Bot, Wallet, Scan, GitBranch, Ticket, BarChart2, Trophy, Zap, Clock, LifeBuoy } from 'lucide-react'
import { useRole } from '@/contexts/RoleContext'
import AIAssistantSidebar from '@/components/AIAssistantSidebar'

// Redundant ROLES removed, using from RoleContext

export default function Layout({ children }) {
    const router = useRouter()
    const { currentRole, setCurrentRole, ROLES, logout, user } = useRole();
    const [isRoleMenuOpen, setIsRoleMenuOpen] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [showOnboarding, setShowOnboarding] = useState(false);
    const [isAIOpen, setIsAIOpen] = useState(false);
    useEffect(() => {
        if (typeof window !== 'undefined' && !localStorage.getItem('onboardingDismissed')) {
            setShowOnboarding(true);
        }
    }, []);
    const dismissOnboarding = () => {
        localStorage.setItem('onboardingDismissed', 'true');
        setShowOnboarding(false);
    };

    const ROLE_DASHBOARD_MAP = {
        'ADMIN': '/dashboard/system-admin',
        'ASSET_MANAGER': '/dashboard/asset-inventory-manager',
        'PROCUREMENT': '/procurement',
        'IT_MANAGEMENT': '/dashboard/it-management',
        'FINANCE': '/finance',
        'END_USER': '/dashboard/end-user'
    };

    // Use mapped path or fallback
    const dashboardPath = ROLE_DASHBOARD_MAP[currentRole.slug] || '/dashboard/end-user';

    const allNavItems = [
        { label: 'Dashboard', href: dashboardPath, icon: LayoutDashboard },
        { label: 'Support & Tickets', href: '/tickets', icon: LifeBuoy },
        { label: 'Enterprise', href: '/enterprise', icon: Sparkles },
        { label: 'Topology', href: '/network-topology', icon: Network },
        { label: 'Assets', href: '/assets', icon: Server },
        { label: 'Software', href: '/software', icon: Monitor },
        { label: 'Patch Management', href: '/patch-management', icon: Shield },
        { label: 'RFID Management', href: '/rfid', icon: Cpu },
        { label: 'Barcode Scan', href: '/barcode-scan', icon: Scan },
        { label: 'Workflows', href: '/workflows', icon: GitBranch },
        { label: 'Ticket Automation', href: '/tickets/automation', icon: Zap },
        { label: 'SLA Center', href: '/tickets/sla', icon: Clock },
        { label: 'Analytics', href: '/analytics', icon: BarChart2 },
        { label: 'Top Performers', href: '/performers', icon: Trophy },
        { label: 'Gate Pass', href: '/gate-pass', icon: Ticket },
        { label: 'Locations', href: '/locations', icon: MapPin },
        { label: 'Agents', href: '/agents', icon: Cpu },
        { label: 'Port Policies', href: '/security/port-policies', icon: Shield },
        { label: 'Renewals', href: '/renewals', icon: RotateCcw },
        { label: 'Procurement', href: '/procurement', icon: ShoppingBag },
        { label: 'Finance', href: '/finance', icon: Wallet },
        { label: 'Budget Queue', href: '/finance/budget-queue', icon: DollarSign },
        { label: 'Disposal', href: '/disposal', icon: Trash2 },
        { label: 'Pricing', href: '/pricing', icon: DollarSign },
        { label: 'Settings', href: '/settings', icon: Settings },
    ]

    const navItemsBase = currentRole.slug === 'ADMIN'
        ? allNavItems
        : allNavItems.filter(item => {
            const basicItems = ['Dashboard', 'Assets', 'Software', 'Tickets'];
            if (basicItems.includes(item.label)) return true;

            // Show Patch Management for IT staff
            if (item.label === 'Patch Management' && ['IT_MANAGEMENT', 'IT_SUPPORT', 'ADMIN', 'ASSET_MANAGER'].includes(currentRole.slug)) return true;

            // Show Operations tools for Asset Managers and Admins
            const opsItems = ['RFID Management', 'Barcode Scan', 'Gate Pass'];
            if (opsItems.includes(item.label) && ['ASSET_MANAGER', 'IT_MANAGEMENT', 'ADMIN'].includes(currentRole.slug)) return true;

            // Workflows for Managers and relevant roles
            if (item.label === 'Workflows' && ['IT_MANAGEMENT', 'FINANCE', 'PROCUREMENT', 'ADMIN', 'MANAGER'].includes(currentRole.slug)) return true;

            // Show Disposal for roles that need it
            if (item.label === 'Disposal' && ['ASSET_MANAGER', 'IT_MANAGEMENT', 'FINANCE', 'PROCUREMENT', 'ADMIN', 'MANAGER'].includes(currentRole.slug)) return true;

            // Managers see Enterprise/Topology/Renewals
            if (['Enterprise', 'Topology', 'Renewals'].includes(item.label) && currentRole.slug !== 'END_USER') return true;

            // Analytics & Performers visible to IT/Admin/Manager roles
            if (['Analytics', 'Top Performers', 'Ticket Automation', 'SLA Center'].includes(item.label) && ['IT_MANAGEMENT', 'IT_SUPPORT', 'ASSET_MANAGER', 'ADMIN', 'MANAGER'].includes(currentRole.slug)) return true;

            return false;
        });
    // System Admin: "Procurement" and "Finance" go to read-only step updates, not portals
    const navItems = navItemsBase.map(item => {
        if (currentRole?.slug !== 'ADMIN') return item;
        if (item.label === 'Procurement') return { ...item, href: '/dashboard/system-admin/procurement' };
        if (item.label === 'Finance') return { ...item, href: '/dashboard/system-admin/finance' };
        return item;
    });

    return (
        <div className="app-shell h-screen flex flex-col text-slate-900 dark:text-slate-100 font-sans text-slate-900 dark:text-slate-800 font-normal">
            {/* Skip to main content - visible on focus */}
            <a
                href="#main-content"
                className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:rounded-lg focus:bg-indigo-600 focus:text-slate-900 dark:text-white focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 focus:ring-offset-slate-950 focus:ring-offset-slate-100 focus:outline-none"
            >
                Skip to main content
            </a>

            {/* Mobile Header - Sticky, visible on small screens */}
            <header className="md:hidden fixed top-0 left-0 right-0 z-30 h-14 bg-white dark:bg-slate-900/95 backdrop-blur-xl border-b border-slate-200 dark:border-white/10 bg-white/95 border-slate-200 flex items-center justify-between px-4">
                <h1 className="text-lg font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent truncate">ITSM</h1>
                <button
                    onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                    className="p-2.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-white hover:bg-slate-200 hover:text-slate-900 dark:hover:bg-slate-200 dark:bg-white/10 text-slate-500 dark:text-slate-400 hover:text-slate-900 hover:bg-slate-200/80 focus:outline-none focus:ring-2 focus:ring-indigo-500 min-h-[44px] min-w-[44px] flex items-center justify-center"
                    aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
                    title={mobileMenuOpen ? 'Close menu' : 'Open menu'}
                >
                    {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
                </button>
            </header>

            {/* Mobile Drawer */}
            <div className={`md:hidden fixed inset-0 z-20 transition-opacity duration-200 ${mobileMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)} aria-hidden="true" />
                <aside className={`absolute top-14 left-0 right-0 bottom-0 bg-white dark:bg-slate-900/98 backdrop-blur-xl border-r border-slate-200 dark:border-white/10 bg-white/98 border-slate-200 transform transition-transform duration-200 ease-out ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                    <nav className="p-4 space-y-1 overflow-y-auto pt-6">
                        {navItems.map((item) => {
                            const Icon = item.icon;
                            const isActive = router.asPath === item.href || (item.href !== '/' && router.asPath.startsWith(item.href));
                            return (
                                <Link
                                    key={item.href}
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

            {/* Sidebar - Glassmorphism (desktop) */}
            <aside className="fixed h-full z-20 hidden md:block group w-24 hover:w-72 transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]">
                <div className="h-full m-4 rounded-[2.5rem] glass-panel group-hover:bg-white/95 dark:group-hover:bg-white dark:bg-slate-900/80 flex flex-col shadow-[0_0_50px_-12px_rgba(0,0,0,0.15)] dark:shadow-[0_0_50px_-12px_rgba(0,0,0,0.5)] relative overflow-hidden transition-all duration-500">

                    {/* Background Glows for Sidebar */}
                    <div className="absolute -top-24 -left-24 w-48 h-48 bg-indigo-500/20 blur-[80px] rounded-full pointer-events-none"></div>
                    <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-sky-500/10 blur-[80px] rounded-full pointer-events-none"></div>

                    {/* Collapsed State Logo (Visible only when NOT hovered) */}
                    <div className="absolute inset-0 flex flex-col items-center pt-10 opacity-100 group-hover:opacity-0 transition-all duration-300 pointer-events-none z-10 scale-100 group-hover:scale-90">
                        <div className="w-12 h-12 flex items-center justify-center mb-6 animate-float">
                            <img src="/assets/itsm-logo.png" alt="ITSM Logo" className="w-full h-full object-contain filter drop-shadow-[0_0_8px_rgba(99,102,241,0.5)]" />
                        </div>
                        <div className="flex flex-col gap-5 mt-4">
                            {navItems.map((item) => {
                                const Icon = item.icon
                                const isActive = router.asPath === item.href || (item.href !== '/' && router.asPath.startsWith(item.href))
                                return (
                                    <div key={item.href} className={`p-2.5 rounded-xl transition-all duration-300 ${isActive ? 'text-indigo-500 dark:text-indigo-400 bg-indigo-500/10 shadow-[0_0_15px_rgba(99,102,241,0.2)]' : 'text-slate-500 dark:text-slate-400'}`}>
                                        <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
                                    </div>
                                )
                            })}
                        </div>
                    </div>

                    {/* Expanded Content (Visible only on hover) */}
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-all duration-500 delay-100 flex flex-col h-full min-w-0 pointer-events-none group-hover:pointer-events-auto">
                        <div className="p-8 border-b border-slate-200 dark:border-white/5 whitespace-nowrap">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 shrink-0">
                                    <img src="/assets/itsm-logo.png" alt="Logo" className="w-full h-full object-contain" />
                                </div>
                                <h1 className="text-2xl font-bold bg-gradient-to-r from-slate-900 via-indigo-600 to-sky-600 dark:from-white dark:via-indigo-200 dark:to-sky-200 bg-clip-text text-transparent">
                                    {currentRole.slug === 'ADMIN' ? 'ITSM Admin' : currentRole.label}
                                </h1>
                            </div>
                        </div>

                        <nav className="p-5 space-y-1.5 flex-1 overflow-y-auto custom-scrollbar">
                            {navItems.map((item) => {
                                const Icon = item.icon
                                const isActive = router.asPath === item.href || (item.href !== '/' && router.asPath.startsWith(item.href))
                                return (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        className={`flex items-center space-x-3 px-4 py-3.5 rounded-2xl transition-all duration-300 whitespace-nowrap group/nav ${isActive
                                            ? 'bg-indigo-500/15 dark:bg-indigo-600/20 text-indigo-600 dark:text-indigo-300 border border-indigo-400/30 dark:border-indigo-500/30 shadow-[0_0_20px_rgba(99,102,241,0.1)] dark:shadow-[0_0_20px_rgba(99,102,241,0.15)]'
                                            : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-100 dark:bg-white/5 hover:text-slate-900 dark:hover:text-slate-900 dark:text-white hover:pl-6'
                                            }`}
                                    >
                                        <div className={`p-1.5 rounded-lg transition-colors ${isActive ? 'bg-indigo-500/20' : 'group-hover/nav:bg-slate-200 dark:group-hover/nav:bg-slate-100 dark:bg-white/5'}`}>
                                            <Icon size={20} className={isActive ? 'text-indigo-600 dark:text-indigo-300' : 'text-slate-500 dark:text-slate-400 group-hover/nav:text-slate-900 dark:group-hover/nav:text-slate-900 dark:text-white'} />
                                        </div>
                                        <span className={`font-medium tracking-tight ${isActive ? 'text-indigo-700 dark:text-indigo-100' : 'text-slate-500 dark:text-slate-400 group-hover/nav:text-slate-900 dark:group-hover/nav:text-slate-900 dark:text-white'}`}>
                                            {item.label}
                                        </span>
                                    </Link>
                                )
                            })}
                        </nav>

                        <div className="relative whitespace-nowrap p-4 mt-auto">
                            <div className="p-4 rounded-2xl bg-slate-100 dark:bg-white/[0.03] border border-slate-200 dark:border-white/5 backdrop-blur-md">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-indigo-500 flex items-center justify-center border-2 border-indigo-300/30 dark:border-white/10 shrink-0 shadow-lg glow-pulse">
                                        <User size={20} className="text-slate-900 dark:text-white" />
                                    </div>
                                    <div className="text-sm overflow-hidden min-w-0">
                                        <p className="text-slate-900 dark:text-white font-bold truncate">
                                            {user?.name || 'User'}
                                        </p>
                                        <div className="flex items-center gap-1.5 mt-0.5">
                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                            <span className="text-slate-500 dark:text-slate-400 text-[11px] font-bold uppercase tracking-wider truncate">
                                                {currentRole.label}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <button
                                    onClick={() => {
                                        logout();
                                        window.location.href = '/login';
                                    }}
                                    className="mt-4 w-full py-2.5 rounded-xl bg-slate-200 dark:bg-white/5 hover:bg-rose-500/10 text-slate-500 dark:text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 text-xs font-bold transition-all border border-slate-300 dark:border-white/5 hover:border-rose-500/30 flex items-center justify-center gap-2 group/logout"
                                >
                                    <X size={14} className="transition-transform group-hover/logout:rotate-90" />
                                    Log Out
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Main Content - fills viewport, scrolls inside */}
            <main id="main-content" className="flex-1 min-h-0 md:ml-32 pt-20 md:pt-0 p-6 md:p-10 animate-in fade-in zoom-in-95 duration-1000 overflow-auto text-slate-900 dark:text-slate-200">
                {/* Getting started onboarding - dismissed via localStorage */}
                {showOnboarding && (
                    <div className="mb-6 p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20 bg-indigo-50 border-indigo-200 flex items-center justify-between gap-4 animate-in slide-in-from-top-4 fade-in duration-500">
                        <p className="text-sm text-slate-900 dark:text-slate-200">
                            <span className="font-semibold text-indigo-600 dark:text-indigo-300">Getting started:</span> Request an asset from your dashboard or view your tickets.
                        </p>
                        <button
                            onClick={dismissOnboarding}
                            className="shrink-0 px-3 py-2 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-white hover:bg-slate-200 hover:text-slate-900 dark:hover:bg-slate-200 dark:bg-white/10 text-slate-500 dark:text-slate-400 hover:text-slate-900 hover:bg-slate-200 text-xs font-medium transition-colors"
                        >
                            Dismiss
                        </button>
                    </div>
                )}

                {children}

                {/* Footer */}
                <footer className="mt-12 pt-6 border-t border-slate-200 dark:border-white/5 text-center text-xs text-slate-500 dark:text-slate-400">
                    Asset Manager v1.0
                </footer>
            </main>

            {/* Floating AI Assistant Button */}
            <button
                onClick={() => setIsAIOpen(true)}
                className="fixed bottom-6 right-6 z-30 p-3 rounded-full bg-gradient-to-r from-blue-600 to-cyan-600 text-slate-900 dark:text-white shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 hover:scale-105 transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 focus:ring-offset-slate-900 focus:ring-offset-slate-100 min-h-[48px] min-w-[48px] flex items-center justify-center"
                aria-label="Open AI Assistant"
                title="AI Assistant"
            >
                <Bot size={24} />
            </button>

            {/* AI Assistant Sidebar */}
            <AIAssistantSidebar isOpen={isAIOpen} onClose={() => setIsAIOpen(false)} />
        </div>
    )
}

