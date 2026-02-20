import Link from 'next/link'
import { useRouter } from 'next/router'
import { useState, useEffect } from 'react'
import { LayoutDashboard, Server, Settings, User, RotateCcw, ShoppingBag, Trash2, Sparkles, Monitor, MapPin, ChevronUp, Check, Cpu, Network, DollarSign, Menu, X, Shield, Bot, Wallet } from 'lucide-react'
import { useRole } from '@/contexts/RoleContext'
import AIAssistantSidebar from '@/components/AIAssistantSidebar'

const ROLES = [
    { label: 'System Admin', dept: 'IT Dept' },
    { label: 'Asset Owner', dept: 'Operations' },
    { label: 'Asset Manager', dept: 'IT Asset' },
    { label: 'Custodian', dept: 'Logistics' },
    { label: 'Inventory Manager', dept: 'Warehouse' },
    { label: 'Procurement Manager', dept: 'Procurement' },
    { label: 'IT Support', dept: 'Helpdesk' },
    { label: 'Audit Officer', dept: 'Compliance' },
    { label: 'Finance', dept: 'Accounts' },
    { label: 'End User', dept: 'Employee' },
];

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
        'System Admin': '/dashboard/system-admin',
        'Asset Manager': '/dashboard/asset-inventory-manager',
        'Asset & Inventory Manager': '/dashboard/asset-inventory-manager',
        'Inventory Manager': '/dashboard/asset-inventory-manager',
        'Procurement Manager': '/procurement',
        'IT Support': '/dashboard/it-management',
        'IT Management': '/dashboard/it-management',
        'Audit Officer': '/dashboard/audit',
        'Finance': '/finance',
        'End User': '/dashboard/end-user'
    };

    // Use mapped path or fallback
    const dashboardPath = ROLE_DASHBOARD_MAP[currentRole.label] || '/dashboard/end-user';

    const allNavItems = [
        { label: 'Dashboard', href: dashboardPath, icon: LayoutDashboard },
        { label: 'Enterprise', href: '/enterprise', icon: Sparkles },
        { label: 'Topology', href: '/network-topology', icon: Network },
        { label: 'Assets', href: '/assets', icon: Server },
        { label: 'Software', href: '/software', icon: Monitor },
        { label: 'Locations', href: '/locations', icon: MapPin },
        { label: 'Agents', href: '/agents', icon: Cpu },
        { label: 'Port Policies', href: '/security/port-policies', icon: Shield },
        { label: 'Renewals', href: '/renewals', icon: RotateCcw },
        { label: 'Procurement', href: '/procurement', icon: ShoppingBag },
        { label: 'Finance', href: '/finance', icon: Wallet },
        { label: 'Disposal', href: '/disposal', icon: Trash2 },
        { label: 'Pricing', href: '/pricing', icon: DollarSign },
        { label: 'Settings', href: '/settings', icon: Settings },
    ]

    const fullAccessRoles = ['System Admin', 'Asset & Inventory Manager', 'Asset Manager', 'Inventory Manager'];
    const navItemsBase = fullAccessRoles.includes(currentRole.label)
        ? allNavItems
        : allNavItems.filter(item => ['Dashboard', 'Enterprise', 'Pricing'].includes(item.label)); // Allow Enterprise and Pricing portal for others too
    // System Admin: "Procurement" and "Finance" go to read-only step updates, not portals
    const navItems = navItemsBase.map(item => {
        if (currentRole?.label !== 'System Admin') return item;
        if (item.label === 'Procurement') return { ...item, href: '/dashboard/system-admin/procurement' };
        if (item.label === 'Finance') return { ...item, href: '/dashboard/system-admin/finance' };
        return item;
    });

    return (
        <div className="app-shell h-screen flex flex-col text-slate-100 font-sans light:text-slate-800 light:font-normal">
            {/* Skip to main content - visible on focus */}
            <a
                href="#main-content"
                className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:rounded-lg focus:bg-indigo-600 focus:text-white focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 focus:ring-offset-slate-950 light:focus:ring-offset-slate-100 focus:outline-none"
            >
                Skip to main content
            </a>

            {/* Mobile Header - Sticky, visible on small screens */}
            <header className="md:hidden fixed top-0 left-0 right-0 z-30 h-14 bg-slate-900/95 backdrop-blur-xl border-b border-white/10 light:bg-white/95 light:border-slate-200 flex items-center justify-between px-4">
                <h1 className="text-lg font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent truncate">ITSM</h1>
                <button
                    onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                    className="p-2.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 light:text-slate-600 light:hover:text-slate-900 light:hover:bg-slate-200/80 focus:outline-none focus:ring-2 focus:ring-indigo-500 min-h-[44px] min-w-[44px] flex items-center justify-center"
                    aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
                    title={mobileMenuOpen ? 'Close menu' : 'Open menu'}
                >
                    {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
                </button>
            </header>

            {/* Mobile Drawer */}
            <div className={`md:hidden fixed inset-0 z-20 transition-opacity duration-200 ${mobileMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)} aria-hidden="true" />
                <aside className={`absolute top-14 left-0 right-0 bottom-0 bg-slate-900/98 backdrop-blur-xl border-r border-white/10 light:bg-white/98 light:border-slate-200 transform transition-transform duration-200 ease-out ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                    <nav className="p-4 space-y-1 overflow-y-auto pt-6">
                        {navItems.map((item) => {
                            const Icon = item.icon;
                            const isActive = router.asPath === item.href || (item.href !== '/' && router.asPath.startsWith(item.href));
                            return (
                                <Link
                                    key={item.href}
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

            {/* Sidebar - Glassmorphism (desktop) */}
            <aside className="fixed h-full z-20 hidden md:block group w-24 hover:w-72 transition-all duration-300 ease-in-out">
                <div className="h-full m-4 rounded-2xl bg-slate-900/40 backdrop-blur-xl border border-white/10 light:bg-white/90 light:border-slate-200 light:group-hover:bg-white flex flex-col shadow-2xl relative overflow-hidden transition-all duration-300 group-hover:bg-slate-900/60">

                    {/* Collapsed State Logo (Visible only when NOT hovered) */}
                    <div className="absolute inset-0 flex flex-col items-center pt-8 opacity-100 group-hover:opacity-0 transition-opacity duration-300 pointer-events-none z-10">
                        <div className="w-14 h-14 flex items-center justify-center mb-4">
                            <img src="/assets/itsm-logo.png" alt="ITSM Logo" className="w-full h-full object-contain drop-shadow-lg" />
                        </div>
                        <div className="flex flex-col gap-4 mt-4">
                            {navItems.map((item) => {
                                const Icon = item.icon
                                // Use asPath for accurate active state on dynamic routes
                                const isActive = router.asPath === item.href || (item.href !== '/' && router.asPath.startsWith(item.href))
                                return (
                                    <div key={item.href} className={`p-2 rounded-lg ${isActive ? 'text-blue-400 bg-blue-500/10 light:text-blue-700 light:bg-blue-100' : 'text-slate-500 light:text-slate-600'}`}>
                                        <Icon size={20} />
                                    </div>
                                )
                            })}
                        </div>
                    </div>

                    {/* Expanded Content (Visible only on hover) - overlay so only one sidebar shows */}
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-75 flex flex-col h-full min-w-0 pointer-events-none group-hover:pointer-events-auto">
                        <div className="p-8 border-b border-white/5 light:border-slate-200 whitespace-nowrap">
                            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent">
                                ITSM Asset Mgr
                            </h1>
                        </div>

                        <nav className="p-4 space-y-2 flex-1 overflow-y-auto custom-scrollbar">
                            {navItems.map((item) => {
                                const Icon = item.icon
                                const isActive = router.asPath === item.href || (item.href !== '/' && router.asPath.startsWith(item.href))
                                return (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        className={`flex items-center space-x-3 px-4 py-3.5 rounded-xl transition-all duration-300 whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 focus:ring-offset-slate-900 light:focus:ring-offset-slate-100 ${isActive
                                            ? 'bg-blue-600/20 text-blue-300 border border-blue-500/30 shadow-lg shadow-blue-500/10 light:bg-blue-100 light:text-blue-700 light:border-blue-200'
                                            : 'text-slate-400 hover:bg-white/5 hover:text-slate-200 hover:pl-5 light:text-slate-700 light:hover:bg-slate-100 light:hover:text-slate-900'
                                            }`}
                                    >
                                        <Icon size={20} className={isActive ? 'text-blue-400 light:text-blue-700' : 'text-slate-500 light:text-slate-600 transition-colors'} />
                                        <span className="font-medium">{item.label}</span>
                                    </Link>
                                )
                            })}
                        </nav>

                        <div className="relative whitespace-nowrap">
                            <div className="p-4 m-4 rounded-xl bg-gradient-to-br from-white/5 to-transparent border border-white/5 light:from-slate-100 light:to-transparent light:border-slate-200">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-3">
                                        <div className="w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center border border-indigo-500/30 shrink-0">
                                            <User size={20} className="text-indigo-300" />
                                        </div>
                                        <div className="text-sm overflow-hidden min-w-0">
                                            <p className="text-white font-semibold truncate light:text-slate-900">
                                                {user?.name || 'User'}
                                            </p>
                                            <span className="inline-block mt-1 px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 text-xs font-semibold border border-indigo-500/30 truncate max-w-full">
                                                {currentRole.label}
                                            </span>
                                            <p className="text-slate-500 text-xs truncate mt-0.5 light:text-slate-600">
                                                {user?.department || "General"}
                                            </p>
                                            <p className="text-slate-500 text-xs truncate mt-0.5 light:text-slate-600">
                                                {user?.email || '—'}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Logout Button (Small, under profile) */}
                            <div className="mx-4 mb-4">
                                <button
                                    onClick={() => {
                                        logout();
                                        window.location.href = '/login';
                                    }}
                                    className="w-full py-2 rounded-lg border border-rose-500/20 text-rose-400 text-xs font-medium hover:bg-rose-500/10 hover:text-rose-300 light:border-rose-200 light:text-rose-600 light:hover:bg-rose-50 transition-colors flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 focus:ring-offset-slate-900 light:focus:ring-offset-slate-100"
                                >
                                    Log Out
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Main Content - fills viewport, scrolls inside */}
            <main id="main-content" className="flex-1 min-h-0 md:ml-28 pt-20 md:pt-0 p-6 md:p-8 animate-in fade-in duration-700 overflow-auto light:text-slate-800">
                {/* Getting started onboarding - dismissed via localStorage */}
                {showOnboarding && (
                    <div className="mb-6 p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20 light:bg-indigo-50 light:border-indigo-200 flex items-center justify-between gap-4 animate-in slide-in-from-top-4 fade-in duration-500">
                        <p className="text-sm text-slate-200 light:text-slate-700">
                            <span className="font-semibold text-indigo-300 light:text-indigo-600">Getting started:</span> Request an asset from your dashboard or view your tickets.
                        </p>
                        <button
                            onClick={dismissOnboarding}
                            className="shrink-0 px-3 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 light:text-slate-600 light:hover:text-slate-900 light:hover:bg-slate-200 text-xs font-medium transition-colors"
                        >
                            Dismiss
                        </button>
                    </div>
                )}
                {/* System Update Banner (Mock) - Controlled by Settings */}
                {(() => {
                    if (typeof window !== 'undefined') {
                        const saved = localStorage.getItem('appSettings');
                        if (saved) {
                            try {
                                const { notifications } = JSON.parse(saved);
                                if (notifications?.system) {
                                    return (
                                        <div className="mb-6 p-4 rounded-xl bg-gradient-to-r from-blue-600/20 to-purple-600/20 border border-blue-500/30 light:from-blue-50 light:to-purple-50 light:border-blue-200 flex items-center justify-between animate-in slide-in-from-top-4 fade-in duration-500">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 rounded-full bg-blue-500/20 text-blue-400 light:bg-blue-100 light:text-blue-600">
                                                    <Sparkles size={18} />
                                                </div>
                                                <div>
                                                    <h4 className="text-sm font-bold text-white light:text-slate-800">System Update Available</h4>
                                                    <p className="text-xs text-slate-300 light:text-slate-600">Version 2.5 is scheduled for deployment on Saturday 10:00 PM EST.</p>
                                                </div>
                                            </div>
                                            <button className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/20 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 focus:ring-offset-slate-900 light:focus:ring-offset-slate-100">
                                                View Details
                                            </button>
                                        </div>
                                    )
                                }
                            } catch (e) { }
                        }
                    }
                    return null;
                })()}

                {children}

                {/* Footer */}
                <footer className="mt-12 pt-6 border-t border-white/5 light:border-slate-200 text-center text-xs text-slate-500 light:text-slate-600">
                    Asset Manager v1.0
                </footer>
            </main>

            {/* Floating AI Assistant Button */}
            <button
                onClick={() => setIsAIOpen(true)}
                className="fixed bottom-6 right-6 z-30 p-3 rounded-full bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 hover:scale-105 transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 focus:ring-offset-slate-900 light:focus:ring-offset-slate-100 min-h-[48px] min-w-[48px] flex items-center justify-center"
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

