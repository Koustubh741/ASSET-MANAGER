import { createContext, useContext, useState, useEffect } from 'react';

const RoleContext = createContext();

export const ROLES = [
    { label: 'System Admin', slug: 'ADMIN', dept: 'IT Dept' },
    { label: 'Asset & Inventory Manager', slug: 'ASSET_MANAGER', dept: 'Asset Mgmt' },
    { label: 'Procurement Manager', slug: 'PROCUREMENT', dept: 'Procurement' },
    { label: 'Finance', slug: 'FINANCE', dept: 'Finance' },
    { label: 'IT Management', slug: 'IT_MANAGEMENT', dept: 'IT Dept' },
    { label: 'IT Support', slug: 'IT_SUPPORT', dept: 'IT Dept' },
    { label: 'Manager', slug: 'MANAGER', dept: 'Management' },
    { label: 'End User', slug: 'END_USER', dept: 'Employee' },
];

/** Map backend role strings to frontend role slug so Finance users always get Finance portal, not Procurement. */
function normalizeBackendRole(backendRole) {
    if (backendRole == null || backendRole === '') return null;
    const r = String(backendRole).trim().toUpperCase().replace(/\s+/g, '_');

    // Direct slug matching (legacy fallbacks handled by the migration)
    const match = ROLES.find(role => role.slug === r);
    return match ? match.slug : r;
}

export function RoleProvider({ children }) {
    const [currentRole, setCurrentRole] = useState(ROLES.find(r => r.slug === 'END_USER') || ROLES[0]);
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
                                plan: parsed.plan || 'STARTER',
                                persona: parsed.persona
                            });

                            const normalizedSlug = normalizeBackendRole(parsed.role);
                            const savedRole = ROLES.find(r => r.slug === normalizedSlug) || ROLES.find(r => r.slug === 'END_USER') || ROLES[0];
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
            company: userData.company,
            createdAt: userData.createdAt,
            plan: userData.plan || 'STARTER',
            persona: userData.persona
        }));
    };

    const logout = () => {
        setIsAuthenticated(false);
        setUser(null);
        setCurrentRole(ROLES.find(r => r.slug === 'END_USER') || ROLES[0]);
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
            } catch (e) { }
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
