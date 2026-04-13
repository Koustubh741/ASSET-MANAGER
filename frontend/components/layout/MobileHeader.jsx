import React, { memo } from 'react';
import { Bell, Menu, X } from 'lucide-react';

/**
 * Premium Mobile Header Component.
 * Optimized for mobile-first accessibility and visual consistency.
 */
const MobileHeader = ({ unreadCount, onOpenMenu, isOpen, onOpenNotifications }) => {
    return (
        <header className="md:hidden fixed top-0 left-0 right-0 z-30 h-14 bg-app-surface/90 backdrop-blur-xl border-b border-app-border flex items-center justify-between px-4">
            <h1 className="text-lg font-['Outfit'] font-black bg-gradient-to-r from-primary to-amber-700 bg-clip-text text-transparent truncate uppercase tracking-tighter">
                Retail Pulse
            </h1>
            <div className="flex items-center gap-2">
                <button
                    onClick={onOpenNotifications}
                    className="p-2.5 rounded-none text-app-text-muted hover:text-primary transition-colors relative min-h-[44px] min-w-[44px] flex items-center justify-center"
                    aria-label="Notifications"
                >
                    <Bell size={20} className={unreadCount > 0 ? "animate-swing" : ""} />
                    {unreadCount > 0 && (
                        <span className="absolute top-2 right-2 w-3.5 h-3.5 bg-rose-500 text-white text-[8px] font-black flex items-center justify-center rounded-full border-2 border-app-surface">
                            {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                    )}
                </button>
                <button
                    onClick={onOpenMenu}
                    className="p-2.5 rounded-none text-app-text-muted hover:text-primary transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                    aria-label={isOpen ? 'Close menu' : 'Open menu'}
                >
                    {isOpen ? <X size={20} /> : <Menu size={20} />}
                </button>
            </div>
        </header>
    );
};

export default memo(MobileHeader);
