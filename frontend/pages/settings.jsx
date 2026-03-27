import { useState, useEffect } from 'react'
import { User, Bell, Shield, RefreshCw, Save, Moon, Sun, Monitor, AlertTriangle, Check, X, Lock, Zap } from 'lucide-react'
import { useRole } from '@/contexts/RoleContext'
import apiClient from '@/lib/apiClient'

// Simple Toast Component
const Toast = ({ message, type, onClose }) => (
    <div className={`fixed bottom-4 right-4 z-50 px-6 py-4 rounded-xl shadow-2xl backdrop-blur-md border animate-in slide-in-from-right fade-in duration-300 flex items-center gap-3 ${type === 'success' ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-100' : 'bg-rose-500/20 border-rose-500/30 text-rose-100'
        }`}>
        {type === 'success' ? <Check size={20} /> : <AlertTriangle size={20} />}
        <span className="font-medium">{message}</span>
    </div>
)

// Modal Component
const Modal = ({ isOpen, title, children, onClose, onConfirm, confirmText = "Confirm", type = "primary" }) => {
    if (!isOpen) return null
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="glass-panel w-full max-w-md p-6 relative animate-in zoom-in-95 duration-200">
                <h3 className="text-xl font-bold text-app-text mb-4">{title}</h3>
                <div className="mb-6 text-slate-700 dark:text-slate-700">{children}</div>
                <div className="flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 rounded-lg text-slate-700 dark:text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-app-surface-soft transition-colors">Cancel</button>
                    <button
                        onClick={onConfirm}
                        className={`px-4 py-2 rounded-lg font-medium text-app-text shadow-lg transition-all ${type === 'danger' ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-500/20' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/20'}`}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    )
}

const PLANS = [
    { value: 'STARTER', label: 'Starter' },
    { value: 'PROFESSIONAL', label: 'Professional (3,000 AI queries/mo)' },
    { value: 'BUSINESS', label: 'Business (Unlimited AI)' },
    { value: 'ENTERPRISE', label: 'Enterprise' },
]

export default function Settings() {
    const { user, currentRole, updatePlan, preferences, updatePreferences, setTheme } = useRole()
    const [loading, setLoading] = useState(false)
    const [planLoading, setPlanLoading] = useState(false)
    const [toast, setToast] = useState(null) // { message, type }

    // Derived flags
    const isAdmin = currentRole?.slug === 'ADMIN'
    
    // UI Theme
    const currentTheme = preferences?.ui_theme || 'dark'
    
    // Notifications State (Local copy for toggling, synced on change)
    const notifications = preferences?.notification_settings || {
        expiry: true,
        approvals: true,
        system: true,
        reports: false
    }

    // Editing States for Profile
    const [isEditingProfile, setIsEditingProfile] = useState(false)
    const [tempProfile, setTempProfile] = useState({
        name: user?.name || '',
        email: user?.email || '',
        role: user?.position || ''
    })

    // Local Security State (Mock for now, as no backend 2FA yet)
    const [security, setSecurity] = useState({
        twoFactor: true,
        lastLogin: Date.now() - 1000 * 60 * 5 // 5 mins ago
    })

    // Modals
    const [modal, setModal] = useState({ type: null, isOpen: false }) // type: 'password', '2fa', 'reset'

    // Initialize temp profile when user loads
    useEffect(() => {
        if (user) {
            setTempProfile({
                name: user.name || '',
                email: user.email || '',
                role: user.position || ''
            })
        }
    }, [user])

    // Apply Theme
    const handleThemeChange = (newTheme) => {
        setTheme(newTheme)
        showToast(`Theme updated to ${newTheme}`)
    }

    const showToast = (message, type = 'success') => {
        setToast({ message, type })
        setTimeout(() => setToast(null), 3000)
    }

    const handleSave = async () => {
        setLoading(true)
        try {
            if (isEditingProfile) {
                await apiClient.updateMe({
                    name: tempProfile.name,
                    email: tempProfile.email,
                    position: tempProfile.role
                })
                setIsEditingProfile(false)
                showToast('Profile updated successfully')
            } else {
                showToast('Settings synced')
            }
        } catch (err) {
            showToast('Failed to update profile', 'error')
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    const handlePasswordChange = () => {
        setModal({ type: null, isOpen: false })
        showToast('Password updated successfully')
    }

    const handle2FAToggle = () => {
        setSecurity(prev => ({ ...prev, twoFactor: !prev.twoFactor }))
        setModal({ type: null, isOpen: false })
        showToast(`2FA ${!security.twoFactor ? 'Enabled' : 'Disabled'}`)
    }

    const handleResetData = () => {
        if (!confirm('Are you sure? This will clear all local settings.')) return
        localStorage.removeItem('enterprise_requests')
        localStorage.removeItem('asset_saved_views')
        localStorage.removeItem('appSettings')
        localStorage.removeItem('lastRoute')
        
        setModal({ type: null, isOpen: false })
        showToast('Local application data cleared')
        
        setTimeout(() => window.location.reload(), 1000)
    }

    const handlePlanChange = async (e) => {
        const plan = e.target.value
        setPlanLoading(true)
        try {
            await apiClient.updateMyPlan(plan)
            updatePlan(plan)
            showToast(`Plan updated to ${plan}`)
        } catch (err) {
            showToast(err?.message || 'Failed to update plan', 'error')
        } finally {
            setPlanLoading(false)
        }
    }

    return (
        <div className="space-y-8 pb-8">
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

            {/* Modals */}
            <Modal
                isOpen={modal.type === 'password'}
                title="Change Password"
                onClose={() => setModal({ type: null, isOpen: false })}
                onConfirm={handlePasswordChange}
                confirmText="Update Password"
            >
                <div className="space-y-4">
                    <div>
                        <label className="text-sm text-app-text-muted text-app-text-muted block mb-1">Current Password</label>
                        <input type="password" value="********" disabled className="input-field opacity-50 cursor-not-allowed" />
                    </div>
                    <div>
                        <label className="text-sm text-app-text-muted text-app-text-muted block mb-1">New Password</label>
                        <input type="password" placeholder="Enter new password" className="input-field" />
                    </div>
                    <div>
                        <label className="text-sm text-app-text-muted text-app-text-muted block mb-1">Confirm Password</label>
                        <input type="password" placeholder="Confirm new password" className="input-field" />
                    </div>
                    <div className="flex items-center gap-2 text-emerald-400 text-xs">
                        <Check size={12} /> Strong password
                    </div>
                </div>
            </Modal>

            <Modal
                isOpen={modal.type === '2fa'}
                title={security.twoFactor ? "Disable 2FA?" : "Enable 2FA?"}
                onClose={() => setModal({ type: null, isOpen: false })}
                onConfirm={handle2FAToggle}
                confirmText={security.twoFactor ? "Disable" : "Enable"}
                type={security.twoFactor ? "danger" : "primary"}
            >
                <p className="text-app-text-muted">Are you sure you want to {security.twoFactor ? "disable" : "enable"} Two-Factor Authentication? {security.twoFactor ? "This will lower your account security." : "We will send a code to your email."}</p>
            </Modal>

            <Modal
                isOpen={modal.type === 'reset'}
                title="Reset Database?"
                onClose={() => setModal({ type: null, isOpen: false })}
                onConfirm={handleResetData}
                confirmText="Reset Everything"
                type="danger"
            >
                <div className="flex items-start gap-4 p-4 bg-rose-500/10 border border-rose-500/20 rounded-lg mb-4">
                    <AlertTriangle className="text-rose-500 shrink-0" size={24} />
                    <p className="text-sm text-rose-200">Warning: This action cannot be undone. All custom assets, history, and metrics will be permanently deleted and reset to factory defaults.</p>
                </div>
            </Modal>


            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-app-text tracking-tight">Settings</h2>
                    <p className="text-app-text-muted mt-2 text-lg">Manage your account and application preferences.</p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={loading}
                    className="btn btn-primary flex items-center space-x-2"
                >
                    {loading ? <RefreshCw className="animate-spin" size={18} /> : <Save size={18} />}
                    <span>{loading ? 'Saving...' : 'Save Changes'}</span>
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Subscription Plan (Demo) */}
                <div className="lg:col-span-1">
                    <div className="glass-panel p-6">
                        <div className="flex items-center gap-2 mb-4">
                            <Zap size={20} className="text-amber-400" />
                            <h3 className="text-lg font-bold text-app-text">AI Assistant Plan (Demo)</h3>
                        </div>
                        <p className="text-sm text-app-text-muted text-app-text-muted mb-4">Switch plans for testing. Affects AI Assistant access.</p>
                        <select
                            value={user?.plan || 'STARTER'}
                            onChange={handlePlanChange}
                            disabled={planLoading}
                            className="w-full bg-slate-50 dark:bg-slate-800/50 border border-app-border rounded-xl px-4 py-3 text-app-text focus:ring-2 focus:ring-blue-500/50 outline-none"
                        >
                            {PLANS.map(p => (
                                <option key={p.value} value={p.value}>{p.label}</option>
                            ))}
                        </select>
                        {planLoading && <span className="text-xs text-app-text-muted mt-2 block">Updating...</span>}
                    </div>
                </div>
                {/* User Profile */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="glass-panel p-6">
                        <div className="flex flex-col items-center text-center">
                            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 p-1 mb-4 shadow-lg shadow-blue-500/20">
                                <div className="w-full h-full rounded-full bg-white dark:bg-slate-900 flex items-center justify-center border-4 border-transparent">
                                    <User size={40} className="text-app-text" />
                                </div>
                            </div>

                            {isEditingProfile ? (
                                <div className="space-y-3 w-full animate-in fade-in">
                                    <input
                                        type="text"
                                        value={tempProfile.name}
                                        onChange={e => setTempProfile(prev => ({ ...prev, name: e.target.value }))}
                                        className="input-field text-center py-1"
                                    />
                                    <input
                                        type="text"
                                        value={tempProfile.role}
                                        onChange={e => setTempProfile(prev => ({ ...prev, role: e.target.value }))}
                                        className="input-field text-center py-1 text-blue-400 font-bold"
                                    />
                                    <input
                                        type="email"
                                        value={tempProfile.email}
                                        onChange={e => setTempProfile(prev => ({ ...prev, email: e.target.value }))}
                                        className="input-field text-center py-1 text-sm"
                                    />
                                </div>
                            ) : (
                                <>
                                    <h3 className="text-xl font-bold text-app-text">{user?.name || 'Admin User'}</h3>
                                    <p className="text-blue-400 font-medium">{user?.position || 'IT Administrator'}</p>
                                    <p className="text-app-text-muted text-sm mt-1">{user?.email || 'admin@company.com'}</p>
                                </>
                            )}

                            <div className="mt-6 w-full space-y-3">
                                <button
                                    onClick={() => {
                                        if (isEditingProfile) {
                                            setSettings(prev => ({ ...prev, profile: tempProfile }))
                                            setIsEditingProfile(false)
                                            showToast('Profile updated')
                                        } else {
                                            setIsEditingProfile(true)
                                        }
                                    }}
                                    className={`w-full py-2 px-4 rounded-lg transition-colors text-sm font-medium border ${isEditingProfile ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-app-surface-soft hover:bg-slate-200 hover:text-slate-900 dark:hover:bg-app-surface text-slate-700 dark:text-slate-700 border-app-border'}`}
                                >
                                    {isEditingProfile ? 'Save Profile' : 'Edit Profile'}
                                </button>
                                <button
                                    onClick={() => setModal({ type: 'password', isOpen: true })}
                                    className="w-full py-2 px-4 rounded-lg bg-app-surface-soft hover:bg-slate-200 hover:text-slate-900 dark:hover:bg-app-surface text-slate-700 dark:text-slate-700 transition-colors text-sm font-medium border border-app-border"
                                >
                                    Change Password
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="glass-panel p-6">
                        <h3 className="text-lg font-bold text-app-text mb-4 flex items-center">
                            <Shield className="mr-3 text-emerald-400" size={20} />
                            Security Status
                        </h3>
                        <div className="space-y-3">
                            <div className="flex justify-between items-center cursor-pointer hover:bg-slate-100 dark:hover:bg-white/5 p-2 rounded-lg transition-colors" onClick={() => setModal({ type: '2fa', isOpen: true })}>
                                <span className="text-app-text-muted text-sm">2FA Enabled</span>
                                <span className={`text-xs font-bold px-2 py-1 rounded-full ${security.twoFactor ? 'text-emerald-400 bg-emerald-500/10' : 'text-rose-400 bg-rose-500/10'}`}>
                                    {security.twoFactor ? 'ACTIVE' : 'DISABLED'}
                                </span>
                            </div>
                            <div className="flex justify-between items-center p-2">
                                <span className="text-app-text-muted text-sm">Last Login</span>
                                <span className="text-slate-900 dark:text-slate-200 text-sm">{new Date(security.lastLogin).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                            <div className="flex justify-between items-center p-2">
                                <span className="text-app-text-muted text-sm">Password Strength</span>
                                <span className="text-emerald-400 text-sm">Strong</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main Settings */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Appearance */}
                    <div className="glass-panel p-6">
                        <h3 className="text-xl font-bold text-app-text mb-6 flex items-center">
                            <Monitor className="mr-3 text-blue-400" size={24} />
                            Appearance
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <button
                                onClick={() => handleThemeChange('dark')}
                                className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center space-y-3 ${currentTheme === 'dark' ? 'border-blue-500 bg-blue-500/10' : 'border-app-border bg-app-surface-soft hover:bg-slate-200 hover:text-slate-900 dark:hover:bg-app-surface'
                                    }`}
                            >
                                <div className="w-full h-24 bg-white dark:bg-slate-900 rounded-lg border border-app-border flex items-center justify-center overflow-hidden relative">
                                    <div className="absolute inset-0 bg-gradient-to-br from-slate-800 to-slate-950"></div>
                                    <Moon size={24} className="relative z-10 text-blue-400" />
                                </div>
                                <span className="text-app-text-muted font-medium">Dark Mode</span>
                            </button>

                            <button
                                onClick={() => handleThemeChange('light')}
                                className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center space-y-3 ${currentTheme === 'light' ? 'border-blue-500 bg-blue-500/10' : 'border-app-border bg-app-surface-soft hover:bg-slate-200 hover:text-slate-900 dark:hover:bg-app-surface'
                                    }`}
                            >
                                <div className="w-full h-24 bg-slate-100 rounded-lg flex items-center justify-center overflow-hidden relative">
                                    <Sun size={24} className="relative z-10 text-orange-500" />
                                </div>
                                <span className="text-app-text-muted font-medium">Light Mode</span>
                            </button>

                            <button
                                onClick={() => handleThemeChange('system')}
                                className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center space-y-3 ${currentTheme === 'system' ? 'border-blue-500 bg-blue-500/10' : 'border-app-border bg-app-surface-soft hover:bg-slate-200 hover:text-slate-900 dark:hover:bg-app-surface'
                                    }`}
                            >
                                <div className="w-full h-24 bg-slate-50 dark:bg-slate-800 rounded-lg flex items-center justify-center overflow-hidden relative border border-app-border">
                                    <div className="absolute inset-0 flex">
                                        <div className="w-1/2 h-full bg-white dark:bg-slate-900"></div>
                                        <div className="w-1/2 h-full bg-slate-100"></div>
                                    </div>
                                    <Monitor size={24} className="relative z-10 text-app-text-muted text-app-text-muted mix-blend-difference" />
                                </div>
                                <span className="text-app-text-muted font-medium">System</span>
                            </button>
                        </div>
                    </div>

                    {/* Notifications */}
                    <div className="glass-panel p-6">
                        <h3 className="text-xl font-bold text-app-text mb-6 flex items-center">
                            <Bell className="mr-3 text-yellow-400" size={24} />
                            Notifications
                        </h3>
                        <div className="space-y-4">
                            {[
                                { id: 'expiry', title: 'Asset Expiry Alerts', desc: 'Get notified when assets are expiring soon' },
                                { id: 'approvals', title: 'Approval Requests', desc: 'Receive emails for new approval workflows' },
                                { id: 'system', title: 'System Updates', desc: 'Notifications about system maintenance' },
                                { id: 'reports', title: 'Weekly Reports', desc: 'Receive weekly asset summary reports' }
                            ].map((item) => (
                                <div key={item.id} className="flex items-center justify-between p-4 rounded-lg bg-app-surface-soft border border-app-border hover:bg-slate-200 hover:text-slate-900 dark:hover:bg-app-surface transition-colors">
                                    <div>
                                        <p className="text-slate-900 dark:text-slate-200 font-medium">{item.title}</p>
                                        <p className="text-app-text-muted text-sm">{item.desc}</p>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={notifications[item.id]}
                                            onChange={() => {
                                                updatePreferences({
                                                    notification_settings: {
                                                        ...notifications,
                                                        [item.id]: !notifications[item.id]
                                                    }
                                                });
                                                showToast(`${item.title} updated`);
                                            }}
                                            className="sr-only peer"
                                        />
                                        <div className="w-11 h-6 bg-slate-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                    </label>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
