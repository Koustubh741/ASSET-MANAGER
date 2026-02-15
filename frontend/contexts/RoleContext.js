import { createContext, useContext, useState, useEffect } from 'react';

const RoleContext = createContext();

export const ROLES = [
    { label: 'System Admin', slug: 'ADMIN', dept: 'IT Dept' },
    { label: 'Asset & Inventory Manager', slug: 'ASSET_MANAGER', dept: 'Asset Mgmt' },
    { label: 'Procurement & Finance', slug: 'FINANCE', dept: 'Finance' },
    { label: 'IT Management', slug: 'IT_MANAGEMENT', dept: 'IT Dept' },
    { label: 'End User', slug: 'END_USER', dept: 'Employee' },
];

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
                                location: parsed.location,
                                position: parsed.position || 'EMPLOYEE',
                                domain: parsed.domain,
                                department: parsed.department, // NEW: Restore department
                                company: parsed.company, // NEW: Restore company
                                createdAt: parsed.createdAt // NEW: Restore DOJ
                            });

                            const savedRole = ROLES.find(r => r.slug === parsed.role || r.label === parsed.role) || ROLES[0];
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
                location: user.location,
                position: user.position, // NEW: Persist position
                domain: user.domain,
                department: user.department, // NEW: Persist department
                company: user.company, // NEW: Persist company
                createdAt: user.createdAt, // NEW: Persist DOJ
                role: currentRole.slug // Persist slug for better matching on reload
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
            location: userData.location,
            position: userData.position || 'EMPLOYEE',
            domain: userData.domain,
            department: userData.department, // NEW: Set department
            company: userData.company, // NEW: Set company
            createdAt: userData.createdAt // NEW: Set DOJ
        });
        const roleObj = ROLES.find(r => r.slug === userData.role || r.label === userData.role) || ROLES[0];
        setCurrentRole(roleObj);

        localStorage.setItem('auth_session', JSON.stringify({
            isAuthenticated: true,
            id: userData.id,
            userName: userData.userName,
            role: roleObj.slug,
            location: userData.location,
            position: userData.position,
            domain: userData.domain,
            department: userData.department, // NEW: Save department
            company: userData.company, // NEW: Save company
            createdAt: userData.createdAt // NEW: Save DOJ
        }));
    };

    const logout = () => {
        setIsAuthenticated(false);
        setUser(null);
        setCurrentRole(ROLES[0]);
        localStorage.removeItem('auth_session');
    };

    return (
        <RoleContext.Provider value={{ currentRole, setCurrentRole, ROLES, isAuthenticated, user, login, logout, isLoading }}>
            {children}
        </RoleContext.Provider>
    );
}

export function useRole() {
    return useContext(RoleContext);
}
