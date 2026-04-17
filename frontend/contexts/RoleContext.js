import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import apiClient from '../lib/apiClient';

import { mapDesignationToRole, V2_ROLES, getV2Theme } from '../config/v2_identity_map';

const RoleContext = createContext();

export const ROLES = V2_ROLES;

/** Map backend role strings to frontend base role slugs. */
function normalizeBackendRole(user) {
    if (!user) return 'END_USER';
    const backendRole = user.role;
    const persona = user.persona;
    const department = user.department;

    if (backendRole == null || backendRole === '') return 'END_USER';
    const r = String(backendRole).trim().toUpperCase();

    // 1. Direct system roles
    if (r === 'ADMIN' || r === 'SYSTEM_ADMIN') return 'ADMIN';
    
    // 2. Intelligent V2 Mapping (Designation + Dept)
    const mappedRole = mapDesignationToRole(persona || backendRole, department);
    if (mappedRole !== 'END_USER') return mappedRole;

    // 3. Fallback direct match
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
        ui_theme: 'system',
        onboarding_dismissed: false,
        hasSeenExperience: false
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
        const initAuth = async () => {
            if (typeof window !== 'undefined') {
                console.log('RoleContext: Checking for secure session handshake...');
                
                // Root Fix: Instead of trusting localStorage, we verify with the backend
                try {
                    const freshUser = await apiClient.getCurrentUser();
                    
                    setUser({
                        id: freshUser.id,
                        name: freshUser.full_name,
                        email: freshUser.email,
                        location: freshUser.location,
                        position: freshUser.position || 'EMPLOYEE',
                        domain: freshUser.domain,
                        department: freshUser.department,
                        department_id: freshUser.department_id,
                        dept_obj: freshUser.dept_obj,
                        company: freshUser.company,
                        createdAt: freshUser.created_at,
                        plan: freshUser.plan || 'STARTER',
                        persona: freshUser.persona
                    });

                    const normalizedSlug = normalizeBackendRole(freshUser);
                    const savedRole = ROLES.find(r => r.slug === normalizedSlug) || ROLES.find(r => r.slug === 'END_USER') || ROLES[0];
                    setCurrentRole(savedRole);
                    setIsAuthenticated(true);
                    console.log('RoleContext: Secure session established for', freshUser.full_name);
                } catch (e) {
                    console.log('RoleContext: No active secure session found or backend unreachable.', e);
                } finally {
                    setIsLoading(false);
                    setIsVerified(true);
                }
            }
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
                    
                    if (freshUser.role || freshUser.persona) {
                        const normalizedSlug = normalizeBackendRole(freshUser);
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

    // Persist non-sensitive settings ONLY (Theme, etc.)
    // Session state is now strictly server-side managed via cookies
    useEffect(() => {
        if (!isLoading && isAuthenticated && user && currentRole) {
            // We no longer persist the full session to localStorage for security
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
        const normalizedSlug = normalizeBackendRole({ role: userData.role, persona: userData.persona, department: userData.department });
        const roleObj = ROLES.find(r => r.slug === normalizedSlug) || ROLES.find(r => r.slug === 'END_USER') || ROLES[0];
        setCurrentRole(roleObj);
        // localStorage persistence removed for security
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
    const isExecutive = currentRole?.slug === 'EXECUTIVE' || user?.persona === 'CEO' || user?.persona === 'CFO';
    const isFinance = currentRole?.slug === 'FINANCE' || user?.department?.toLowerCase().includes('finance') || user?.department?.includes('F&A');
    const isProcurement = currentRole?.slug === 'PROCUREMENT' || user?.department?.toLowerCase().includes('procurement') || user?.department === 'SCM';
    const isLossPrevention = currentRole?.slug === 'LOSS_PREVENTION' || user?.department === 'LOSS PREVENTION';
    
    const isStaff = isAdmin || currentRole?.slug === 'MANAGER' || currentRole?.slug === 'SUPPORT' || isFinance || isProcurement || isLossPrevention || currentRole?.slug === 'IT_MANAGEMENT';
    const isManagerial = isAdmin || isExecutive || currentRole?.slug === 'MANAGER' || user?.position === 'MANAGER' || isFinance || isProcurement || String(user?.persona || '').toUpperCase().includes('MANAGER');
    
    // THEME Registry Integration
    const theme = getV2Theme(user?.department, currentRole?.slug);

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

    const setHasSeenExperience = async (seen = true) => {
        try {
            await updatePreferences({ hasSeenExperience: seen });
        } catch (e) {
            console.error("Failed to sync experience status to backend", e);
        }
    };

    return (
        <RoleContext.Provider value={{ 
            currentRole, 
            setCurrentRole, 
            ROLES, 
            isAuthenticated, 
            user, 
            setUser,
            login, 
            logout, 
            updatePlan, 
            preferences,
            updatePreferences,
            setTheme,
            setOnboardingDismissed,
            setHasSeenExperience,
            isLoading,
            // V2 Theme Metadata
            theme,
            // Permission Flags
            isAdmin,
            isExecutive,
            isFinance,
            isProcurement,
            isLossPrevention,
            isITStaff: isDeptStaff('IT'),
            isAssetStaff: isDeptStaff('Asset Management') || isDeptStaff('Inventory'),
            isFinanceStaff: isFinance || isDeptStaff('Finance'),
            isProcurementStaff: isProcurement || isDeptStaff('Procurement') || isDeptStaff('SCM'),
            isEngineeringStaff: isDeptStaff('Engineering'),
            isHRStaff: isDeptStaff('HR'),
            isStaff,
            isManagerial,
            isVerified,
            // Action Aliases
            canManageAutomation: isManagerial || isAdmin,
            canManageSystem: isAdmin,
            canManageAssets: isAssetStaff || isITStaff || isAdmin || currentRole?.slug === 'ASSET_MANAGER'
        }}>
            {children}
        </RoleContext.Provider>
    );
}

export function useRole() {
    return useContext(RoleContext);
}
