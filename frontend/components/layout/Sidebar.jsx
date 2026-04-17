import React, { memo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { User, Bell, X } from 'lucide-react';

/**
 * Premium Sidebar Component.
 * Features glassmorphism, hover expansion, and role-aware navigation.
 */
const Sidebar = ({ 
    navItems, 
    user, 
    currentRole, 
    unreadCount, 
    isConnected, 
    onOpenNotifications, 
    onLogout 
}) => {
    const router = useRouter();

    return (
        <aside className="fixed h-full z-20 hidden md:block group w-24 hover:w-72 transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]">
            <div className="h-full m-4 glass-zenith shadow-[0_0_80px_-15px_rgba(0,0,0,0.3)] relative overflow-hidden transition-all duration-500 flex flex-col">
                
                {/* Background Ambient Glows */}
                <div className="absolute -top-24 -left-24 w-64 h-64 bg-primary/10 blur-[100px] rounded-full pointer-events-none" />
                <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-secondary/10 blur-[100px] rounded-full pointer-events-none" />

                {/* Collapsed State: Static Icons */}
                <div className="absolute inset-0 flex flex-col items-center pt-10 group-hover:opacity-0 transition-all duration-300 pointer-events-none z-10 scale-100 group-hover:scale-95">
                    <div className="w-12 h-12 flex items-center justify-center mb-10 animate-float">
                        <img src="/assets/itsm-logo.png" alt="Logo" className="w-9 h-9 object-contain filter drop-shadow-[0_0_12px_var(--primary-glow)]" />
                    </div>
                    <div className="flex flex-col gap-8 mt-4 items-center">
                        {navItems.map((item) => {
                            const Icon = item.icon;
                            const isActive = router.asPath === item.href || (item.href !== '/' && (router.asPath === item.href || router.asPath.startsWith(item.href + '/')));
                            return (
                                <div key={item.href} className={`p-3 rounded-none transition-all duration-500 ${isActive ? 'text-primary bg-primary/10 shadow-[0_0_20px_var(--primary-glow)]' : 'text-app-text-muted opacity-40'}`}>
                                    <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Expanded State: Full Navigation */}
                <div className="flex flex-col h-full opacity-0 group-hover:opacity-100 transition-all duration-500 delay-100 min-w-0 pointer-events-none group-hover:pointer-events-auto">
                    <div className="p-8 border-b border-app-border/40 whitespace-nowrap">
                        <div className="flex items-center gap-4">
                            <img src="/assets/itsm-logo.png" alt="Logo" className="w-10 h-10 shrink-0 filter drop-shadow-[0_0_10px_var(--primary-glow)]" />
                            <div className="min-w-0">
                                <h1 className="text-xl font-black bg-gradient-to-r from-app-text via-primary to-secondary bg-clip-text text-transparent truncate uppercase tracking-tighter">
                                    Retail Zenith
                                </h1>
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-app-text-muted opacity-60">
                                    {currentRole?.label || 'Ops Center'}
                                </p>
                            </div>
                        </div>
                    </div>

                    <nav className="p-5 mt-4 space-y-2 flex-1 overflow-y-auto custom-scrollbar">
                        {navItems.map((item) => {
                            const Icon = item.icon;
                            const isActive = router.asPath === item.href || (item.href !== '/' && (router.asPath === item.href || router.asPath.startsWith(item.href + '/')));
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={`flex items-center space-x-4 px-5 py-4 rounded-none transition-all duration-500 whitespace-nowrap group/nav ${
                                        isActive 
                                        ? 'bg-primary/10 text-primary border-l-4 border-primary shadow-[10px_0_30px_-10px_var(--primary-glow)] translate-x-1' 
                                        : 'text-app-text-muted hover:bg-app-surface-soft hover:text-app-text hover:translate-x-2'
                                    }`}
                                >
                                    <Icon size={20} className={`transition-transform duration-500 ${isActive ? 'scale-110' : 'group-hover/nav:scale-110'}`} />
                                    <span className="font-black text-[11px] tracking-widest uppercase">{item.label}</span>
                                </Link>
                            );
                        })}
                    </nav>

                    {/* User Profile Section — Zenith Refined */}
                    <div className="p-6 mt-auto">
                        <div className="rounded-none bg-app-surface-soft/30 border border-app-border/40 backdrop-blur-xl overflow-hidden shadow-2xl">
                            <Link
                                href="/dashboard/profile"
                                className="flex items-center gap-4 p-5 hover:bg-primary/5 transition-all duration-500 group/profile border-b border-app-border/40"
                                title="View Profile"
                            >
                                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center border-2 border-white/10 shrink-0 shadow-2xl group-hover/profile:scale-105 transition-all duration-500">
                                    <span className="text-xs font-black text-white">
                                        {(user?.full_name || user?.name || 'U').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                                    </span>
                                </div>
                                <div className="text-xs min-w-0 flex-1">
                                    <p className="font-black text-app-text truncate text-sm">{user?.full_name || user?.name || 'Authorized'}</p>
                                    <div className="flex items-center gap-2 mt-1">
                                        <div className={`w-2 h-2 rounded-full animate-pulse ${isConnected ? 'bg-emerald-500 shadow-[0_0_10px_#10b981]' : 'bg-amber-500 shadow-[0_0_10px_#f59e0b]'}`} />
                                        <span className="text-[9px] uppercase font-black tracking-widest truncate opacity-60">{currentRole?.slug}</span>
                                    </div>
                                </div>
                                <User size={14} className="text-primary opacity-0 group-hover/profile:opacity-100 transition-all duration-500 translate-x-2 group-hover:translate-x-0" />
                            </Link>
                            <div className="flex items-center p-3 gap-2">
                                <button
                                    onClick={onOpenNotifications}
                                    className="flex-1 py-3 rounded-none text-app-text-muted hover:text-primary hover:bg-primary/10 transition-all relative flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest"
                                >
                                    <Bell size={16} className={unreadCount > 0 ? "animate-swing" : ""} />
                                    {unreadCount > 0 && (
                                        <span className="absolute top-2 right-2 w-4 h-4 bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center rounded-full border-2 border-app-surface shadow-lg animate-pulse">
                                            {unreadCount}
                                        </span>
                                    )}
                                </button>
                                <button
                                    onClick={onLogout}
                                    className="flex-1 py-3 rounded-none bg-rose-500/5 hover:bg-rose-500/15 text-rose-500 hover:text-rose-600 text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 group/logout border border-rose-500/10"
                                >
                                    <X size={14} className="group-hover/logout:rotate-90 transition-transform duration-500" />
                                    Exit
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </aside>
    );
};

export default memo(Sidebar);
