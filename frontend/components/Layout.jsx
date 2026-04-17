import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { Bot } from 'lucide-react';

// Hooks
import { useRole } from '../contexts/RoleContext';
import { useNotifications } from '../contexts/NotificationContext';
import { useNavigation } from '../hooks/useNavigation';

// Components
import Sidebar from './layout/Sidebar';
import MobileHeader from './layout/MobileHeader';
import CommandBar from './layout/CommandBar';
import AIAssistantSidebar from './AIAssistantSidebar';
import NotificationToast from './NotificationToast';
import NotificationDrawer from './NotificationDrawer';

/**
 * Global Layout - Architect Overhaul.
 * Optimized for performance, modularity, and premium UX.
 */
export default function Layout({ children }) {
    const router = useRouter();
    const { currentRole, logout, user, preferences } = useRole();
    const { unreadCount, isConnected } = useNotifications();
    const { navItems } = useNavigation();

    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [isAIOpen, setIsAIOpen] = useState(false);
    const [isNotificationOpen, setIsNotificationOpen] = useState(false);




    const handleLogout = () => {
        logout();
        router.push('/login');
    };

    return (
        <div className="app-shell h-screen flex flex-col md:flex-row text-app-text font-inter font-normal bg-app-bg overflow-hidden transition-colors duration-700">
            {/* Accessibility: Skip Link */}
            <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:p-4 focus:bg-primary focus:text-white">
                Skip to main content
            </a>

            {/* Global Utilities */}
            <CommandBar />
            <NotificationToast />

            {/* Premium Modular Sidebar (Desktop) */}
            <Sidebar 
                navItems={navItems}
                user={user}
                currentRole={currentRole}
                unreadCount={unreadCount}
                isConnected={isConnected}
                onOpenNotifications={() => setIsNotificationOpen(true)}
                onLogout={handleLogout}
            />

            {/* Modular Mobile Header */}
            <MobileHeader 
                unreadCount={unreadCount}
                isOpen={mobileMenuOpen}
                onOpenMenu={() => setMobileMenuOpen(!mobileMenuOpen)}
                onOpenNotifications={() => setIsNotificationOpen(true)}
            />

            {/* Main Content Area */}
            <main 
                id="main-content" 
                className="flex-1 min-h-0 md:ml-24 pt-20 md:pt-0 p-6 md:p-10 transition-all duration-500 overflow-y-auto custom-scrollbar relative"
            >
                {/* Visual Polish: Ambient Retail Pulse Grid */}
                <div className="absolute inset-0 pointer-events-none opacity-[0.03] dark:opacity-[0.05]" 
                    style={{ 
                        backgroundImage: 'radial-gradient(var(--primary) 0.5px, transparent 0.5px)', 
                        backgroundSize: '32px 32px' 
                    }} 
                />
                

                {/* Page Content with Entry Animation */}
                <div className="animate-in fade-in zoom-in-95 duration-700 relative z-10">
                    {children}
                </div>

                {/* Unified Zenith Footer */}
                <footer className="mt-24 pt-12 border-t border-app-border/40 flex flex-col md:flex-row items-center justify-between gap-6 pb-12">
                    <div className="flex flex-col items-center md:items-start gap-2">
                        <span className="text-[10px] font-black uppercase tracking-[0.4em] text-app-text-muted opacity-40">Retail Pulse Zenith System</span>
                        <div className="flex items-center gap-3">
                            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]' : 'bg-amber-500 shadow-[0_0_8px_#f59e0b]'} animate-pulse`} />
                            <span className="text-[9px] font-bold uppercase tracking-widest text-app-text-muted">Node Status: Operational</span>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-8 text-[10px] font-black uppercase tracking-widest text-app-text-muted/60">
                        <span className="hover:text-primary transition-colors cursor-help">SLA Architecture</span>
                        <span className="hover:text-primary transition-colors cursor-help">Global Inventory</span>
                        <span>© 2026 Zenith Ecosystem</span>
                    </div>
                </footer>
            </main>

            {/* Side Drawers */}
            <AIAssistantSidebar isOpen={isAIOpen} onClose={() => setIsAIOpen(false)} />
            <NotificationDrawer isOpen={isNotificationOpen} onClose={() => setIsNotificationOpen(false)} />

            {/* AI Assistant Floating Trigger */}
            <button
                onClick={() => setIsAIOpen(true)}
                className="fixed bottom-10 right-10 z-[60] p-5 glass-zenith shadow-2xl shadow-primary/20 hover:shadow-primary/40 hover:-translate-y-2 transition-all group scale-100 active:scale-95 border-primary/30"
                title="Open AI Assistant"
            >
                <div className="absolute inset-0 bg-primary/10 animate-pulse opacity-0 group-hover:opacity-100 transition-opacity" />
                <Bot size={28} className="relative z-10 text-primary group-hover:scale-110 transition-transform" />
            </button>

            <style jsx global>{`
                @keyframes scan {
                    from { transform: translateY(-100%); opacity: 0; }
                    50% { opacity: 1; }
                    to { transform: translateY(1000%); opacity: 0; }
                }
                .animate-scan {
                    animation: scan 8s linear infinite;
                }
            `}</style>
        </div>
    );
}
