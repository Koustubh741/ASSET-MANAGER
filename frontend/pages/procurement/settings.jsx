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
                <h1 className="text-xl font-bold text-app-text flex items-center gap-2">
                    <SettingsIcon className="text-blue-400" size={28} />
                    Procurement Settings
                </h1>
                <p className="text-app-text-muted text-app-text-muted mt-1">
                    Preferences and account information for the Procurement hub.
                </p>
            </header>

            {/* Manager / account information */}
            <section className="glass-card p-6">
                <h2 className="text-lg font-semibold text-app-text flex items-center gap-2 mb-4">
                    <User className="text-blue-400" size={22} />
                    Manager / account information
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="flex items-start gap-3 p-3 rounded-xl bg-app-surface-soft border border-app-border">
                        <User size={18} className="text-app-text-muted mt-0.5 shrink-0" />
                        <div>
                            <p className="text-[10px] font-semibold text-app-text-muted uppercase tracking-wider">Name</p>
                            <p className="text-sm font-medium text-app-text">{user?.name ?? '—'}</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 rounded-xl bg-app-surface-soft border border-app-border">
                        <Mail size={18} className="text-app-text-muted mt-0.5 shrink-0" />
                        <div>
                            <p className="text-[10px] font-semibold text-app-text-muted uppercase tracking-wider">Email</p>
                            <p className="text-sm font-medium text-app-text">{user?.email ?? '—'}</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 rounded-xl bg-app-surface-soft border border-app-border">
                        <Briefcase size={18} className="text-app-text-muted mt-0.5 shrink-0" />
                        <div>
                            <p className="text-[10px] font-semibold text-app-text-muted uppercase tracking-wider">Role</p>
                            <p className="text-sm font-medium text-app-text">{currentRole?.label ?? '—'}</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 rounded-xl bg-app-surface-soft border border-app-border">
                        <Briefcase size={18} className="text-app-text-muted mt-0.5 shrink-0" />
                        <div>
                            <p className="text-[10px] font-semibold text-app-text-muted uppercase tracking-wider">Position</p>
                            <p className="text-sm font-medium text-app-text">{user?.position ?? '—'}</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 rounded-xl bg-app-surface-soft border border-app-border">
                        <Building2 size={18} className="text-app-text-muted mt-0.5 shrink-0" />
                        <div>
                            <p className="text-[10px] font-semibold text-app-text-muted uppercase tracking-wider">Department</p>
                            <p className="text-sm font-medium text-app-text">{user?.department ?? '—'}</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 rounded-xl bg-app-surface-soft border border-app-border">
                        <Building2 size={18} className="text-app-text-muted mt-0.5 shrink-0" />
                        <div>
                            <p className="text-[10px] font-semibold text-app-text-muted uppercase tracking-wider">Domain / team</p>
                            <p className="text-sm font-medium text-app-text">{user?.domain || user?.department || '—'}</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 rounded-xl bg-app-surface-soft border border-app-border">
                        <MapPin size={18} className="text-app-text-muted mt-0.5 shrink-0" />
                        <div>
                            <p className="text-[10px] font-semibold text-app-text-muted uppercase tracking-wider">Location</p>
                            <p className="text-sm font-medium text-app-text">{user?.location ?? '—'}</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 rounded-xl bg-app-surface-soft border border-app-border">
                        <Building2 size={18} className="text-app-text-muted mt-0.5 shrink-0" />
                        <div>
                            <p className="text-[10px] font-semibold text-app-text-muted uppercase tracking-wider">Company</p>
                            <p className="text-sm font-medium text-app-text">{user?.company ?? '—'}</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 rounded-xl bg-app-surface-soft border border-app-border">
                        <Calendar size={18} className="text-app-text-muted mt-0.5 shrink-0" />
                        <div>
                            <p className="text-[10px] font-semibold text-app-text-muted uppercase tracking-wider">Member since</p>
                            <p className="text-sm font-medium text-app-text">{memberSince}</p>
                        </div>
                    </div>
                </div>
            </section>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <section className="glass-card p-5">
                    <div className="flex items-center gap-3 mb-3">
                        <Bell className="text-amber-400" size={20} />
                        <h2 className="text-sm font-semibold text-app-text">
                            Notifications
                        </h2>
                    </div>
                    <p className="text-xs text-app-text-muted text-app-text-muted">
                        Control which Procurement events send alerts (e.g. PO uploaded, Finance approved, delivery confirmed).
                    </p>
                    <p className="mt-3 text-[11px] text-app-text-muted italic">
                        Coming soon – managed centrally by System Admin.
                    </p>
                </section>

                <section className="glass-card p-5">
                    <div className="flex items-center gap-3 mb-3">
                        <Users className="text-emerald-400" size={20} />
                        <h2 className="text-sm font-semibold text-app-text">
                            Vendor & approval defaults
                        </h2>
                    </div>
                    <p className="text-xs text-app-text-muted text-app-text-muted">
                        Define default vendor fields or approval notes for new POs to keep workflows consistent.
                    </p>
                    <p className="mt-3 text-[11px] text-app-text-muted italic">
                        Coming soon – contact System Admin for changes today.
                    </p>
                </section>

                <section className="glass-card p-5">
                    <div className="flex items-center gap-3 mb-3">
                        <Shield className="text-indigo-400" size={20} />
                        <h2 className="text-sm font-semibold text-app-text">
                            Permissions & visibility
                        </h2>
                    </div>
                    <p className="text-xs text-app-text-muted text-app-text-muted">
                        View how Procurement visibility is scoped across departments and domains.
                    </p>
                    <p className="mt-3 text-[11px] text-app-text-muted italic">
                        Managed in the global Settings page by administrators.
                    </p>
                </section>
            </div>
        </div>
    );
}

