/**
 * Simple toast component - Tailwind only.
 * Use via ToastContext: toast.error('Message'), toast.success('Message'), etc.
 */
import React, { createContext, useContext, useState, useCallback } from 'react';
import { X, CheckCircle, AlertCircle, AlertTriangle } from 'lucide-react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
    const [toasts, setToasts] = useState([]);

    const addToast = useCallback((variant, message, options = {}) => {
        const id = Date.now();
        setToasts((prev) => [...prev, { id, variant, message, ...options }]);
        if (options.duration !== 0) {
            setTimeout(() => {
                setToasts((prev) => prev.filter((t) => t.id !== id));
            }, options.duration ?? 4000);
        }
        return id;
    }, []);

    const removeToast = useCallback((id) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }, []);

    const toast = {
        success: (msg, opts) => addToast('success', msg, opts),
        error: (msg, opts) => addToast('error', msg, opts),
        warning: (msg, opts) => addToast('warning', msg, opts),
        info: (msg, opts) => addToast('info', msg, opts),
    };

    return (
        <ToastContext.Provider value={toast}>
            {children}
            <div className="fixed top-24 right-6 z-[100] flex flex-col gap-3 pointer-events-none">
                {toasts.map((t) => (
                    <ToastItem key={t.id} {...t} onDismiss={() => removeToast(t.id)} />
                ))}
            </div>
        </ToastContext.Provider>
    );
}

function ToastItem({ variant, message, onDismiss }) {
    const styles = {
        success: 'bg-app-secondary/10 border-app-secondary/20 text-app-secondary',
        error: 'bg-app-rose/10 border-app-rose/20 text-app-rose',
        warning: 'bg-app-gold/10 border-app-gold/20 text-app-gold',
        info: 'bg-app-primary/10 border-app-primary/20 text-app-primary',
    };
    const icons = {
        success: CheckCircle,
        error: AlertCircle,
        warning: AlertTriangle,
        info: AlertCircle,
    };
    const Icon = icons[variant] ?? AlertCircle;
    const style = styles[variant] ?? styles.info;

    return (
        <div
            className={`flex items-center gap-4 px-6 py-4 rounded-none border backdrop-blur-md shadow-2xl animate-in slide-in-from-right fade-in duration-300 pointer-events-auto relative group overflow-hidden ${style}`}
        >
            <div className="absolute top-0 left-0 w-1 h-full bg-current opacity-20" />
            <Icon size={18} className="shrink-0" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] flex-1 leading-tight">{message}</span>
            <button
                type="button"
                onClick={onDismiss}
                className="p-1 rounded-none hover:bg-white/10 transition-colors opacity-40 hover:opacity-100"
                aria-label="Dismiss"
            >
                <X size={14} />
            </button>
        </div>
    );
}

export function useToast() {
    const ctx = useContext(ToastContext);
    if (!ctx) return { success: () => {}, error: (m) => alert(m), warning: () => {}, info: () => {} };
    return ctx;
}
