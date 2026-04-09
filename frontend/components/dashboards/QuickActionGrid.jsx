import { useRouter } from 'next/router';
import { User, Smartphone, Laptop, Ticket } from 'lucide-react';

export default function QuickActionGrid() {
    const router = useRouter();

    const handleQuickAction = (action) => {
        const routeMap = {
            'profile': '/dashboard/profile',
            'byod': '/dashboard/register-byod',
            'asset': '/dashboard/request-asset',
            'ticket': '/tickets'
        };
        if (routeMap[action]) {
            router.push(routeMap[action]);
        }
    };

    const actions = [
        { id: 'profile', icon: User, label: 'Manage Profile', color: 'indigo', action: () => handleQuickAction('profile') },
        { id: 'byod', icon: Smartphone, label: 'Register BYOD', color: 'sky', action: () => handleQuickAction('byod') },
        { id: 'asset', icon: Laptop, label: 'Request Asset', color: 'blue', action: () => handleQuickAction('asset') },
        { id: 'ticket', icon: Ticket, label: 'Get Support', color: 'rose', action: () => handleQuickAction('ticket') }
    ];

    return (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-5">
            {actions.map((item) => (
                <button
                    key={item.id}
                    onClick={item.action}
                    className="p-5 rounded-none bg-slate-100 dark:bg-white/[0.03] border border-app-border hover:border-slate-300 dark:hover:border-app-border-soft hover:bg-slate-200 dark:hover:bg-white/[0.06] transition-all group/btn flex flex-col items-center text-center gap-3 relative overflow-hidden active:scale-95 shadow-sm"
                >
                    <div className={`absolute inset-0 bg-gradient-to-br from-${item.color}-500/10 to-transparent opacity-0 group-hover/btn:opacity-100 transition-opacity`}></div>
                    <div className={`w-12 h-12 rounded-none bg-${item.color}-500/10 flex items-center justify-center border border-${item.color}-500/20 group-hover/btn:scale-110 transition-transform duration-500 relative z-10 shadow-lg shadow-${item.color}-500/5`}>
                        <item.icon size={22} className={`text-${item.color}-600 dark:text-${item.color}-400 group-hover/btn:text-${item.color}-500 dark:group-hover/btn:text-${item.color}-300`} />
                    </div>
                    <span className="text-[10px] font-black text-app-text-muted uppercase tracking-[0.2em] relative z-10 group-hover/btn:text-indigo-600 dark:group-hover/btn:text-app-text transition-colors">{item.label}</span>
                </button>
            ))}
        </div>
    );
}
