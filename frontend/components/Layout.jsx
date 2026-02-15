import Link from 'next/link'
import { useRouter } from 'next/router'
import { useState } from 'react'
import { LayoutDashboard, Server, Settings, User, RotateCcw, ShoppingBag, Trash2, Sparkles, Monitor, MapPin, ChevronUp, Check, Cpu, Network, DollarSign } from 'lucide-react'
import { useRole } from '@/contexts/RoleContext'

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

    const ROLE_DASHBOARD_MAP = {
        'System Admin': '/dashboard/system-admin',
        'Asset Manager': '/dashboard/asset-inventory-manager',
        'Asset & Inventory Manager': '/dashboard/asset-inventory-manager',
        'Inventory Manager': '/dashboard/asset-inventory-manager',
        'Procurement Manager': '/dashboard/procurement-finance',
        'Procurement & Finance': '/dashboard/procurement-finance', // Handle both label variations if needed
        'IT Support': '/dashboard/it-management',
        'IT Management': '/dashboard/it-management',
        'Audit Officer': '/dashboard/audit',
        'Finance': '/dashboard/finance',
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
        { label: 'Renewals', href: '/renewals', icon: RotateCcw },
        { label: 'Procurement', href: '/procurement', icon: ShoppingBag },
        { label: 'Disposal', href: '/disposal', icon: Trash2 },
        { label: 'Pricing', href: '/pricing', icon: DollarSign },
        { label: 'Settings', href: '/settings', icon: Settings },
    ]

    const fullAccessRoles = ['System Admin', 'Asset & Inventory Manager', 'Asset Manager', 'Inventory Manager'];
    const navItems = fullAccessRoles.includes(currentRole.label)
        ? allNavItems
        : allNavItems.filter(item => ['Dashboard', 'Enterprise', 'Pricing'].includes(item.label)); // Allow Enterprise and Pricing portal for others too

    return (
        <div className="min-h-screen flex text-slate-100 font-sans">
            {/* Sidebar - Glassmorphism */}
            <aside className="fixed h-full z-20 hidden md:block group w-24 hover:w-72 transition-all duration-300 ease-in-out">
                <div className="h-full m-4 rounded-2xl bg-slate-900/40 backdrop-blur-xl border border-white/10 flex flex-col shadow-2xl relative overflow-hidden transition-all duration-300 group-hover:bg-slate-900/60">

                    {/* Collapsed State Logo (Visible only when NOT hovered) */}
                    <div className="absolute inset-0 flex flex-col items-center pt-8 opacity-100 group-hover:opacity-0 transition-opacity duration-300 pointer-events-none">
                        <div className="w-14 h-14 flex items-center justify-center mb-4">
                            <img src="/assets/itsm-logo.png" alt="ITSM Logo" className="w-full h-full object-contain drop-shadow-lg" />
                        </div>
                        <div className="flex flex-col gap-4 mt-4">
                            {navItems.map((item) => {
                                const Icon = item.icon
                                // Use asPath for accurate active state on dynamic routes
                                const isActive = router.asPath === item.href || (item.href !== '/' && router.asPath.startsWith(item.href))
                                return (
                                    <div key={item.href} className={`p-2 rounded-lg ${isActive ? 'text-blue-400 bg-blue-500/10' : 'text-slate-500'}`}>
                                        <Icon size={20} />
                                    </div>
                                )
                            })}
                        </div>
                    </div>

                    {/* Expanded Content (Visible only on hover) */}
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-75 flex flex-col h-full min-w-[16rem]">
                        <div className="p-8 border-b border-white/5 whitespace-nowrap">
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
                                        className={`flex items-center space-x-3 px-4 py-3.5 rounded-xl transition-all duration-300 whitespace-nowrap ${isActive
                                            ? 'bg-blue-600/20 text-blue-300 border border-blue-500/30 shadow-lg shadow-blue-500/10'
                                            : 'text-slate-400 hover:bg-white/5 hover:text-slate-200 hover:pl-5'
                                            }`}
                                    >
                                        <Icon size={20} className={isActive ? 'text-blue-400' : 'text-slate-500 transition-colors'} />
                                        <span className="font-medium">{item.label}</span>
                                    </Link>
                                )
                            })}
                        </nav>

                        <div className="relative whitespace-nowrap">
                            <div className="p-4 m-4 rounded-xl bg-gradient-to-br from-white/5 to-transparent border border-white/5">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-3">
                                        <div className="w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center border border-indigo-500/30 shrink-0">
                                            <User size={20} className="text-indigo-300" />
                                        </div>
                                        <div className="text-sm overflow-hidden">
                                            <p className="text-white font-semibold truncate">
                                                {user?.name || 'User'}
                                            </p>
                                            <p className="text-indigo-300/60 text-xs truncate">
                                                {currentRole.label} • {user?.department || "General"}
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
                                    className="w-full py-2 rounded-lg border border-rose-500/20 text-rose-400 text-xs font-medium hover:bg-rose-500/10 hover:text-rose-300 transition-colors flex items-center justify-center gap-2"
                                >
                                    Log Out
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 md:ml-28 p-6 md:p-8 animate-in fade-in duration-700 overflow-auto">
                {/* System Update Banner (Mock) - Controlled by Settings */}
                {(() => {
                    if (typeof window !== 'undefined') {
                        const saved = localStorage.getItem('appSettings');
                        if (saved) {
                            try {
                                const { notifications } = JSON.parse(saved);
                                if (notifications?.system) {
                                    return (
                                        <div className="mb-6 p-4 rounded-xl bg-gradient-to-r from-blue-600/20 to-purple-600/20 border border-blue-500/30 flex items-center justify-between animate-in slide-in-from-top-4 fade-in duration-500">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 rounded-full bg-blue-500/20 text-blue-400">
                                                    <Sparkles size={18} />
                                                </div>
                                                <div>
                                                    <h4 className="text-sm font-bold text-white">System Update Available</h4>
                                                    <p className="text-xs text-slate-300">Version 2.5 is scheduled for deployment on Saturday 10:00 PM EST.</p>
                                                </div>
                                            </div>
                                            <button className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/20">
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
            </main>
        </div>
    )
}

