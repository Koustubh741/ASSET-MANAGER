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
        success: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
        error: 'bg-rose-500/10 border-rose-500/20 text-rose-400',
        warning: 'bg-amber-500/10 border-amber-500/20 text-amber-400',
        info: 'bg-blue-500/10 border-blue-500/20 text-blue-400',
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
            className={`flex items-center gap-3 px-4 py-3 rounded-xl border backdrop-blur-md shadow-xl animate-in slide-in-from-right fade-in duration-200 pointer-events-auto ${style}`}
        >
            <Icon size={20} />
            <span className="text-sm font-medium flex-1">{message}</span>
            <button
                type="button"
                onClick={onDismiss}
                className="p-1 rounded-lg hover:bg-slate-200 hover:text-slate-900 dark:hover:bg-app-surface transition-colors"
                aria-label="Dismiss"
            >
                <X size={16} />
            </button>
        </div>
    );
}

export function useToast() {
    const ctx = useContext(ToastContext);
    if (!ctx) return { success: () => {}, error: (m) => alert(m), warning: () => {}, info: () => {} };
    return ctx;
}
