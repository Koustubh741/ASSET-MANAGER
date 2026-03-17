import { useRole } from '@/contexts/RoleContext';
import { Settings as SettingsIcon, Shield, Bell, Users, User, MapPin, Building2, Briefcase, Calendar, Mail } from 'lucide-react';

/**
 * Procurement Settings – scoped to Procurement hub.
 * Shows manager/account information and hub preferences.
 */
export default function ProcurementSettingsPage() {
    const { user, currentRole } = useRole();

    const memberSince = user?.createdAt
        ? new Date(user.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
        : '—';

    return (
        <div className="space-y-6">
            <header>
                <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <SettingsIcon className="text-blue-400" size={28} />
                    Procurement Settings
                </h1>
                <p className="text-slate-500 dark:text-slate-400 dark:text-slate-400 mt-1">
                    Preferences and account information for the Procurement hub.
                </p>
            </header>

            {/* Manager / account information */}
            <section className="glass-card p-6">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
                    <User className="text-blue-400" size={22} />
                    Manager / account information
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10">
                        <User size={18} className="text-slate-500 dark:text-slate-400 mt-0.5 shrink-0" />
                        <div>
                            <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Name</p>
                            <p className="text-sm font-medium text-slate-900 dark:text-white">{user?.name ?? '—'}</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10">
                        <Mail size={18} className="text-slate-500 dark:text-slate-400 mt-0.5 shrink-0" />
                        <div>
                            <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Email</p>
                            <p className="text-sm font-medium text-slate-900 dark:text-white">{user?.email ?? '—'}</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10">
                        <Briefcase size={18} className="text-slate-500 dark:text-slate-400 mt-0.5 shrink-0" />
                        <div>
                            <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Role</p>
                            <p className="text-sm font-medium text-slate-900 dark:text-white">{currentRole?.label ?? '—'}</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10">
                        <Briefcase size={18} className="text-slate-500 dark:text-slate-400 mt-0.5 shrink-0" />
                        <div>
                            <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Position</p>
                            <p className="text-sm font-medium text-slate-900 dark:text-white">{user?.position ?? '—'}</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10">
                        <Building2 size={18} className="text-slate-500 dark:text-slate-400 mt-0.5 shrink-0" />
                        <div>
                            <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Department</p>
                            <p className="text-sm font-medium text-slate-900 dark:text-white">{user?.department ?? '—'}</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10">
                        <Building2 size={18} className="text-slate-500 dark:text-slate-400 mt-0.5 shrink-0" />
                        <div>
                            <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Domain / team</p>
                            <p className="text-sm font-medium text-slate-900 dark:text-white">{user?.domain || user?.department || '—'}</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10">
                        <MapPin size={18} className="text-slate-500 dark:text-slate-400 mt-0.5 shrink-0" />
                        <div>
                            <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Location</p>
                            <p className="text-sm font-medium text-slate-900 dark:text-white">{user?.location ?? '—'}</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10">
                        <Building2 size={18} className="text-slate-500 dark:text-slate-400 mt-0.5 shrink-0" />
                        <div>
                            <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Company</p>
                            <p className="text-sm font-medium text-slate-900 dark:text-white">{user?.company ?? '—'}</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10">
                        <Calendar size={18} className="text-slate-500 dark:text-slate-400 mt-0.5 shrink-0" />
                        <div>
                            <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Member since</p>
                            <p className="text-sm font-medium text-slate-900 dark:text-white">{memberSince}</p>
                        </div>
                    </div>
                </div>
            </section>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <section className="glass-card p-5">
                    <div className="flex items-center gap-3 mb-3">
                        <Bell className="text-amber-400" size={20} />
                        <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                            Notifications
                        </h2>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-400">
                        Control which Procurement events send alerts (e.g. PO uploaded, Finance approved, delivery confirmed).
                    </p>
                    <p className="mt-3 text-[11px] text-slate-500 dark:text-slate-400 italic">
                        Coming soon – managed centrally by System Admin.
                    </p>
                </section>

                <section className="glass-card p-5">
                    <div className="flex items-center gap-3 mb-3">
                        <Users className="text-emerald-400" size={20} />
                        <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                            Vendor & approval defaults
                        </h2>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-400">
                        Define default vendor fields or approval notes for new POs to keep workflows consistent.
                    </p>
                    <p className="mt-3 text-[11px] text-slate-500 dark:text-slate-400 italic">
                        Coming soon – contact System Admin for changes today.
                    </p>
                </section>

                <section className="glass-card p-5">
                    <div className="flex items-center gap-3 mb-3">
                        <Shield className="text-indigo-400" size={20} />
                        <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                            Permissions & visibility
                        </h2>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-400">
                        View how Procurement visibility is scoped across departments and domains.
                    </p>
                    <p className="mt-3 text-[11px] text-slate-500 dark:text-slate-400 italic">
                        Managed in the global Settings page by administrators.
                    </p>
                </section>
            </div>
        </div>
    );
}

