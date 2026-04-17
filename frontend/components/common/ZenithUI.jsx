import React from 'react';
import { LucideIcon } from 'lucide-react';

/**
 * ZenithCard - A premium glassmorphism container for dashboard metrics and data.
 */
export const ZenithCard = ({ children, className = '', title, icon: Icon, rightElement }) => (
    <div className={`glass-zenith glass-zenith-hover p-6 ${className}`}>
        {(title || Icon) && (
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    {Icon && (
                        <div className="p-2 rounded-none bg-primary/10 text-primary border border-primary/20">
                            <Icon size={18} />
                        </div>
                    )}
                    {title && <h3 className="text-sm font-bold uppercase tracking-widest bg-gradient-to-r from-app-text to-app-text-muted bg-clip-text text-transparent">{title}</h3>}
                </div>
                {rightElement}
            </div>
        )}
        {children}
    </div>
);

/**
 * ZenithButton - A kinetic, high-fidelity action button.
 */
export const ZenithButton = ({ 
    children, 
    onClick, 
    variant = 'primary', 
    icon: Icon, 
    disabled = false, 
    className = '',
    type = 'button'
}) => {
    const variants = {
        primary: 'btn-zenith',
        outline: 'btn-zenith-outline btn-zenith',
        danger: 'bg-rose-500/10 text-rose-500 border border-rose-500/20 hover:bg-rose-500 hover:text-white'
    };

    return (
        <button
            type={type}
            onClick={onClick}
            disabled={disabled}
            className={`btn-zenith ${variants[variant] || variants.primary} ${className}`}
        >
            {Icon && <Icon size={16} />}
            {children}
        </button>
    );
};

/**
 * ZenithBadge - A specialized organizational badge for the 16-department system.
 */
export const ZenithBadge = ({ children, active = false, className = '' }) => (
    <span className={`badge-prism ${active ? 'badge-prism-active' : ''} ${className}`}>
        {children}
    </span>
);

/**
 * ZenithSection - A layout section with premium typography and spacing.
 */
export const ZenithSection = ({ title, subtitle, children, className = '' }) => (
    <section className={`space-y-6 ${className}`}>
        {(title || subtitle) && (
            <div className="space-y-1">
                {title && <h2 className="text-3xl font-black uppercase tracking-tighter">{title}</h2>}
                {subtitle && <p className="text-sm text-app-text-muted font-medium italic opacity-70">{subtitle}</p>}
            </div>
        )}
        {children}
    </section>
);
