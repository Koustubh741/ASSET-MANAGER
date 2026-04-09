import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import apiClient from '../lib/apiClient';

const RoleContext = createContext();

export const ROLES = [
    { label: 'End User', slug: 'END_USER' },
    { label: 'Support Unit', slug: 'SUPPORT' },
    { label: 'Department Manager', slug: 'MANAGER' },
    { label: 'System Admin', slug: 'ADMIN' }
];

/** Map backend role strings to frontend base role slugs. */
function normalizeBackendRole(backendRole) {
    if (backendRole == null || backendRole === '') return 'END_USER';
    const r = String(backendRole).trim().toUpperCase();

    // Map specialized/legacy slugs to base categories
    if (r === 'ADMIN' || r === 'SYSTEM_ADMIN') return 'ADMIN';
    if (r.includes('SUPPORT') || r === 'SUPPORT_SPECIALIST') return 'SUPPORT';
    if (r === 'MANAGER' || r === 'CEO' || r === 'CFO' || r === 'FINANCE' || r === 'ASSET_MANAGER' || r === 'PROCUREMENT' || r === 'IT_MANAGEMENT') return 'MANAGER';
    
    // Direct match if it's already a base role
    const match = ROLES.find(role => role.slug === r);
    return match ? match.slug : 'END_USER';
}

export function RoleProvider({ children }) {
    const [currentRole, setCurrentRole] = useState(ROLES.find(r => r.slug === 'END_USER') || ROLES[0]);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    // USER_REQUEST: User position (MANAGER or EMPLOYEE) is determined at login
    const [user, setUser] = useState(null);
    const [preferences, setPreferences] = useState({
        saved_views: {},
        notification_settings: {
            expiry: true,
            approvals: true,
            system: true,
            reports: false
        },
        ui_theme: 'dark',
        onboarding_dismissed: false
    });
    const [isLoading, setIsLoading] = useState(true);
    const [isVerified, setIsVerified] = useState(false);

    const applyTheme = useCallback((themeName) => {
        if (typeof window === 'undefined') return;
        const root = document.documentElement;
        if (themeName === 'light') {
            root.classList.remove('dark');
        } else if (themeName === 'dark') {
            root.classList.add('dark');
        } else if (themeName === 'system') {
            const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            if (systemDark) {
                root.classList.add('dark');
            } else {
                root.classList.remove('dark');
            }
        }
    }, []);

    useEffect(() => {
        const initAuth = () => {
            if (typeof window !== 'undefined') {
                const session = localStorage.getItem('auth_session');
                console.log('RoleContext: Initializing from localStorage, session found:', !!session);

                if (session) {
                    try {
                        const parsed = JSON.parse(session);
                        if (parsed && parsed.isAuthenticated) {
                            setUser({
                                id: parsed.id,
                                name: parsed.userName,
                                email: parsed.email,
                                location: parsed.location,
                                position: parsed.position || 'EMPLOYEE',
                                domain: parsed.domain,
                                department: parsed.department,
                                department_id: parsed.department_id,
                                dept_obj: parsed.dept_obj,
                                company: parsed.company,
                                createdAt: parsed.createdAt,
                                plan: parsed.plan || 'STARTER',
                                persona: parsed.persona
                            });

                            const normalizedSlug = normalizeBackendRole(parsed.role);
                            const savedRole = ROLES.find(r => r.slug === normalizedSlug) || ROLES.find(r => r.slug === 'END_USER') || ROLES[0];
                            setCurrentRole(savedRole);
                            setIsAuthenticated(true);
                            console.log('RoleContext: Auth restored successfully for', parsed.userName);
                        }
                    } catch (e) {
                        console.error("RoleContext: Failed to parse auth session", e);
                    }
                }
            }
            setIsLoading(false);
        };

        initAuth();
    }, []);

    // Fetch preferences when authenticated
    useEffect(() => {
        let isMounted = true;
        
        const syncUserWithBackend = async () => {
            // Root Fix: Pulse isVerified to false when we start a sync to capture latest remote role
            setIsVerified(false);
            
            if (isAuthenticated) {
                try {
                    console.log('RoleContext: Syncing user metadata with backend...');
                    const freshUser = await apiClient.getCurrentUser();
                    
                    if (!isMounted) return;

                    // Update state if data has changed (e.g. department or role updated in DB)
                    setUser(prev => ({
                        ...prev,
                        name: freshUser.full_name,
                        email: freshUser.email,
                        position: freshUser.position,
                        department: freshUser.department,
                        department_id: freshUser.department_id,
                        dept_obj: freshUser.dept_obj,
                        domain: freshUser.domain,
                        persona: freshUser.persona,
                        plan: freshUser.plan
                    }));
                    
                    if (freshUser.role) {
                        const normalizedSlug = normalizeBackendRole(freshUser.role);
                        const roleObj = ROLES.find(r => r.slug === normalizedSlug);
                        if (roleObj && roleObj.slug !== currentRole.slug) {
                            setCurrentRole(roleObj);
                        }
                    }
                    console.log('RoleContext: Metadata sync complete.');
                } catch (e) {
                    console.warn('RoleContext: Background sync failed', e);
                } finally {
                    if (isMounted) setIsVerified(true);
                }
            } else {
                if (isMounted) setIsVerified(true);
            }
        };

        const fetchPreferences = async () => {
            if (isAuthenticated) {
                try {
                    const prefs = await apiClient.getUserPreferences();
                    // Merge with defaults to ensure all keys exist
                    const merged = {
                        ...preferences,
                        ...prefs,
                        notification_settings: {
                            ...preferences.notification_settings,
                            ...(prefs.notification_settings || {})
                        }
                    };
                    setPreferences(merged);
                    applyTheme(merged.ui_theme);
                    console.log('RoleContext: Preferences loaded and theme applied');
                } catch (e) {
                    console.error("RoleContext: Failed to fetch preferences", e);
                }
            }
        };

        syncUserWithBackend();
        fetchPreferences();
    }, [isAuthenticated, applyTheme]);

    // Persist role changes to localStorage automatically - ONLY for session auth
    useEffect(() => {
        if (!isLoading && isAuthenticated && user && currentRole) {
            const session = {
                isAuthenticated: true,
                id: user.id,
                userName: user.name,
                email: user.email,
                location: user.location,
                position: user.position,
                domain: user.domain,
                department: user.department,
                department_id: user.department_id,
                dept_obj: user.dept_obj,
                company: user.company,
                createdAt: user.createdAt,
                plan: user.plan || 'STARTER',
                persona: user.persona,
                role: currentRole.slug
            };
            localStorage.setItem('auth_session', JSON.stringify(session));
        }
    }, [currentRole, isAuthenticated, user, isLoading]);

    const login = (userData) => {
        setIsAuthenticated(true);
        // USER_REQUEST: Store position from login form (MANAGER or EMPLOYEE)
        setUser({
            id: userData.id,
            name: userData.userName,
            email: userData.email,
            location: userData.location,
            position: userData.position || 'EMPLOYEE',
            domain: userData.domain,
            department: userData.department,
            department_id: userData.department_id,
            dept_obj: userData.dept_obj,
            company: userData.company,
            createdAt: userData.createdAt,
            persona: userData.persona
        });
        const normalizedSlug = normalizeBackendRole(userData.role);
        const roleObj = ROLES.find(r => r.slug === normalizedSlug) || ROLES.find(r => r.slug === 'END_USER') || ROLES[0];
        setCurrentRole(roleObj);

        localStorage.setItem('auth_session', JSON.stringify({
            isAuthenticated: true,
            id: userData.id,
            userName: userData.userName,
            email: userData.email,
            role: roleObj.slug,
            location: userData.location,
            position: userData.position,
            domain: userData.domain,
            department: userData.department,
            department_id: userData.department_id,
            dept_obj: userData.dept_obj,
            company: userData.company,
            createdAt: userData.createdAt,
            plan: userData.plan || 'STARTER',
            persona: userData.persona
        }));
    };

    const logout = () => {
        setIsAuthenticated(false);
        setUser(null);
        setIsVerified(true);
        setCurrentRole(ROLES.find(r => r.slug === 'END_USER') || ROLES[0]);
        localStorage.removeItem('auth_session');
        console.log('RoleContext: Session terminated.');
    };

    const updatePlan = (plan) => {
        setUser(prev => prev ? { ...prev, plan } : null);
        const session = localStorage.getItem('auth_session');
        if (session) {
            try {
                const parsed = JSON.parse(session);
                parsed.plan = plan;
                localStorage.setItem('auth_session', JSON.stringify(parsed));
            } catch (e) { }
        }
    };

    const updatePreferences = async (newPrefs) => {
        try {
            const updated = await apiClient.updateUserPreferences(newPrefs);
            setPreferences(updated);
            return updated;
        } catch (e) {
            console.error("RoleContext: Failed to update preferences", e);
            throw e;
        }
    };

    const isAdmin = currentRole?.slug === 'ADMIN';
    const isStaff = isAdmin || currentRole?.slug === 'MANAGER' || currentRole?.slug === 'SUPPORT';
    const isManagerial = isAdmin || currentRole?.slug === 'MANAGER' || user?.position === 'MANAGER';

    // Helper to check if user is staff of a specific department
    const isDeptStaff = (deptName) => {
        if (isAdmin) return true;
        if (!isStaff || !user?.department) return false;
        return user.department.toLowerCase() === deptName.toLowerCase();
    };

    const isITStaff = isDeptStaff('IT');
    const isAssetStaff = isDeptStaff('Asset Management');
    const isFinanceStaff = isDeptStaff('Finance');
    const isProcurementStaff = isDeptStaff('Procurement');
    const isEngineeringStaff = isDeptStaff('Engineering');
    const isHRStaff = isDeptStaff('HR');

    // Permission aliases
    const canManageAutomation = isManagerial;
    const canManageSystem = isAdmin;
    const canManageAssets = isAssetStaff;

    const setTheme = async (newTheme) => {
        applyTheme(newTheme);
        try {
            await updatePreferences({ ui_theme: newTheme });
        } catch (e) {
            console.error("Failed to sync theme to backend", e);
        }
    };

    const setOnboardingDismissed = async (dismissed = true) => {
        try {
            await updatePreferences({ onboarding_dismissed: dismissed });
        } catch (e) {
            console.error("Failed to sync onboarding dismissal to backend", e);
        }
    };

    return (
        <RoleContext.Provider value={{ 
            currentRole, 
            setCurrentRole, 
            ROLES, 
            isAuthenticated, 
            user, 
            login, 
            logout, 
            updatePlan, 
            preferences,
            updatePreferences,
            setTheme,
            setOnboardingDismissed,
            isLoading,
            // Permission Flags
            isAdmin,
            isITStaff,
            isAssetStaff,
            isFinanceStaff,
            isProcurementStaff,
            isEngineeringStaff,
            isHRStaff,
            isStaff,
            isManagerial,
            isVerified,
            // Action Aliases
            canManageAutomation,
            canManageSystem,
            canManageAssets
        }}>
            {children}
        </RoleContext.Provider>
    );
}

export function useRole() {
    return useContext(RoleContext);
}
