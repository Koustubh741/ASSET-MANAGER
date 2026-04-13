import { createContext, useContext, useState, useEffect } from 'react';
import apiClient from '@/lib/apiClient';
import { useRole } from '@/contexts/RoleContext';
import { useToast } from '@/components/common/Toast';

// --- ENTERPRISE ASSET REQUEST FLOW ---

export const ASSET_STATUS = {
    IN_USE: 'In Use',
    AVAILABLE: 'Available',
    RETIRED: 'Retired',
    MAINTENANCE: 'Maintenance',
    DISCOVERED: 'Discovered',
    ALLOCATED: 'Allocated',
    CONFIGURING: 'Configuring',
    READY_FOR_DEPLOYMENT: 'Ready for Deployment',
    SCRAP_CANDIDATE: 'Scrap Candidate',
    IN_STOCK: 'In Stock',
    ACTIVE: 'Active',
    RESERVED: 'Reserved',
    REPAIR: 'Repair',
    PENDING: 'Pending'
};

export const OWNER_ROLE = {
    END_USER: 'END_USER',
    MANAGER: 'MANAGER',
    IT_MANAGEMENT: 'IT_MANAGEMENT',
    ASSET_MANAGER: 'ASSET_MANAGER',
    PROCUREMENT: 'PROCUREMENT',
    FINANCE: 'FINANCE',
    PROCUREMENT_FINANCE: 'PROCUREMENT_FINANCE',
    ADMIN: 'ADMIN'
};

export const REQUEST_STATUS = {
    REQUESTED: 'REQUESTED',
    MANAGER_APPROVED: 'MANAGER_APPROVED',
    IT_APPROVED: 'IT_APPROVED',
    MANAGER_CONFIRMED_IT: 'MANAGER_CONFIRMED_IT',
    INVENTORY_APPROVED: 'INVENTORY_APPROVED',
    REJECTED: 'REJECTED',
    PROCUREMENT_REQUIRED: 'PROCUREMENT_REQUIRED',
    QC_PENDING: 'QC_PENDING',
    USER_ACCEPTANCE_PENDING: 'USER_ACCEPTANCE_PENDING',
    MANAGER_CONFIRMED_ASSIGNMENT: 'MANAGER_CONFIRMED_ASSIGNMENT',
    BYOD_COMPLIANCE_CHECK: 'BYOD_COMPLIANCE_CHECK',
    FULFILLED: 'FULFILLED',
    CLOSED: 'CLOSED'
};

const AssetContext = createContext();

export function AssetProvider({ children }) {
    const [assets, setAssets] = useState([]);
    const [requests, setRequests] = useState([]);
    const [tickets, setTickets] = useState([]);
    const [exitRequests, setExitRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Derived counts for dashboards
    const incomingRequests = requests.filter(r => r.status === 'REQUESTED' || r.status === 'MANAGER_APPROVED');
    const activeTickets = tickets.filter(t => t.status !== 'CLOSED' && t.status !== 'REJECTED');

    // --- Persistence & API Integration ---
    const deriveOwnerRole = (status, assetType, procurementStage) => {
        switch (status) {
            case REQUEST_STATUS.REQUESTED: return OWNER_ROLE.MANAGER;
            case REQUEST_STATUS.MANAGER_APPROVED: return OWNER_ROLE.IT_MANAGEMENT;
            case REQUEST_STATUS.IT_APPROVED: return OWNER_ROLE.MANAGER;
            case REQUEST_STATUS.MANAGER_CONFIRMED_IT:
                return assetType === 'BYOD' ? OWNER_ROLE.IT_MANAGEMENT : OWNER_ROLE.ASSET_MANAGER;
            case REQUEST_STATUS.PROCUREMENT_REQUIRED:
                if (procurementStage === 'PO_CREATED' || procurementStage === 'PO_UPLOADED') return OWNER_ROLE.PROCUREMENT;
                if (procurementStage === 'PO_VALIDATED') return OWNER_ROLE.FINANCE;
                if (procurementStage === 'FINANCE_APPROVED' || status === 'FINANCE_APPROVED') return OWNER_ROLE.PROCUREMENT;
                return OWNER_ROLE.PROCUREMENT;
            case 'PO_UPLOADED': return OWNER_ROLE.PROCUREMENT;
            case 'PO_VALIDATED': return OWNER_ROLE.FINANCE;
            case 'FINANCE_APPROVED': return OWNER_ROLE.PROCUREMENT;
            case 'PROCUREMENT_APPROVED': return OWNER_ROLE.PROCUREMENT;
            case 'QC_PENDING': return OWNER_ROLE.ASSET_MANAGER;
            case REQUEST_STATUS.USER_ACCEPTANCE_PENDING: return OWNER_ROLE.END_USER;
            case REQUEST_STATUS.MANAGER_CONFIRMED_ASSIGNMENT: return OWNER_ROLE.MANAGER;
            case REQUEST_STATUS.BYOD_COMPLIANCE_CHECK: return OWNER_ROLE.IT_MANAGEMENT;
            case REQUEST_STATUS.FULFILLED: return OWNER_ROLE.END_USER;
            case REQUEST_STATUS.REJECTED: return OWNER_ROLE.END_USER;
            default: return OWNER_ROLE.IT_MANAGEMENT;
        }
    };

    // Persistence for Demo/Fallback mode - REMOVED for Root Fix

    const { isAuthenticated, isLoading: authLoading, user, currentRole, isAdmin, isITStaff, isAssetStaff, isFinanceStaff, isProcurementStaff, isManagerial, isStaff } = useRole();
    const toast = useToast();

    const loadData = async () => {
        if (authLoading || !isAuthenticated) return;

        try {
            setLoading(true);
            let apiAssetRequests = [];
            let apiAssets = [];
            let apiTickets = [];

            // 2) Load asset requests & tickets
            try {
                // Domain-based filtering logic
                console.log(`[AssetContext] User position: ${user?.position}, Domain: ${user?.domain}, RoleSlug: ${currentRole?.slug}, isStaff: ${isStaff}`);
                if (isAdmin || isAssetStaff || isFinanceStaff || isProcurementStaff || isITStaff || isStaff) {
                    // Admin-level/Centralized roles see EVERYTHING (size=0 for unlimited)
                    apiAssetRequests = await apiClient.getAssetRequests({ limit: 0 });
                    const assetResponse = await apiClient.getAssets({ size: 0 });
                    apiAssets = assetResponse.data || [];
                    const ticketResponse = await apiClient.getTickets(0, 0);
                    apiTickets = ticketResponse.data || [];
                    console.log(`[AssetContext] Admin fetch: ${apiAssetRequests.length} requests, ${apiAssets.length} assets, ${apiTickets.length} tickets`);
                } else if (isManagerial) {
                    if (!user.department && !user.domain) {
                        console.warn(`[AssetContext] Manager ${user.name} has no department or domain assigned. Falling back to personal requests only.`);
                        apiAssetRequests = await apiClient.getAssetRequests({ mine: true, limit: 0 });
                        const assetResponse = await apiClient.getAssets({ size: 0 });
                        apiAssets = assetResponse.data || [];
                        const ticketResponse = await apiClient.getTickets(0, 0);
                        apiTickets = ticketResponse.data || [];
                    } else {
                        console.log(`[AssetContext] Fetching for manager: Dept=${user.department}, Domain=${user.domain}`);
                        
                        const shouldFetchDomain = user.domain && user.domain !== user.department;
                        
                        // Execute all fetches in parallel for better performance
                        const [
                            deptReqs, 
                            domainReqs, 
                            myReqs,
                            deptAssets,
                            domainAssets,
                            myAssetsList,
                            deptTickets,
                            domainTickets
                        ] = await Promise.all([
                            user.department ? apiClient.getAssetRequests({ department: user.department, limit: 0 }) : Promise.resolve([]),
                            shouldFetchDomain ? apiClient.getAssetRequests({ domain: user.domain, limit: 0 }) : Promise.resolve([]),
                            apiClient.getAssetRequests({ mine: true, limit: 0 }),
                            user.department ? apiClient.getAssets({ department: user.department, size: 0 }).then(r => r.data || []) : Promise.resolve([]),
                            shouldFetchDomain ? apiClient.getAssets({ domain: user.domain, size: 0 }).then(r => r.data || []) : Promise.resolve([]),
                            apiClient.getMyAssets(), // My assets endpoint usually returns all anyway
                            user.department ? apiClient.getTickets(0, 0, user.department).then(r => r.data || []) : Promise.resolve([]),
                            shouldFetchDomain ? apiClient.getTickets(0, 0, user.domain).then(r => r.data || []) : Promise.resolve([])
                        ]);

                        console.log(`[AssetContext] Dept fetches: reqs=${deptReqs.length}, assets=${deptAssets.length}, tickets=${deptTickets.length}`);
                        console.log(`[AssetContext] Domain fetches: reqs=${domainReqs.length}, assets=${domainAssets.length}, tickets=${domainTickets.length}`);
                        console.log(`[AssetContext] RAW Dept Requests:`, deptReqs);
                        console.log(`[AssetContext] RAW Domain Requests:`, domainReqs);

                        // Merge and deduplicate requests
                        const combinedRequests = [...deptReqs, ...domainReqs, ...myReqs];
                        const seenReqs = new Set();
                        apiAssetRequests = combinedRequests.filter(r => {
                            if (seenReqs.has(r.id)) return false;
                            seenReqs.add(r.id);
                            return true;
                        });

                        console.log(`[AssetContext] MERGED Requests (before mapping): ${apiAssetRequests.length}`, apiAssetRequests);

                        // Assets - Merge and deduplicate
                        const combinedAssets = [...deptAssets, ...domainAssets, ...myAssetsList];
                        const seenAssets = new Set();
                        apiAssets = combinedAssets.filter(a => {
                            if (seenAssets.has(a.id)) return false;
                            seenAssets.add(a.id);
                            return true;
                        });

                        // Tickets - Merge and deduplicate
                        const combinedTickets = [...deptTickets, ...domainTickets];
                        const seenTickets = new Set();
                        apiTickets = combinedTickets.filter(t => {
                            if (seenTickets.has(t.id)) return false;
                            seenTickets.add(t.id);
                            return true;
                        });
                    }
                } else {
                    // Regular Employees only see their OWN requests
                    console.log(`[AssetContext] Fetching for regular employee: ${user?.id}`);
                    apiAssetRequests = await apiClient.getAssetRequests({ mine: true, limit: 0 });
                    apiAssets = await apiClient.getMyAssets();
                    const ticketResponse = await apiClient.getTickets(0, 0);
                    apiTickets = ticketResponse.data || [];
                }

                const mappedAssetRequests = apiAssetRequests.map(r => {
                    const rawStatus = (r.status || '').toUpperCase();
                    let status = rawStatus;
                    if (rawStatus === 'PENDING' || rawStatus === 'SUBMITTED') status = 'REQUESTED';
                    if (rawStatus === 'PROCUREMENT_REQUESTED') status = 'PROCUREMENT_REQUIRED';
                    if (rawStatus === 'IN_USE') status = 'FULFILLED';
                    if (rawStatus === 'MANAGER_REJECTED' || rawStatus === 'IT_REJECTED' || rawStatus === 'PROCUREMENT_REJECTED' || rawStatus === 'USER_REJECTED' || rawStatus === 'BYOD_REJECTED' || rawStatus === 'QC_FAILED') status = 'REJECTED';
                    if (rawStatus === 'PO_UPLOADED') status = 'PROCUREMENT_REQUIRED';
                    if (rawStatus === 'PO_VALIDATED') status = 'PO_VALIDATED';
                    if (rawStatus === 'FINANCE_APPROVED') status = 'PROCUREMENT_REQUIRED';
                    if (rawStatus === 'MANAGER_CONFIRMED_IT') status = 'MANAGER_CONFIRMED_IT';
                    if (rawStatus === 'USER_ACCEPTANCE_PENDING') status = 'USER_ACCEPTANCE_PENDING';
                    if (rawStatus === 'MANAGER_CONFIRMED_ASSIGNMENT') status = 'MANAGER_CONFIRMED_ASSIGNMENT';
                    if (rawStatus === 'BYOD_COMPLIANCE_CHECK') status = 'BYOD_COMPLIANCE_CHECK';

                    // Map procurement_finance_status and status for Finance/Procurement queues and WorkflowProgressBar
                    // Root Fix: Backend is now providing current_owner_role and procurement_finance_status
                    const procurementStage = r.procurement_finance_status || 
                        (r.status === 'FINANCE_APPROVED' ? 'FINANCE_APPROVED' : 
                         (r.status === 'PO_VALIDATED' ? 'PO_VALIDATED' : null));
                    
                    const ownerRole = r.current_owner_role || deriveOwnerRole(status, r.asset_type || r.type || 'Standard', procurementStage);

                    console.log(`[AssetContext] Request ${r.id}: rawStatus=${rawStatus}, mappedStatus=${status}, ownerRole=${ownerRole}`);

                    return {
                        ...r,
                        status: status,
                        assetType: r.asset_type || r.type || 'Standard',
                        justification: r.justification || r.business_justification || r.reason || '',
                        requestedBy: {
                            name: r.requester_name || r.requester_id || 'Employee',
                            email: r.requester_email || '',
                            department: r.requester_department || 'N/A',
                            position: r.requester_position || 'Employee',
                            role: r.requester_role || r.requester_position || 'Employee'
                        },
                        procurementStage: procurementStage,
                        inventoryDecision: r.qc_status === 'PASSED' ? 'AVAILABLE' : (r.qc_status === 'FAILED' ? 'NOT_AVAILABLE' : (['IN_USE', 'FULFILLED', 'USER_ACCEPTANCE_PENDING'].includes(status) ? 'AVAILABLE' : null)),
                        currentOwnerRole: ownerRole,
                        createdAt: r.created_at || r.requested_date
                    };
                });

                console.log(`[AssetContext] MAPPED Requests (after status mapping): ${mappedAssetRequests.length}`, mappedAssetRequests);
                console.log(`[AssetContext] Requests with REQUESTED status:`, mappedAssetRequests.filter(r => r.status === 'REQUESTED'));

                const mappedTickets = apiTickets.map(t => {
                    const rawStatus = (t.status || '').toUpperCase();
                    let status = rawStatus;

                    return {
                        ...t,
                        status: status,
                        assetType: 'Ticket',
                        justification: t.description,
                        requestedBy: {
                            name: t.requestor_name || t.requestor_id || 'Employee',
                            email: ''
                        },
                        currentOwnerRole: t.assignment_group_department 
                            ? (t.assignment_group_department.toUpperCase() === 'IT' ? OWNER_ROLE.IT_MANAGEMENT : t.assignment_group_department.toUpperCase()) 
                            : OWNER_ROLE.IT_MANAGEMENT,
                        createdAt: t.created_at
                    };
                });

                setAssets(apiAssets);
                setRequests(mappedAssetRequests);
                setTickets(mappedTickets);

                // 3) Load exit requests (only for relevant roles)
                if (isAdmin || isAssetStaff || isITStaff) {
                    console.log("[AssetContext] Fetching exit requests for role:", currentRole?.slug);
                    try {
                        const apiExitRequests = await apiClient.getExitRequests();
                        console.log("[AssetContext] Exit requests fetched:", apiExitRequests);
                        setExitRequests(apiExitRequests);
                    } catch (exitErr) {
                        console.error("[AssetContext] Failed to fetch exit requests:", exitErr);
                    }
                } else {
                    console.log("[AssetContext] Skipping exit requests for role:", currentRole?.slug);
                }

            } catch (reqErr) {
                console.warn("Non‑critical: failed to load asset requests or tickets from API:", reqErr);
            }
        } catch (err) {
            console.error("CRITICAL: Failed to fetch data from API:", err);
            setError(err.message);
            if (err.message && (err.message.includes('401') || err.message.toLowerCase().includes('unauthorized'))) {
                apiClient.clearToken();
                if (typeof window !== 'undefined') window.location.href = '/login';
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [authLoading, isAuthenticated, currentRole, user]);

    // ... (keep persisting access token/user if needed, but not assets/requests to avoid conflict) ...

    // --- WORKFLOW FUNCTIONS ---

    // 1. Create Request (End User)
    const createAssetRequest = async (data) => {
        try {
            // Map frontend fields to backend AssetRequestCreate schema
            const payload = {
                asset_name: data.assetName || data.asset_name || `${data.assetType || 'Standard'} Asset`,
                asset_type: (data.assetType || data.asset_type || 'Laptop').toUpperCase(),
                asset_ownership_type: data.assetOwnershipType || data.asset_ownership_type || 'COMPANY_OWNED',
                business_justification: data.business_justification || data.justification || data.reason || 'Standard Provisioning Request',
                asset_model: data.assetModel || data.asset_model || null,
                asset_vendor: data.assetVendor || data.asset_vendor || null,
                serial_number: data.serial_number || data.serialNumber || null,
                os_version: data.os_version || data.osVersion || null,
                cost_estimate: data.cost_estimate || data.costEstimate || null,
                specifications: data.specifications || {}
            };

            const newReq = await apiClient.createAssetRequest(payload);
            toast.success("Asset request successfully transmitted.");
            await loadData(); // Refresh all state
            return newReq;
        } catch (e) {
            console.error("Asset Request Creation Failed:", e);
            toast.error(`Request Failed: ${e.message}`);
            throw e;
        }
    };

    // 1.2 Create Ticket (Support)
    const createTicket = async (ticketData) => {
        try {
            const newTicket = await apiClient.createTicket(ticketData);
            toast.success("Support ticket created successfully.");
            await loadData();
            return newTicket;
        } catch (e) {
            console.error("Ticket Creation Failed:", e);
            toast.error(`Ticket Failed: ${e.message}`);
            throw e;
        }
    };

    // 1.3 Register BYOD (End User)
    const submitByodRequest = async (byodData) => {
        try {
            const payload = {
                asset_name: byodData.device_model || 'BYOD Device',
                asset_type: 'MOBILE', // Default to mobile for BYOD if not specified
                asset_ownership_type: 'BYOD',
                business_justification: byodData.reason || 'BYOD Registration',
                asset_model: byodData.device_model,
                os_version: byodData.os_version,
                serial_number: byodData.serial_number
            };
            
            const newReq = await apiClient.createAssetRequest(payload);
            toast.success("BYOD registration request submitted for approval.");
            await loadData();
            return newReq;
        } catch (e) {
            console.error("BYOD Registration Failed:", e);
            toast.error(`Registration Failed: ${e.message}`);
            throw e;
        }
    };

    // 2. Manager Approve
    const managerApproveRequest = async (reqId) => {
        try {
            // Call API for approval (id inferred from JWT)
            await apiClient.managerApproveRequest(reqId, {});

            setRequests(prev => prev.map(req => {
                if (req.id !== reqId) return req;

                const newAuditEntry = {
                    action: 'MANAGER_APPROVED',
                    byRole: 'MANAGER',
                    byUser: user?.name || 'Manager',
                    timestamp: new Date().toISOString(),
                    comment: `Approved by Manager ${user?.name || ''}`
                };

                return {
                    ...req,
                    status: REQUEST_STATUS.MANAGER_APPROVED,
                    currentOwnerRole: OWNER_ROLE.IT_MANAGEMENT,
                    auditTrail: [...(req.auditTrail || []), newAuditEntry]
                };
            }));
        } catch (e) {
            console.error("Manager Approve Failed:", e);
            toast.error(`Failed to approve: ${e.message}`);
        }
    };

    // 3. Manager Reject
    const managerRejectRequest = async (reqId, reason) => {
        try {
            // Call backend API (manager identity inferred from JWT)
            await apiClient.managerRejectRequest(reqId, {
                reason: reason
            });

            // Only update UI state after successful API call
            setRequests(prev => prev.map(req => {
                if (req.id !== reqId) return req;
                return {
                    ...req,
                    status: REQUEST_STATUS.REJECTED,
                    currentOwnerRole: OWNER_ROLE.END_USER,
                    rejectionReason: reason,
                    auditTrail: [...(req.auditTrail || []), {
                        action: 'REJECTED',
                        byRole: 'MANAGER',
                        byUser: user?.name || 'Manager',
                        timestamp: new Date().toISOString(),
                        comment: `Rejected: ${reason}`
                    }]
                };
            }));

            console.log(`[Manager] ✅ Request ${reqId} successfully rejected`);
        } catch (e) {
            console.error('[Manager] ❌ Failed to reject request:', e);
            toast.error(`Failed to reject request: ${e.message}`);
        }
    };

    // 3.2. Manager Confirm IT Decision
    const managerConfirmIT = async (reqId, decision, reason) => {
        try {
            await apiClient.managerConfirmIT(reqId, { decision, reason });

            // Refresh data to get latest status and owner from backend
            await loadData();

            console.log(`[Manager] ✅ IT Decision confirmed for request ${reqId}`);
        } catch (e) {
            console.error('[Manager] ❌ Failed to confirm IT decision:', e);
            toast.error(`Failed: ${e.message}`);
        }
    };

    // 3.4. Manager Confirm Budget
    const managerConfirmBudget = async (reqId, decision, reason) => {
        try {
            await apiClient.managerConfirmBudget(reqId, { decision, reason });
            await loadData();
        } catch (e) {
            console.error('[Manager] ❌ Failed to confirm budget:', e);
            toast.error(`Failed: ${e.message}`);
        }
    };

    // 3.6. Manager Confirm Assignment
    const managerConfirmAssignment = async (reqId, decision, reason) => {
        try {
            await apiClient.managerConfirmAssignment(reqId, { decision, reason });
            await loadData();
        } catch (e) {
            console.error('[Manager] ❌ Failed to confirm assignment:', e);
            toast.error(`Failed: ${e.message}`);
        }
    };


    // 4. IT Management Approve (Handles BYOD & Standard)
    const itApproveRequest = async (reqId, approvalNotes) => {
        try {
            await apiClient.itApproveRequest(reqId, {
                approval_comment: approvalNotes || 'Approved by IT'
            });

            setRequests(prev => prev.map(req => {
                if (req.id !== reqId) return req;

                const isBYOD = req.assetType === 'BYOD';
                const newStatus = REQUEST_STATUS.IT_APPROVED;
                const newOwner = deriveOwnerRole(newStatus, req.assetType);
                const actionLabel = 'IT_APPROVED';
                const comment = isBYOD ? 'Approved for BYOD Compliance Review' : 'Approved for Inventory Check';

                const newAuditEntry = {
                    action: actionLabel,
                    byRole: 'IT_MANAGEMENT',
                    byUser: user?.name || 'IT Manager',
                    timestamp: new Date().toISOString(),
                    comment: comment
                };

                return {
                    ...req,
                    status: newStatus,
                    currentOwnerRole: newOwner,
                    auditTrail: [...(req.auditTrail || []), newAuditEntry],
                    timeline: [...(req.timeline || []), { role: 'IT_MANAGEMENT', action: actionLabel, timestamp: new Date().toISOString(), comment: comment }]
                };
            }));
        } catch (e) {
            console.error("IT Approve Failed:", e);
            toast.error(`Failed IT approval: ${e.message}`);
        }
    };

    // 4.5. Register BYOD (IT Management)
    const registerByod = async (reqId) => {
        try {
            const req = requests.find(r => r.id === reqId);
            const payload = {
                device_model: req.asset_model || 'Unknown Model',
                os_version: req.os_version || 'Unknown OS',
                serial_number: req.serial_number || 'Unknown Serial'
            };

            const updated = await apiClient.byodRegister(reqId, payload);

            setRequests(prev => prev.map(r => {
                if (r.id !== reqId) return r;

                const newStatus = (updated?.status || r.status) === 'IN_USE' ? REQUEST_STATUS.FULFILLED : (updated?.status || r.status);
                const newAuditEntry = {
                    action: 'BYOD_REGISTERED',
                    byRole: 'IT_MANAGEMENT',
                    byUser: user?.name || 'IT Manager',
                    timestamp: new Date().toISOString(),
                    comment: `BYOD Device Registered & Validated`
                };

                return {
                    ...r,
                    ...updated,
                    status: newStatus,
                    currentOwnerRole: newStatus === REQUEST_STATUS.FULFILLED ? OWNER_ROLE.END_USER : r.currentOwnerRole,
                    auditTrail: [...(r.auditTrail || []), newAuditEntry],
                    timeline: [...(r.timeline || []), { role: 'IT_MANAGEMENT', action: 'BYOD_REGISTERED', timestamp: new Date().toISOString(), comment: 'BYOD Device Live' }]
                };
            }));

            // Refresh asset list so the new BYOD device appears in "My Assets"
            try {
                const assetResponse = await apiClient.getAssets();
                const refreshedAssets = assetResponse.data || [];
                setAssets(refreshedAssets);
            } catch (assetErr) {
                console.warn("Could not refresh assets after BYOD registration:", assetErr);
            }
        } catch (e) {
            console.error("BYOD Registration Failed:", e);
            toast.error(`Registration failed: ${e.message}`);
        }
    };

    // 5. IT Management Reject
    const itRejectRequest = async (reqId, reason) => {
        try {
            await apiClient.itRejectRequest(reqId, {
                reason: reason
            });

            setRequests(prev => prev.map(req => {
                if (req.id !== reqId) return req;

                const newAuditEntry = {
                    action: 'REJECTED',
                    byRole: 'IT_MANAGEMENT',
                    byUser: user?.name || 'IT Manager',
                    timestamp: new Date().toISOString(),
                    comment: `IT Rejected: ${reason}`
                };

                return {
                    ...req,
                    status: REQUEST_STATUS.REJECTED,
                    currentOwnerRole: OWNER_ROLE.END_USER,
                    rejectionReason: reason,
                    auditTrail: [...(req.auditTrail || []), newAuditEntry],
                    timeline: [...(req.timeline || []), { role: 'IT_MANAGEMENT', action: 'REJECTED', timestamp: new Date().toISOString(), comment: `Rejected: ${reason}` }]
                };
            }));
        } catch (e) {
            console.error("IT Reject Failed:", e);
            toast.error(`Failed IT rejection: ${e.message}`);
        }
    };

    // 6. Inventory - Asset Available (allocate directly)
    const inventoryCheckAvailable = async (reqId, allocatedAssetId) => {
        console.log(`[Inventory] Starting allocation for request ${reqId}, asset ${allocatedAssetId}`);
        try {
            // 1. Validate asset exists first
            console.log(`[Inventory] Step 1: Validating asset ${allocatedAssetId}...`);
            try {
                await apiClient.getAsset(allocatedAssetId);
                console.log(`[Inventory] Asset ${allocatedAssetId} found in database`);
            } catch (err) {
                console.error(`[Inventory] Asset validation failed:`, err);
                toast.error(`Error: Asset "${allocatedAssetId}" not found in database. Please enter a valid Asset ID.`);
                return;
            }

            // 2. Find the request
            console.log(`[Inventory] Step 2: Finding request ${reqId}...`);
            const targetRequest = requests.find(r => r.id === reqId);
            if (!targetRequest) {
                console.error(`[Inventory] Request ${reqId} not found in requests array`);
                toast.error("Error: Request not found.");
                return;
            }
            console.log(`[Inventory] Request found. Assigning to ${targetRequest.requestedBy.name}`);

            // 3. Call backend API (id inferred from JWT)
            console.log(`[Inventory] Step 3: Calling backend API...`);
            try {
                await apiClient.inventoryAllocateAsset(reqId, allocatedAssetId);
                console.log(`[Inventory] Backend allocation successful`);
            } catch (apiError) {
                console.error(`[Inventory] Backend API call failed:`, apiError);
                toast.error(`Failed to persist allocation to database: ${apiError.message}`);
                return;
            }

            // 4. Update local state (this will be refreshed from backend on next load)
            console.log(`[Inventory] Step 4: Updating local state...`);
            setRequests(prev => {
                const updated = prev.map(req => {
                    if (req.id !== reqId) return req;

                    const newAuditEntry = {
                        action: 'ALLOCATED',
                        byRole: 'ASSET_INVENTORY_MANAGER',
                        byUser: user?.name || 'Inventory Manager',
                        timestamp: new Date().toISOString(),
                        comment: `Allocated Asset ID: ${allocatedAssetId}`
                    };

                    console.log(`[Inventory] Updating request ${reqId} from ${req.status} to FULFILLED`);
                    return {
                        ...req,
                        inventoryDecision: 'AVAILABLE',
                        allocatedAssetId: allocatedAssetId,
                        status: REQUEST_STATUS.FULFILLED,
                        currentOwnerRole: OWNER_ROLE.END_USER,
                        auditTrail: [...(req.auditTrail || []), newAuditEntry],
                        timeline: [...(req.timeline || []), { role: 'INVENTORY', action: 'ALLOCATED', timestamp: new Date().toISOString(), comment: `Allocated: ${allocatedAssetId}` }]
                    };
                });
                console.log(`[Inventory] Request state updated`);
                return updated;
            });

            console.log(`[Inventory] ✅ Asset allocated. Request ${reqId} status changed to FULFILLED`);

            // Refresh assets list to show newly assigned asset
            try {
                const assetResponse = await apiClient.getAssets();
                const refreshedAssets = assetResponse.data || [];
                setAssets(refreshedAssets);
            } catch (assetErr) {
                console.warn("[Inventory] Could not refresh assets after allocation:", assetErr);
            }

            toast.success(`Asset ${allocatedAssetId} successfully allocated!`);
        } catch (e) {
            console.error("[Inventory] ❌ Inventory Check Available Failed:", e);
            toast.error(`Failed to allocate asset: ${e.message}`);
        }
    };

    // 7. Inventory - Asset Not Available (route to procurement)
    const inventoryCheckNotAvailable = async (reqId) => {
        console.log(`[Inventory] Marking request ${reqId} as Not Available`);
        try {
            // 1. Call backend API (id inferred from JWT)
            console.log(`[Inventory] Step 1: Calling backend API...`);
            try {
                await apiClient.inventoryMarkNotAvailable(reqId);
                console.log(`[Inventory] Backend update successful`);
            } catch (apiError) {
                console.error(`[Inventory] Backend API call failed:`, apiError);
                toast.error(`Failed to route to procurement: ${apiError.message}`);
                return;
            }

            // 2. Update local state
            console.log(`[Inventory] Step 2: Updating local state...`);
            setRequests(prev => prev.map(req => {
                if (req.id !== reqId) return req;

                const newAuditEntry = {
                    action: 'PROCUREMENT_REQUIRED',
                    byRole: 'ASSET_INVENTORY_MANAGER',
                    byUser: user?.name || 'Inventory Manager',
                    timestamp: new Date().toISOString(),
                    comment: 'Stock unavailable, routed to procurement'
                };

                return {
                    ...req,
                    inventoryDecision: 'NOT_AVAILABLE',
                    status: REQUEST_STATUS.PROCUREMENT_REQUIRED,
                    currentOwnerRole: OWNER_ROLE.PROCUREMENT,
                    procurementStage: 'AWAITING_DECISION',
                    auditTrail: [...(req.auditTrail || []), newAuditEntry],
                    timeline: [...(req.timeline || []), { role: 'INVENTORY', action: 'PROCUREMENT_REQ', timestamp: new Date().toISOString(), comment: 'Routed to Procurement' }]
                };
            }));
            console.log(`[Inventory] ✅ Request ${reqId} successfully routed to Procurement`);
            toast.success("Request successfully routed to Procurement for purchasing.");
        } catch (e) {
            console.error("[Inventory] ❌ Inventory Check Not Available Failed:", e);
            toast.error(`Failed to route to procurement: ${e.message}`);
        }
    };

    // 8. Procurement - Decision (approve → Finance, reject → End User)
    const procurementApprove = async (reqId, poNumber) => {
        try {
            const poId = poNumber || `PO-${Math.floor(Math.random() * 10000)}`;

            // Call backend API (id inferred from JWT)
            await apiClient.procurementApproveRequest(reqId, {
                po_number: poId
            });

            // Update local state to reflect the change immediately
            setRequests(prev => prev.map(req => {
                if (req.id !== reqId) return req;
                return {
                    ...req,
                    procurementStage: 'PO_CREATED',
                    poNumber: poId,
                    currentOwnerRole: OWNER_ROLE.FINANCE,
                    status: REQUEST_STATUS.PROCUREMENT_REQUIRED,
                    auditTrail: [...(req.auditTrail || []), {
                        action: 'PROCUREMENT_APPROVED',
                        byRole: 'PROCUREMENT',
                        byUser: user?.name || 'Procurement Officer',
                        timestamp: new Date().toISOString(),
                        comment: `PO ${poId} created and sent to Finance`
                    }],
                    timeline: [
                        ...(req.timeline || []),
                        { role: 'PROCUREMENT', action: 'PO_CREATED', timestamp: new Date().toISOString(), comment: `PO ${poId} created by ${user?.name || 'Procurement Officer'}` }
                    ]
                };
            }));

            console.log(`[Procurement] ✅ Request ${reqId} approved with PO ${poId}`);
        } catch (error) {
            console.error('[Procurement] ❌ Failed to approve request:', error);
            toast.error(`Failed to approve request: ${error.message}`);
        }
    };


    // 8.5. Procurement - Upload PO (Automated Extraction)
    const procurementUploadPO = async (reqId, file) => {
        try {
            console.log(`[Procurement] Uploading PO for request ${reqId}...`);
            const response = await apiClient.uploadPO(reqId, file);
            console.log(`[Procurement] PO Upload Response:`, response);

            // Immediately validate/approve the PO so it routes to Finance
            // (button says "Approve & Upload PO" - upload + approve is a single step)
            try {
                await apiClient.procurementApproveRequest(reqId);
                console.log(`[Procurement] PO auto-approved for request ${reqId}`);
            } catch (approveError) {
                console.warn(`[Procurement] Auto-approve failed (PO uploaded, manual review may be needed):`, approveError);
            }

            // Refresh data to reflect status changes
            loadData();

            return response;

        } catch (error) {
            console.error('[Procurement] ❌ PO Upload Failed:', error);
            toast.error(`PO Upload Failed: ${error.message}`);
            throw error;
        }
    };

    const procurementReject = async (reqId, reason) => {
        try {
            // Call backend API (id inferred from JWT)
            await apiClient.procurementRejectRequest(reqId, {
                reason: reason
            });

            // Update local state to reflect the change immediately
            setRequests(prev => prev.map(req => {
                if (req.id !== reqId) return req;
                return {
                    ...req,
                    status: REQUEST_STATUS.REJECTED,
                    currentOwnerRole: OWNER_ROLE.END_USER,
                    rejectionReason: reason,
                    procurementStage: 'REJECTED',
                    auditTrail: [...(req.auditTrail || []), {
                        action: 'PROCUREMENT_REJECTED',
                        byRole: 'PROCUREMENT',
                        byUser: user?.name || 'Procurement Officer',
                        timestamp: new Date().toISOString(),
                        comment: `Rejected: ${reason}`
                    }],
                    timeline: [...(req.timeline || []), { role: 'PROCUREMENT', action: 'REJECTED', timestamp: new Date().toISOString(), comment: `Rejected: ${reason}` }]
                };
            }));

            console.log(`[Procurement] ✅ Request ${reqId} successfully rejected`);
        } catch (error) {
            console.error('[Procurement] ❌ Failed to reject request:', error);
            toast.error(`Failed to reject request: ${error.message}`);
        }
    };

    // 9. Procurement - Create PO (legacy entry point, routes to Finance)
    const procurementCreatePO = (reqId, poNumber) => {
        setRequests(prev => prev.map(req => {
            if (req.id !== reqId) return req;
            return {
                ...req,
                procurementStage: 'PO_CREATED',
                poNumber: poNumber,
                currentOwnerRole: OWNER_ROLE.FINANCE,
                timeline: [
                    ...(req.timeline || []),
                    { role: 'PROCUREMENT', action: 'PO_CREATED', timestamp: new Date().toISOString(), comment: `PO ${poNumber} created by ${user?.name || 'Procurement Officer'}` }
                ],
                auditTrail: [...(req.auditTrail || []), {
                    action: 'PROCUREMENT_APPROVED',
                    byRole: 'PROCUREMENT',
                    byUser: user?.name || 'Procurement Officer',
                    timestamp: new Date().toISOString(),
                    comment: `PO ${poNumber} created and sent to Finance`
                }]
            };
        }));
    };

    // 9. Finance - Approve Budget
    const financeApprove = async (reqId, financeName) => {
        try {
            await apiClient.financeApproveRequest(reqId);

            setRequests(prev => prev.map(req => {
                if (req.id !== reqId) return req;
                return {
                    ...req,
                    procurementStage: 'FINANCE_APPROVED',
                    currentOwnerRole: OWNER_ROLE.PROCUREMENT,
                    timeline: [
                        ...(req.timeline || []),
                        { role: 'FINANCE', action: 'BUDGET_APPROVED', timestamp: new Date().toISOString(), comment: `Budget approved by ${financeName}` }
                    ],
                    auditTrail: [
                        ...(req.auditTrail || []),
                        {
                            action: 'FINANCE_APPROVED',
                            byRole: 'FINANCE',
                            byUser: financeName,
                            timestamp: new Date().toISOString(),
                            comment: 'Budget approved'
                        }
                    ]
                };
            }));
        } catch (e) {
            console.error("Finance Approve Failed:", e);
            toast.error(`Failed to approve budget: ${e.message}`);
        }
    };

    // 10. Finance - Reject
    const financeReject = async (reqId, reason, financeName) => {
        try {
            await apiClient.financeRejectRequest(reqId, { reason });

            setRequests(prev => prev.map(req => {
                if (req.id !== reqId) return req;
                return {
                    ...req,
                    status: REQUEST_STATUS.REJECTED,
                    currentOwnerRole: OWNER_ROLE.END_USER,
                    rejectionReason: reason,
                    procurementStage: 'FINANCE_REJECTED',
                    timeline: [
                        ...(req.timeline || []),
                        { role: 'FINANCE', action: 'BUDGET_REJECTED', timestamp: new Date().toISOString(), comment: `Budget rejected by ${financeName}: ${reason}` }
                    ],
                    auditTrail: [
                        ...(req.auditTrail || []),
                        {
                            action: 'FINANCE_REJECTED',
                            byRole: 'FINANCE',
                            byUser: financeName,
                            timestamp: new Date().toISOString(),
                            comment: `Budget rejected: ${reason}`
                        }
                    ]
                };
            }));
        } catch (e) {
            console.error("Finance Reject Failed:", e);
            toast.error(`Failed to reject budget: ${e.message}`);
        }
    };

    // 11. Procurement - Confirm Delivery
    const procurementConfirmDelivery = async (reqId, payload) => {
        console.log(`[Procurement] Confirming delivery for request ${reqId}`, payload);
        try {
            // 1. Call backend API
            await apiClient.procurementConfirmDelivery(reqId, payload);
            console.log(`[Procurement] Backend delivery confirmation successful`);

            // 2. Update local state
            setRequests(prev => prev.map(req => {
                if (req.id !== reqId) return req;
                return {
                    ...req,
                    status: 'QC_PENDING',
                    procurementStage: 'DELIVERED',
                    currentOwnerRole: OWNER_ROLE.ASSET_INVENTORY_MANAGER,
                    asset_name: payload.asset_name,
                    asset_model: payload.asset_model,
                    serial_number: payload.serial_number,
                    timeline: [
                        ...(req.timeline || []),
                        { role: 'PROCUREMENT', action: 'DELIVERY_CONFIRMED', timestamp: new Date().toISOString(), comment: `Asset delivered - Serial: ${payload.serial_number}` }
                    ]
                };
            }));

            // Refresh assets list so the new asset appears in "In Stock" for Inventory Manager
            try {
                const assetResponse = await apiClient.getAssets();
                const refreshedAssets = assetResponse.data || [];
                setAssets(refreshedAssets);
            } catch (assetErr) {
                console.warn("[Procurement] Could not refresh assets after delivery confirmation:", assetErr);
            }

            toast.success("Delivery confirmed! Request moved back to Inventory for allocation.");
        } catch (e) {
            console.error("[Procurement] Delivery Confirmation Failed:", e);
            toast.error(`Failed to confirm delivery: ${e.message}`);
        }
    };

    // 13. Quality Control (QC)
    const performQC = async (reqId, qcStatus, notes) => {
        try {
            await apiClient.performQC(reqId, {
                qc_status: qcStatus,
                qc_notes: notes
            });

            setRequests(prev => prev.map(req => {
                if (req.id !== reqId) return req;
                const nextStatus = qcStatus === 'PASSED' ? REQUEST_STATUS.USER_ACCEPTANCE_PENDING : 'QC_FAILED';
                const nextOwner = qcStatus === 'PASSED' ? OWNER_ROLE.END_USER : OWNER_ROLE.ASSET_INVENTORY_MANAGER;

                return {
                    ...req,
                    status: nextStatus,
                    currentOwnerRole: nextOwner,
                    qc_status: qcStatus,
                    qc_notes: notes,
                    timeline: [
                        ...(req.timeline || []),
                        { role: 'INVENTORY', action: `QC_${qcStatus}`, timestamp: new Date().toISOString(), comment: `QC ${qcStatus}: ${notes}` }
                    ]
                };
            }));
        } catch (e) {
            console.error("QC Performance Failed:", e);
            toast.error(`Failed to submit QC: ${e.message}`);
        }
    };

    // 14. User Acceptance
    const userAcceptAsset = async (reqId) => {
        try {
            await apiClient.userAcceptAsset(reqId);
            setRequests(prev => prev.map(req => {
                if (req.id !== reqId) return req;
                return {
                    ...req,
                    status: REQUEST_STATUS.FULFILLED,
                    currentOwnerRole: OWNER_ROLE.END_USER,
                    user_acceptance_status: 'ACCEPTED',
                    user_accepted_at: new Date().toISOString(),
                    timeline: [
                        ...(req.timeline || []),
                        { role: 'END_USER', action: 'ACCEPTED', timestamp: new Date().toISOString(), comment: 'Asset accepted by user' }
                    ]
                };
            }));
            toast.success("Asset successfully accepted and fulfilled!");
        } catch (e) {
            console.error("User Acceptance Failed:", e);
            toast.error(`Failed to accept asset: ${e.message}`);
        }
    };

    // 12. Inventory - Final Allocation (after procurement)
    const inventoryAllocateDelivered = async (reqId, allocatedAssetId, inventoryManagerName) => {
        console.log(`[Inventory] Final allocation for request ${reqId} with asset ${allocatedAssetId}`);
        try {
            // 1. Validate asset exists
            try {
                await apiClient.getAsset(allocatedAssetId);
            } catch (err) {
                toast.error(`Error: Asset "${allocatedAssetId}" not found in database. Please enter a valid Asset ID.`);
                return;
            }

            // 2. Perform assignment & Update backend
            console.log(`[Inventory] Step 2: Calling backend API...`);
            try {
                await apiClient.inventoryAllocateAsset(reqId, allocatedAssetId, user?.id || 'inventory-manager');
                console.log(`[Inventory] Backend allocation successful`);
            } catch (apiError) {
                console.error(`[Inventory] Backend API call failed:`, apiError);
                toast.error(`Failed to allocate asset: ${apiError.message}`);
                return;
            }

            // 3. Update local state
            setRequests(prev => prev.map(req => {
                if (req.id !== reqId) return req;
                return {
                    ...req,
                    allocatedAssetId: allocatedAssetId,
                    status: REQUEST_STATUS.USER_ACCEPTANCE_PENDING,
                    currentOwnerRole: OWNER_ROLE.END_USER,
                    timeline: [
                        ...(req.timeline || []),
                        { role: 'INVENTORY', action: 'ALLOCATED', timestamp: new Date().toISOString(), comment: `Asset allocated by ${inventoryManagerName} - Asset ID: ${allocatedAssetId}` }
                    ]
                };
            }));

            // Refresh assets list to show newly assigned asset
            try {
                const assetResponse = await apiClient.getAssets();
                const refreshedAssets = assetResponse.data || [];
                setAssets(refreshedAssets);
            } catch (assetErr) {
                console.warn("[Inventory] Could not refresh assets after final allocation:", assetErr);
            }

            toast.success(`Asset ${allocatedAssetId} successfully allocated and fulfilled!`);
        } catch (e) {
            console.error("Inventory Allocate Delivered Failed:", e);
            toast.error(`Failed to allocate delivered asset: ${e.message}`);
        }
    };

    // --- EXIT WORKFLOW FUNCTIONS ---
    const processExitAssets = async (requestId) => {
        try {
            await apiClient.processExitAssets(requestId);
            setExitRequests(prev => prev.map(req =>
                req.id === requestId ? { ...req, status: 'ASSETS_PROCESSED' } : req
            ));
            // Refresh assets because they were returned to stock
            const assetResponse = await apiClient.getAssets();
            const refreshedAssets = assetResponse.data || [];
            setAssets(refreshedAssets);
        } catch (e) {
            console.error("Failed to process exit assets:", e);
            throw e;
        }
    };

    const processExitByod = async (requestId) => {
        try {
            await apiClient.processExitByod(requestId);
            setExitRequests(prev => prev.map(req =>
                req.id === requestId ? { ...req, status: 'BYOD_PROCESSED' } : req
            ));
        } catch (e) {
            console.error("Failed to process exit BYOD:", e);
            throw e;
        }
    };

    // --- Asset Management Functions ---
    const updateAssetStatus = async (assetId, newStatus) => {
        try {
            await apiClient.updateAssetStatus(assetId, newStatus);
            setAssets(prev => prev.map(a => a.id === assetId ? { ...a, status: newStatus } : a));
        } catch (e) {
            console.error("Failed to update asset status:", e);
            throw e;
        }
    };

    const assignAsset = async (assetId, userName, userId) => {
        try {
            await apiClient.assignAsset(assetId, {
                assigned_to: userName,
                assigned_to_id: userId || userName
            });
            setAssets(prev => prev.map(a =>
                a.id === assetId ? { ...a, assigned_to: userName, status: ASSET_STATUS.IN_USE } : a
            ));
        } catch (e) {
            console.error("Failed to assign asset:", e);
            throw e;
        }
    };

    // Update entire asset (for verificationStatus, etc.)
    const updateAsset = async (assetId, updates) => {
        try {
            const updated = await apiClient.updateAsset(assetId, updates);
            setAssets(prev => prev.map(a =>
                a.id === assetId ? { ...updated } : a
            ));
        } catch (e) {
            console.error("Failed to update asset:", e);
            throw e;
        }
    };

    return (
        <AssetContext.Provider value={{
            assets,
            requests,
            incomingRequests,
            activeTickets,
            submitByodRequest,
            createAssetRequest,
            createTicket,
            itApproveRequest,
            itRejectRequest,
            registerByod,
            inventoryCheckAvailable,
            inventoryCheckNotAvailable,
            procurementCreatePO,
            procurementApprove,
            procurementReject,
            procurementUploadPO,
            financeApprove,
            financeReject,
            procurementConfirmDelivery,
            inventoryAllocateDelivered,
            performQC,
            userAcceptAsset,
            updateAssetStatus,
            assignAsset,
            updateAsset,
            exitRequests,
            processExitAssets,
            processExitByod,
            tickets,
            refreshData: loadData,
            // Manager Confirmations
            managerConfirmIT,
            managerConfirmBudget,
            managerConfirmAssignment,
            // Backward compatibility
            managerApproveRequest,
            managerRejectRequest,
            approveRequest: itApproveRequest,
            rejectRequest: itRejectRequest,
            fulfillRequest: inventoryCheckAvailable
        }}>
            {children}
        </AssetContext.Provider>
    );
}

export function useAssetContext() {
    return useContext(AssetContext);
}
