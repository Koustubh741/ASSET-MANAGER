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
        <div className="app-shell h-screen flex flex-col sm:flex-row text-app-text font-inter font-normal bg-app-bg overflow-hidden">
            {/* Accessibility: Skip Link */}
            <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:p-4 focus:bg-primary focus:text-white">
                Skip to main content
            </a>

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
                className="flex-1 min-h-0 md:ml-32 pt-20 md:pt-0 p-6 md:p-10 transition-all duration-500 overflow-y-auto custom-scrollbar relative"
            >
                {/* Visual Polish: Ambient HUD Grid */}
                <div className="absolute inset-0 pointer-events-none opacity-[0.01] dark:opacity-[0.02]" 
                    style={{ backgroundImage: 'radial-gradient(var(--text-muted) 0.5px, transparent 0.5px)', backgroundSize: '48px 48px' }} 
                />
                

                {/* Page Content with Entry Animation */}
                <div className="animate-in fade-in zoom-in-95 duration-700 relative z-10">
                    {children}
                </div>

                {/* Unified Footer */}
                <footer className="mt-16 pt-8 border-t border-app-border/40 flex items-center justify-between text-[10px] font-black uppercase tracking-[0.3em] text-app-text-muted opacity-40">
                    <span>v2 Retail Lifecycle Platform</span>
                    <div className="flex items-center gap-4">
                        <span className="flex items-center gap-2">
                             <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/50" />
                             Gateway: Stable
                        </span>
                        <span>© 2026 Retail Pulse Ecosystem</span>
                    </div>
                </footer>
            </main>

            {/* Global Utility Overlays */}
            <button
                onClick={() => setIsAIOpen(true)}
                className="fixed bottom-8 right-8 z-40 p-4 rounded-none bg-gradient-to-br from-indigo-500 to-indigo-700 text-white shadow-2xl shadow-indigo-500/30 hover:shadow-indigo-500/50 hover:-translate-y-1 transition-all group scale-100 active:scale-95"
                title="Open AI Assistant"
            >
                <div className="absolute inset-0 bg-white/20 animate-pulse rounded-none opacity-0 group-hover:opacity-100 transition-opacity" />
                <Bot size={24} className="relative z-10" />
            </button>

            <AIAssistantSidebar isOpen={isAIOpen} onClose={() => setIsAIOpen(false)} />
            <NotificationToast />
            <NotificationDrawer isOpen={isNotificationOpen} onClose={() => setIsNotificationOpen(false)} />

            {/* Global Theme Overrides & HUD Animations */}
            <style jsx global>{`
                @keyframes swing {
                    0%, 100% { transform: rotate(0deg); }
                    20% { transform: rotate(15deg); }
                    40% { transform: rotate(-10deg); }
                    60% { transform: rotate(5deg); }
                    80% { transform: rotate(-5deg); }
                }
                .animate-swing {
                    animation: swing 3s ease-in-out infinite;
                    transform-origin: top center;
                }
                @keyframes borderPulse {
                    0%, 100% { opacity: 0.5; }
                    50% { opacity: 0.9; }
                }
                /* Digital Scanline Effect */
                .app-shell::after {
                    content: "";
                    position: fixed;
                    top: 0; left: 0; width: 100%; height: 100%;
                    background: linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.05) 50%), 
                                linear-gradient(90deg, rgba(255, 0, 0, 0.01), rgba(0, 255, 0, 0.005), rgba(0, 0, 255, 0.01));
                    background-size: 100% 2px, 3px 100%;
                    pointer-events: none;
                    z-index: 100;
                    opacity: 0.1;
                }
            `}</style>
        </div>
    );
}
