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
            <div className="h-full m-4 rounded-[2.5rem] glass shadow-[0_0_50px_-12px_rgba(0,0,0,0.15)] relative overflow-hidden transition-all duration-500 flex flex-col">
                
                {/* Background Ambient Glows */}
                <div className="absolute -top-24 -left-24 w-48 h-48 bg-primary/20 blur-[80px] rounded-full pointer-events-none" />
                <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-indigo-500/10 blur-[80px] rounded-full pointer-events-none" />

                {/* Collapsed State: Static Icons */}
                <div className="absolute inset-0 flex flex-col items-center pt-10 group-hover:opacity-0 transition-opacity duration-300 pointer-events-none z-10">
                    <div className="w-12 h-12 flex items-center justify-center mb-6 animate-float">
                        <img src="/assets/itsm-logo.png" alt="Logo" className="w-8 h-8 object-contain filter drop-shadow-[0_0_8px_rgba(99,102,241,0.5)]" />
                    </div>
                    <div className="flex flex-col gap-6 mt-4 items-center">
                        {navItems.map((item) => {
                            const Icon = item.icon;
                            const isActive = router.asPath === item.href || (item.href !== '/' && router.asPath.startsWith(item.href));
                            return (
                                <div key={item.href} className={`p-2 rounded-xl transition-all ${isActive ? 'text-primary bg-primary/10 shadow-[0_0_15px_rgba(99,102,241,0.2)]' : 'text-app-text-muted opacity-60'}`}>
                                    <Icon size={20} />
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Expanded State: Full Navigation */}
                <div className="flex flex-col h-full opacity-0 group-hover:opacity-100 transition-opacity duration-500 delay-100 min-w-0 pointer-events-none group-hover:pointer-events-auto">
                    <div className="p-8 border-b border-app-border/40 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                            <img src="/assets/itsm-logo.png" alt="Logo" className="w-8 h-8 shrink-0" />
                            <h1 className="text-xl font-bold bg-gradient-to-r from-app-text via-primary to-indigo-500 bg-clip-text text-transparent truncate uppercase tracking-tighter">
                                {currentRole?.label || 'Asset Manager'}
                            </h1>
                        </div>
                    </div>

                    <nav className="p-5 space-y-1 flex-1 overflow-y-auto custom-scrollbar">
                        {navItems.map((item) => {
                            const Icon = item.icon;
                            const isActive = router.asPath === item.href || (item.href !== '/' && router.asPath.startsWith(item.href));
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={`flex items-center space-x-3 px-4 py-3 rounded-2xl transition-all duration-300 whitespace-nowrap group/nav ${
                                        isActive 
                                        ? 'bg-primary/15 text-primary border border-primary/20 shadow-[0_10px_20px_-10px_rgba(99,102,241,0.2)]' 
                                        : 'text-app-text-muted hover:bg-app-surface-soft hover:text-app-text hover:translate-x-1'
                                    }`}
                                >
                                    <Icon size={18} className={isActive ? 'text-primary' : 'text-app-text-muted group-hover/nav:text-app-text'} />
                                    <span className="font-semibold text-xs tracking-tight uppercase">{item.label}</span>
                                </Link>
                            );
                        })}
                    </nav>

                    {/* User Profile Section */}
                    <div className="p-4 mt-auto">
                        <div className="p-4 rounded-3xl bg-white/5 border border-white/5 backdrop-blur-md">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-indigo-500 flex items-center justify-center border-2 border-white/10 shrink-0 shadow-lg animate-pulse-slow">
                                    <User size={18} className="text-white" />
                                </div>
                                <div className="text-xs min-w-0 flex-1">
                                    <p className="font-bold text-app-text truncate">{user?.name || 'Authorized'}</p>
                                    <div className="flex items-center gap-1.5 mt-0.5 opacity-60">
                                        <div className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                                        <span className="text-[10px] uppercase font-black tracking-widest truncate">{currentRole?.slug}</span>
                                    </div>
                                </div>
                                <button 
                                    onClick={onOpenNotifications}
                                    className="p-2 rounded-xl text-app-text-muted hover:text-primary hover:bg-primary/10 transition-all relative"
                                >
                                    <Bell size={18} />
                                    {unreadCount > 0 && <span className="absolute top-1 right-1 w-3 h-3 bg-rose-500 rounded-full border-2 border-app-surface" />}
                                </button>
                            </div>
                            <button
                                onClick={onLogout}
                                className="mt-4 w-full py-2.5 rounded-xl bg-slate-500/10 border border-white/5 hover:bg-rose-500/10 text-app-text-muted hover:text-rose-500 text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 group/logout"
                            >
                                <X size={12} className="group-hover:rotate-90 transition-transform" />
                                Disconnect
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </aside>
    );
};

export default memo(Sidebar);
