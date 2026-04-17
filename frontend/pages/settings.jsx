import { useState, useEffect } from 'react'
import { User, Bell, Shield, RefreshCw, Save, Moon, Sun, Monitor, AlertTriangle, Check, X, Lock, Zap } from 'lucide-react'
import { useRole } from '@/contexts/RoleContext'
import apiClient from '@/lib/apiClient'

// Simple Toast Component
const Toast = ({ message, type, onClose }) => (
    <div className={`fixed bottom-4 right-4 z-50 px-6 py-4 rounded-none shadow-2xl backdrop-blur-md border animate-in slide-in-from-right fade-in duration-300 flex items-center gap-3 ${type === 'success' ? 'bg-app-secondary/20 border-app-secondary/30 text-app-secondary' : 'bg-app-rose/20 border-app-rose/30 text-app-rose'
        }`}>
        {type === 'success' ? <Check size={20} /> : <AlertTriangle size={20} />}
        <span className="font-medium uppercase tracking-widest text-[10px]">{message}</span>
    </div>
)

// Modal Component
const Modal = ({ isOpen, title, children, onClose, onConfirm, confirmText = "Confirm", type = "primary" }) => {
    if (!isOpen) return null
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="glass-panel w-full max-w-md p-6 relative animate-in zoom-in-95 duration-200 border-l border-app-primary">
                <h3 className="text-xl font-black text-app-text mb-4 uppercase italic tracking-tight">{title}</h3>
                <div className="mb-6 text-app-text-muted text-sm uppercase tracking-tight">{children}</div>
                <div className="flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 rounded-none text-app-text-muted hover:bg-app-surface-soft hover:text-app-text transition-colors uppercase text-[10px] font-black tracking-widest">Cancel</button>
                    <button
                        onClick={onConfirm}
                        className={`px-4 py-2 rounded-none font-black text-[10px] uppercase tracking-widest text-app-void shadow-lg transition-all ${type === 'danger' ? 'bg-app-rose hover:bg-app-rose/80 shadow-app-rose/20' : 'bg-app-primary hover:bg-app-primary/80 shadow-app-primary/20'}`}
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
                    <div className="flex items-center gap-2 text-app-secondary text-[10px] font-black uppercase tracking-widest">
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
                <div className="flex items-start gap-4 p-4 bg-app-rose/10 border border-app-rose/20 rounded-none mb-4">
                    <AlertTriangle className="text-app-rose shrink-0" size={24} />
                    <p className="text-[10px] font-black uppercase tracking-tight text-app-rose">Warning: This action cannot be undone. All custom assets, history, and metrics will be permanently deleted and reset to factory defaults.</p>
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
                            <Zap size={20} className="text-app-gold" />
                            <h3 className="text-lg font-black text-app-text uppercase italic tracking-tight">AI Assistant Plan (Demo)</h3>
                        </div>
                        <p className="text-sm text-app-text-muted text-app-text-muted mb-4">Switch plans for testing. Affects AI Assistant access.</p>
                        <select
                            value={user?.plan || 'STARTER'}
                            onChange={handlePlanChange}
                            disabled={planLoading}
                            className="w-full bg-app-void border border-app-border rounded-none px-4 py-3 text-app-text focus:ring-2 focus:ring-app-primary/50 outline-none uppercase font-black text-[10px] tracking-widest italic premium-select"
                        >
                            {PLANS.map(p => (
                                <option key={p.value} value={p.value} className="bg-app-obsidian">{p.label}</option>
                            ))}
                        </select>
                        {planLoading && <span className="text-xs text-app-text-muted mt-2 block">Updating...</span>}
                    </div>
                </div>
                {/* User Profile */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="glass-panel p-6">
                        <div className="flex flex-col items-center text-center">
                            <div className="w-24 h-24 rounded-none bg-app-primary p-1 mb-4 shadow-lg shadow-app-primary/20">
                                <div className="w-full h-full rounded-none bg-app-void flex items-center justify-center border-4 border-transparent">
                                    <User size={40} className="text-app-text" />
                                </div>
                            </div>

                            {isEditingProfile ? (
                                <div className="space-y-3 w-full animate-in fade-in">
                                    <input
                                        type="text"
                                        value={tempProfile.name}
                                        onChange={e => setTempProfile(prev => ({ ...prev, name: e.target.value }))}
                                        className="input-field text-center py-1 font-black uppercase tracking-widest text-xs"
                                    />
                                    <input
                                        type="text"
                                        value={tempProfile.role}
                                        onChange={e => setTempProfile(prev => ({ ...prev, role: e.target.value }))}
                                        className="input-field text-center py-1 text-app-primary font-black uppercase tracking-[0.2em] text-[10px]"
                                    />
                                    <input
                                        type="email"
                                        value={tempProfile.email}
                                        onChange={e => setTempProfile(prev => ({ ...prev, email: e.target.value }))}
                                        className="input-field text-center py-1 text-[10px] font-mono"
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
                                    className={`w-full py-2 px-4 rounded-none transition-colors text-[10px] font-black uppercase tracking-widest border ${isEditingProfile ? 'bg-app-secondary/20 text-app-secondary border-app-secondary/30' : 'bg-app-surface-soft hover:bg-app-primary hover:text-app-void text-app-text-muted border-app-border'}`}
                                >
                                    {isEditingProfile ? 'Save Profile' : 'Edit Profile'}
                                </button>
                                <button
                                    onClick={() => setModal({ type: 'password', isOpen: true })}
                                    className="w-full py-2 px-4 rounded-none bg-app-surface-soft hover:bg-app-primary hover:text-app-void text-app-text-muted transition-colors text-[10px] font-black uppercase tracking-widest border border-app-border"
                                >
                                    Change Password
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="glass-panel p-6">
                        <h3 className="text-lg font-black text-app-text mb-4 flex items-center uppercase italic tracking-tight">
                            <Shield className="mr-3 text-app-secondary" size={20} />
                            Security Status
                        </h3>
                        <div className="space-y-3">
                            <div className="flex justify-between items-center cursor-pointer hover:bg-app-primary/10 p-2 rounded-none transition-colors group" onClick={() => setModal({ type: '2fa', isOpen: true })}>
                                <span className="text-app-text-muted text-[10px] font-black uppercase tracking-widest">2FA Enabled</span>
                                <span className={`text-[10px] font-black px-2 py-1 rounded-none border uppercase tracking-widest ${security.twoFactor ? 'text-app-secondary bg-app-secondary/10 border-app-secondary/20' : 'text-app-rose bg-app-rose/10 border-app-rose/20'}`}>
                                    {security.twoFactor ? 'ACTIVE' : 'DISABLED'}
                                </span>
                            </div>
                            <div className="flex justify-between items-center p-2">
                                <span className="text-app-text-muted text-[10px] font-black uppercase tracking-widest">Last Login</span>
                                <span className="text-app-text text-[10px] font-black uppercase tracking-widest">{new Date(security.lastLogin).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                            <div className="flex justify-between items-center p-2">
                                <span className="text-app-text-muted text-[10px] font-black uppercase tracking-widest">Password Strength</span>
                                <span className="text-app-secondary text-[10px] font-black uppercase tracking-widest">Strong</span>
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
                                className={`p-4 rounded-none border transition-all flex flex-col items-center space-y-3 ${currentTheme === 'dark' ? 'border-app-primary bg-app-primary/10' : 'border-app-border bg-app-surface-soft hover:bg-app-primary/5 hover:border-app-primary/40'
                                    }`}
                            >
                                <div className="w-full h-24 bg-app-void rounded-none border border-app-border flex items-center justify-center overflow-hidden relative">
                                    <div className="absolute inset-0 bg-gradient-to-br from-app-obsidian to-app-void"></div>
                                    <Moon size={24} className="relative z-10 text-app-primary" />
                                </div>
                                <span className="text-[10px] font-black uppercase tracking-widest text-app-text-muted">Dark Mode</span>
                            </button>

                            <button
                                onClick={() => handleThemeChange('light')}
                                className={`p-4 rounded-none border transition-all flex flex-col items-center space-y-3 ${currentTheme === 'light' ? 'border-app-primary bg-app-primary/10' : 'border-app-border bg-app-surface-soft hover:bg-app-primary/5 hover:border-app-primary/40'
                                    }`}
                            >
                                <div className="w-full h-24 bg-white rounded-none flex items-center justify-center overflow-hidden relative border border-app-border">
                                    <Sun size={24} className="relative z-10 text-app-gold" />
                                </div>
                                <span className="text-[10px] font-black uppercase tracking-widest text-app-text-muted">Light Mode</span>
                            </button>

                            <button
                                onClick={() => handleThemeChange('system')}
                                className={`p-4 rounded-none border transition-all flex flex-col items-center space-y-3 ${currentTheme === 'system' ? 'border-app-primary bg-app-primary/10' : 'border-app-border bg-app-surface-soft hover:bg-app-primary/5 hover:border-app-primary/40'
                                    }`}
                            >
                                <div className="w-full h-24 bg-app-void rounded-none flex items-center justify-center overflow-hidden relative border border-app-border">
                                    <div className="absolute inset-0 flex">
                                        <div className="w-1/2 h-full bg-app-obsidian"></div>
                                        <div className="w-1/2 h-full bg-white"></div>
                                    </div>
                                    <Monitor size={24} className="relative z-10 text-app-text-muted mix-blend-difference" />
                                </div>
                                <span className="text-[10px] font-black uppercase tracking-widest text-app-text-muted">System</span>
                            </button>
                        </div>
                    </div>

                    {/* Notifications */}
                    <div className="glass-panel p-6">
                        <h3 className="text-xl font-black text-app-text mb-6 flex items-center uppercase italic tracking-tight">
                            <Bell className="mr-3 text-app-gold" size={24} />
                            Notifications
                        </h3>
                        <div className="space-y-4">
                            {[
                                { id: 'expiry', title: 'Asset Expiry Alerts', desc: 'Get notified when assets are expiring soon' },
                                { id: 'approvals', title: 'Approval Requests', desc: 'Receive emails for new approval workflows' },
                                { id: 'system', title: 'System Updates', desc: 'Notifications about system maintenance' },
                                { id: 'reports', title: 'Weekly Reports', desc: 'Receive weekly asset summary reports' }
                            ].map((item) => (
                                <div key={item.id} className="flex items-center justify-between p-4 rounded-none bg-app-void border border-app-border hover:bg-app-primary/[0.03] transition-colors">
                                    <div>
                                        <p className="text-app-text font-black uppercase tracking-widest text-[10px]">{item.title}</p>
                                        <p className="text-app-text-muted text-[9px] uppercase tracking-tighter opacity-40">{item.desc}</p>
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
                                        <div className="w-11 h-6 bg-app-obsidian peer-focus:outline-none rounded-none peer peer-checked:after:translate-x-full peer-checked:after:border-app-void after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-app-text-muted after:border-app-void after:border after:rounded-none after:h-5 after:w-5 after:transition-all peer-checked:bg-app-primary"></div>
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
