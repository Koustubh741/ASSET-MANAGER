import Link from 'next/link';
import { useRouter } from 'next/router';
import { useState, useMemo } from 'react';
import * as LucideIcons from 'lucide-react';
import { 
    LayoutDashboard, DollarSign, PieChart, Settings, Menu, X, User, 
    ShoppingBag, Truck, FileText, LifeBuoy, Bell, Shield, Eye, Monitor,
    Wallet, Store, ShoppingBasket, Users, TrendingUp, Megaphone, Rocket,
    Target, Building, HardHat, Package, Scissors, Crown
} from 'lucide-react';
import { useRole } from '@/contexts/RoleContext';
import { useNotifications } from '@/contexts/NotificationContext';
import NotificationToast from '@/components/NotificationToast';
import NotificationDrawer from '@/components/NotificationDrawer';
import ExperienceCinematic from './ExperienceCinematic';

const PORTAL_CONFIGS = {
    finance: {
        name: 'Finance Portal',
        subtitle: 'Financial Governance',
        nav: [
            { label: 'Dashboard', href: '/finance', icon: 'LayoutDashboard', exactMatch: true },
            { label: 'Budget Queue', href: '/finance/budget-queue', icon: 'DollarSign' },
            { label: 'Analytics', href: '/finance/analytics', icon: 'PieChart' },
            { label: 'Support & Tickets', href: '/tickets', icon: 'LifeBuoy' },
            { label: 'Settings', href: '/finance/settings', icon: 'Settings' },
        ]
    },
    procurement: {
        name: 'Procurement Portal',
        subtitle: 'Supply Chain Operations',
        nav: [
            { label: 'Dashboard', href: '/procurement', icon: 'LayoutDashboard', exactMatch: true },
            { label: 'Purchase Orders', href: '/procurement/purchase-orders', icon: 'FileText' },
            { label: 'Deliveries', href: '/procurement/deliveries', icon: 'Truck' },
            { label: 'Analytics', href: '/procurement/analytics', icon: 'PieChart' },
            { label: 'Support & Tickets', href: '/tickets', icon: 'LifeBuoy' },
            { label: 'Settings', href: '/procurement/settings', icon: 'Settings' },
        ]
    },
    it: {
        name: 'IT Command Hub',
        subtitle: 'Enterprise Infrastructure',
        nav: [
            { label: 'System Dashboard', href: '/dashboard/system-admin', icon: 'LayoutDashboard', exactMatch: true },
            { label: 'Assets', href: '/assets', icon: 'Monitor' },
            { label: 'Topology', href: '/network-topology', icon: 'Shield' },
            { label: 'Automation', href: '/tickets/automation', icon: 'Settings' },
            { label: 'Support', href: '/support-dashboard', icon: 'LifeBuoy' },
        ]
    },
    security: {
        name: 'LP & Audit Matrix',
        subtitle: 'Loss Prevention & Security',
        nav: [
            { label: 'LP Dashboard', href: '/dashboard/audit-officer', icon: 'LayoutDashboard', exactMatch: true },
            { label: 'Port Policies', href: '/security/port-policies', icon: 'Shield' },
            { label: 'Access Control', href: '/settings', icon: 'Settings' },
            { label: 'Support', href: '/tickets', icon: 'LifeBuoy' },
        ]
    },
    operations: {
        name: 'Operation Portal',
        subtitle: 'Business Support Units',
        nav: [
            { label: 'Dashboard', href: '/dashboard', icon: 'LayoutDashboard', exactMatch: true },
            { label: 'My Requests', href: '/tickets', icon: 'FileText' },
            { label: 'Resources', href: '/assets', icon: 'Package' },
            { label: 'Support', href: '/tickets/new', icon: 'LifeBuoy' },
        ]
    }
};

export default function PortalLayout({ children, variant }) {
    const router = useRouter();
    const { logout, user, currentRole, theme, isFinance, isProcurement, isLossPrevention, isAdmin, preferences, setHasSeenExperience, isLoading: isRoleLoading } = useRole();
    const { unreadCount } = useNotifications();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [isNotificationOpen, setIsNotificationOpen] = useState(false);

    // Dynamic configuration based on RoleContext theme and variant
    const activeConfig = useMemo(() => {
        if (variant) return PORTAL_CONFIGS[variant] || PORTAL_CONFIGS.operations;
        if (isFinance) return PORTAL_CONFIGS.finance;
        if (isProcurement) return PORTAL_CONFIGS.procurement;
        if (isLossPrevention) return PORTAL_CONFIGS.security;
        if (isAdmin) return PORTAL_CONFIGS.it;
        return PORTAL_CONFIGS.operations;
    }, [variant, isFinance, isProcurement, isLossPrevention, isAdmin]);

    const accentClass = theme?.accent || 'from-slate-500 to-slate-700';
    const colorName = theme?.color || 'slate';
    const PortalIcon = LucideIcons[theme?.icon] || Monitor;

    const navItems = activeConfig.nav.map(item => ({
        ...item,
        IconComponent: LucideIcons[item.icon] || LayoutDashboard
    }));

    // Helper for reactive colors
    const getActiveStyles = (isActive) => {
        if (!isActive) return 'text-app-text-muted hover:bg-app-surface-soft hover:text-app-text';
        
        switch(colorName) {
            case 'emerald': return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20 shadow-sm';
            case 'blue': return 'bg-blue-500/10 text-blue-500 border-blue-500/20 shadow-sm';
            case 'rose': return 'bg-rose-500/10 text-rose-500 border-rose-500/20 shadow-sm';
            case 'violet': return 'bg-violet-500/10 text-violet-500 border-violet-500/20 shadow-sm';
            case 'amber': return 'bg-amber-500/10 text-amber-500 border-amber-500/20 shadow-sm';
            default: return 'bg-primary/10 text-primary border-primary/20 shadow-sm';
        }
    };

    return (
        <div className="app-shell min-h-screen flex text-app-text font-sans font-normal bg-app-bg">
            <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:rounded-none bg-primary text-white focus:ring-2 focus:ring-offset-2 focus:ring-primary focus:outline-none">
                Skip to main content
            </a>

            {/* Mobile header */}
            <header className={`md:hidden fixed top-0 left-0 right-0 z-30 h-14 bg-app-surface/95 backdrop-blur-xl border-b border-app-border flex items-center justify-between px-4`}>
                <h1 className={`text-lg font-bold bg-gradient-to-r ${accentClass} bg-clip-text text-transparent truncate`}>
                    {activeConfig.name}
                </h1>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setIsNotificationOpen(true)}
                        className="p-2.5 rounded-none text-app-text-muted hover:text-app-text hover:bg-app-surface-soft min-h-[44px] min-w-[44px] flex items-center justify-center transition-colors relative"
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
                        className="p-2.5 rounded-none text-app-text-muted hover:text-app-text hover:bg-app-surface-soft min-h-[44px] min-w-[44px] flex items-center justify-center transition-colors"
                        aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
                    >
                        {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
                    </button>
                </div>
            </header>

            {/* Mobile drawer */}
            <div className={`md:hidden fixed inset-0 z-20 transition-opacity duration-200 ${mobileMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)} aria-hidden="true" />
                <aside className={`absolute top-14 left-0 right-0 bottom-0 bg-app-surface/98 backdrop-blur-xl border-r border-app-border transform transition-transform duration-200 ease-out ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                    <nav className="p-4 space-y-1 overflow-y-auto pt-6">
                        {navItems.map((item) => {
                            const Icon = item.IconComponent;
                            const isActive = item.exactMatch
                                ? (router.asPath === item.href || router.asPath === item.href + '/')
                                : (router.asPath === item.href || (item.href !== '/' && router.asPath.startsWith(item.href)));
                            return (
                                <Link
                                    key={item.label}
                                    href={item.href}
                                    onClick={() => setMobileMenuOpen(false)}
                                    className={`flex items-center gap-3 px-4 py-3 rounded-none min-h-[44px] transition-all ${getActiveStyles(isActive)}`}
                                >
                                    <Icon size={20} />
                                    <span className="font-medium">{item.label}</span>
                                </Link>
                            );
                        })}
                        <div className="mt-6 pt-4 border-t border-app-border">
                            <button
                                onClick={() => { logout(); window.location.href = '/login'; }}
                                className="w-full flex items-center gap-3 px-4 py-3 rounded-none min-h-[44px] bg-rose-500/10 border border-rose-500/20 text-rose-500 hover:bg-rose-500/20 font-medium"
                            >
                                Log Out
                            </button>
                        </div>
                    </nav>
                </aside>
            </div>

            {/* Desktop sidebar */}
            <aside className="fixed h-full z-20 hidden md:block group w-24 hover:w-72 transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]">
                <div className={`h-full m-4 rounded-[2.5rem] glass-panel bg-app-surface/80 group-hover:bg-app-surface/95 flex flex-col shadow-[0_0_50px_-12px_rgba(0,0,0,0.15)] relative overflow-hidden transition-all duration-500`}>

                    {/* Background Glows shifted to use theme color */}
                    <div className={`absolute -top-24 -left-24 w-48 h-48 opacity-20 blur-[80px] rounded-full pointer-events-none bg-${colorName}-500/20`}></div>
                    <div className={`absolute -bottom-24 -right-24 w-48 h-48 opacity-10 blur-[80px] rounded-full pointer-events-none bg-${colorName}-500/10`}></div>

                    <div className="absolute inset-0 flex flex-col items-center pt-10 opacity-100 group-hover:opacity-0 transition-all duration-300 pointer-events-none z-10 scale-100 group-hover:scale-90">
                        <div className={`w-12 h-12 rounded-none bg-gradient-to-r ${accentClass} opacity-90 flex items-center justify-center mb-6 animate-float shadow-lg`}>
                            <PortalIcon size={22} className="text-white" />
                        </div>
                        <div className="flex flex-col gap-5 mt-4 flex-1">
                            {navItems.map((item) => {
                                const Icon = item.IconComponent;
                                const isActive = item.exactMatch
                                    ? (router.asPath === item.href || router.asPath === item.href + '/')
                                    : (router.asPath === item.href || (item.href !== '/' && router.asPath.startsWith(item.href)));
                                return (
                                    <div key={item.label} className={`p-2.5 rounded-none ${isActive ? `text-${colorName}-500 bg-${colorName}-500/10` : 'text-app-text-muted'}`}>
                                        <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
                                    </div>
                                );
                            })}
                        </div>

                        {/* Collapsed Bell */}
                        <div className="pb-8 mt-auto flex flex-col items-center">
                            <button 
                                onClick={() => setIsNotificationOpen(true)}
                                className={`p-2.5 rounded-none transition-all relative pointer-events-auto hover:bg-${colorName}-500/10 hover:text-${colorName}-500 text-app-text-muted`}
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
                            <h1 className="text-2xl font-bold bg-gradient-to-r from-app-text via-app-text-muted to-app-text/60 bg-clip-text text-transparent">{activeConfig.name}</h1>
                            <p className="text-xs text-app-text-muted mt-2 font-medium tracking-wide uppercase opacity-70">
                                {activeConfig.subtitle}
                            </p>
                        </div>
                        <nav className="p-5 space-y-1.5 flex-1 overflow-y-auto custom-scrollbar">
                            {navItems.map((item) => {
                                const Icon = item.IconComponent;
                                const isActive = item.exactMatch
                                    ? (router.asPath === item.href || router.asPath === item.href + '/')
                                    : (router.asPath === item.href || (item.href !== '/' && router.asPath.startsWith(item.href)));
                                return (
                                    <Link
                                        key={item.label}
                                        href={item.href}
                                        className={`flex items-center gap-3 px-4 py-3.5 rounded-none transition-all duration-300 whitespace-nowrap group/nav ${isActive
                                            ? `bg-${colorName}-500/10 text-${colorName}-600 border-${colorName}-500/30 border shadow-lg`
                                            : 'text-app-text-muted hover:bg-app-surface-soft hover:text-app-text hover:pl-6'}`}
                                    >
                                        <div className={`p-1.5 rounded-none transition-colors ${isActive ? `bg-${colorName}-500/20` : 'group-hover/nav:bg-app-surface'}`}>
                                            <Icon size={20} className={isActive ? `text-${colorName}-600` : 'text-app-text-muted group-hover/nav:text-app-text'} />
                                        </div>
                                        <span className={`font-medium tracking-tight ${isActive ? `text-${colorName}-700` : 'text-app-text-muted group-hover/nav:text-app-text'}`}>{item.label}</span>
                                    </Link>
                                );
                            })}
                        </nav>
                        <div className="p-4 mt-auto">
                            <div className="p-4 rounded-none bg-app-surface-soft border border-app-border backdrop-blur-md">
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-full bg-${colorName}-500 flex items-center justify-center border-2 border-${colorName}-500/20 shrink-0 shadow-lg`}>
                                        <User size={20} className="text-white" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-bold text-app-text truncate">{user?.name || 'User'}</p>
                                        <p className="text-[10px] font-bold text-app-text-muted uppercase tracking-widest truncate">{currentRole?.label}</p>
                                    </div>
                                    <button 
                                        onClick={() => setIsNotificationOpen(true)}
                                        className={`p-2 rounded-none text-app-text-muted hover:text-${colorName}-500 hover:bg-${colorName}-500/10 transition-all relative`}
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
                                    className="mt-4 w-full py-2.5 rounded-none bg-app-surface border border-app-border hover:bg-danger/10 text-app-text-muted hover:text-danger text-[11px] font-bold uppercase tracking-wider transition-all"
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

            {/* Role-Based Experience Cinematic */}
            {!preferences?.hasSeenExperience && !isRoleLoading && user && (
                <ExperienceCinematic 
                    user={user} 
                    theme={theme} 
                    onComplete={() => setHasSeenExperience(true)} 
                />
            )}

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
