import { createContext, useContext, useState, useEffect } from 'react';

const RoleContext = createContext();

export const ROLES = [
    { label: 'System Admin', slug: 'ADMIN', dept: 'IT Dept' },
    { label: 'Asset & Inventory Manager', slug: 'ASSET_MANAGER', dept: 'Asset Mgmt' },
    { label: 'Procurement Manager', slug: 'PROCUREMENT', dept: 'Procurement' },
    { label: 'Finance', slug: 'FINANCE', dept: 'Finance' },
    { label: 'IT Management', slug: 'IT_MANAGEMENT', dept: 'IT Dept' },
    { label: 'End User', slug: 'END_USER', dept: 'Employee' },
];

/** Map backend role strings to frontend role slug so Finance users always get Finance portal, not Procurement. */
function normalizeBackendRole(backendRole) {
    if (backendRole == null || backendRole === '') return null;
    const r = String(backendRole).trim().toUpperCase().replace(/\s+/g, '_');
    // Finance-related: send to Finance portal
    if (r === 'FINANCE' || r === 'FINANCE_MANAGER' || r === 'PROCUREMENT_FINANCE') return 'FINANCE';
    // Procurement-only
    if (r === 'PROCUREMENT') return 'PROCUREMENT';
    // Match common backend slugs
    if (['ADMIN', 'SYSTEM_ADMIN'].includes(r)) return 'ADMIN';
    if (['ASSET_MANAGER', 'ASSET_INVENTORY_MANAGER', 'INVENTORY_MANAGER'].includes(r)) return 'ASSET_MANAGER';
    if (r === 'IT_MANAGEMENT') return 'IT_MANAGEMENT';
    if (r === 'END_USER') return 'END_USER';
    return null;
}

export function RoleProvider({ children }) {
    const [currentRole, setCurrentRole] = useState(ROLES[0]);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    // USER_REQUEST: User position (MANAGER or EMPLOYEE) is determined at login
    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    console.log('RoleContext: Provider mounting');

    useEffect(() => {
        const initAuth = () => {
            if (typeof window !== 'undefined') {
                const session = localStorage.getItem('auth_session');
                console.log('RoleContext: Initializing from localStorage, session found:', !!session);

                if (session) {
                    try {
                        const parsed = JSON.parse(session);
                        console.log('RoleContext: Parsed session:', parsed);

                        if (parsed && parsed.isAuthenticated) {
                            // First, ensure apiClient has the token if it was stored separately
                            // (ApiClient singleton already does this in its constructor, but we want to be sure)

                            setUser({
                                id: parsed.id,
                                name: parsed.userName,
                                email: parsed.email,
                                location: parsed.location,
                                position: parsed.position || 'EMPLOYEE',
                                domain: parsed.domain,
                                department: parsed.department,
                                company: parsed.company,
                                createdAt: parsed.createdAt,
                                plan: parsed.plan || 'STARTER'
                            });

                            const normalizedSlug = normalizeBackendRole(parsed.role);
                            const savedRole = ROLES.find(r => r.slug === (normalizedSlug || parsed.role) || r.label === parsed.role) || ROLES[0];
                            setCurrentRole(savedRole);
                            setIsAuthenticated(true);
                            console.log('RoleContext: Auth restored successfully for', parsed.userName);
                        } else {
                            console.log('RoleContext: Session found but not authenticated');
                        }
                    } catch (e) {
                        console.error("RoleContext: Failed to parse auth session", e);
                    }
                }
            }
            setIsLoading(false);
            console.log('RoleContext: Initialization complete, isLoading=false');
        };

        initAuth();
    }, []);

    // Persist role changes to localStorage automatically to prevent reset on reload
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
                company: user.company,
                createdAt: user.createdAt,
                plan: user.plan || 'STARTER',
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
            company: userData.company,
            createdAt: userData.createdAt
        });
        const normalizedSlug = normalizeBackendRole(userData.role);
        const roleObj = ROLES.find(r => r.slug === (normalizedSlug || userData.role) || r.label === userData.role) || ROLES[0];
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
            company: userData.company,
            createdAt: userData.createdAt,
            plan: userData.plan || 'STARTER'
        }));
    };

    const logout = () => {
        setIsAuthenticated(false);
        setUser(null);
        setCurrentRole(ROLES[0]);
        localStorage.removeItem('auth_session');
    };

    const updatePlan = (plan) => {
        setUser(prev => prev ? { ...prev, plan } : null);
        const session = localStorage.getItem('auth_session');
        if (session) {
            try {
                const parsed = JSON.parse(session);
                parsed.plan = plan;
                localStorage.setItem('auth_session', JSON.stringify(parsed));
            } catch (e) {}
        }
    };

    return (
        <RoleContext.Provider value={{ currentRole, setCurrentRole, ROLES, isAuthenticated, user, login, logout, updatePlan, isLoading }}>
            {children}
        </RoleContext.Provider>
    );
}

export function useRole() {
    return useContext(RoleContext);
}
