import { createContext, useContext, useState, useEffect } from 'react';
import apiClient from '@/lib/apiClient';
import { useRole } from '@/contexts/RoleContext';

// --- ENTERPRISE ASSET REQUEST FLOW ---

export const ASSET_STATUS = {
    IN_USE: 'In Use',
    AVAILABLE: 'Available',
    RETIRED: 'Retired',
    MAINTENANCE: 'Maintenance',
    DISCOVERED: 'Discovered'
};

export const OWNER_ROLE = {
    END_USER: 'END_USER',
    MANAGER: 'MANAGER',
    IT_MANAGEMENT: 'IT_MANAGEMENT',
    ASSET_INVENTORY_MANAGER: 'ASSET_INVENTORY_MANAGER',
    PROCUREMENT: 'PROCUREMENT',
    FINANCE: 'FINANCE',
    PROCUREMENT_FINANCE: 'PROCUREMENT_FINANCE', // legacy fallback
    SYSTEM_ADMIN: 'SYSTEM_ADMIN'
};

export const REQUEST_STATUS = {
    REQUESTED: 'REQUESTED',
    MANAGER_APPROVED: 'MANAGER_APPROVED',
    IT_APPROVED: 'IT_APPROVED',
    INVENTORY_APPROVED: 'INVENTORY_APPROVED',
    REJECTED: 'REJECTED',
    PROCUREMENT_REQUIRED: 'PROCUREMENT_REQUIRED',
    QC_PENDING: 'QC_PENDING',
    FULFILLED: 'FULFILLED',
    CLOSED: 'CLOSED'
};

const AssetContext = createContext();

export function AssetProvider({ children }) {
    const [assets, setAssets] = useState([]);
    const [requests, setRequests] = useState([]);
    const [exitRequests, setExitRequests] = useState([]);
    const [loading, setLoading] = useState(true);

    // --- Persistence ---
    const [error, setError] = useState(null);

    // --- Persistence & API Integration ---
    const deriveOwnerRole = (status, assetType, procurementStage) => {
        switch (status) {
            case REQUEST_STATUS.REQUESTED: return OWNER_ROLE.MANAGER;
            case REQUEST_STATUS.MANAGER_APPROVED: return OWNER_ROLE.IT_MANAGEMENT;
            case REQUEST_STATUS.IT_APPROVED:
                return assetType === 'BYOD' ? OWNER_ROLE.IT_MANAGEMENT : OWNER_ROLE.ASSET_INVENTORY_MANAGER;
            case REQUEST_STATUS.PROCUREMENT_REQUIRED:
                if (procurementStage === 'PO_CREATED' || procurementStage === 'PO_UPLOADED') return OWNER_ROLE.FINANCE;
                if (procurementStage === 'FINANCE_APPROVED') return OWNER_ROLE.PROCUREMENT; // Back to procurement for delivery
                return OWNER_ROLE.PROCUREMENT; // Default to procurement for initial PO creation
            case 'PROCUREMENT_APPROVED': return OWNER_ROLE.PROCUREMENT;
            case 'QC_PENDING': return OWNER_ROLE.ASSET_INVENTORY_MANAGER;
            case REQUEST_STATUS.FULFILLED: return OWNER_ROLE.END_USER;
            case REQUEST_STATUS.REJECTED: return OWNER_ROLE.END_USER;
            default: return OWNER_ROLE.IT_MANAGEMENT;
        }
    };

    // Persistence for Demo/Fallback mode
    useEffect(() => {
        if (requests.length > 0) {
            localStorage.setItem('enterprise_requests', JSON.stringify(requests));
        }
    }, [requests]);

    const { isAuthenticated, isLoading: authLoading, user, currentRole } = useRole();

    const loadData = async () => {
        if (authLoading || !isAuthenticated) return;

        try {
            setLoading(true);
            // 1) Load assets (critical for UI)
            try {
                const apiAssets = await apiClient.getAssets();
                setAssets(apiAssets);
                setError(null);
            } catch (assetErr) {
                console.error("CRITICAL: Failed to fetch assets from API:", assetErr);
                setError(assetErr.message);
                setAssets([]);
            }

            // 2) Load asset requests & tickets
            try {
                let apiAssetRequests = [];
                let apiTickets = [];

                // Domain-based filtering logic
                if (currentRole?.slug === 'ADMIN' ||
                    currentRole?.slug === 'ASSET_MANAGER' ||
                    currentRole?.slug === 'FINANCE' ||
                    currentRole?.slug === 'IT_MANAGEMENT'
                ) {
                    // Admin-level/Centralized roles see EVERYTHING
                    apiAssetRequests = await apiClient.getAssetRequests();
                    apiTickets = await apiClient.getTickets();
                } else if (user?.position === 'MANAGER' && user?.domain) {
                    // Managers see their DOMAIN'S requests + their OWN requests
                    const domainRequests = await apiClient.getAssetRequests({ domain: user.domain });
                    const myRequests = await apiClient.getAssetRequests({ requester_id: user.id });

                    // Merge and deduplicate
                    const combinedAssets = [...domainRequests, ...myRequests];
                    const seenAssets = new Set();
                    apiAssetRequests = combinedAssets.filter(r => {
                        if (seenAssets.has(r.id)) return false;
                        seenAssets.add(r.id);
                        return true;
                    });

                    // For tickets, managers only see their own
                    apiTickets = await apiClient.getTickets({ requestor_id: user.id });
                } else {
                    // Regular Employees only see their OWN requests
                    apiAssetRequests = await apiClient.getAssetRequests({ requester_id: user?.id });
                    apiTickets = await apiClient.getTickets({ requestor_id: user?.id });
                }

                const mappedAssetRequests = apiAssetRequests.map(r => {
                    const rawStatus = (r.status || '').toUpperCase();
                    let status = rawStatus;
                    if (rawStatus === 'PENDING' || rawStatus === 'SUBMITTED') status = 'REQUESTED';
                    if (rawStatus === 'PROCUREMENT_REQUESTED') status = 'PROCUREMENT_REQUIRED';
                    if (rawStatus === 'IN_USE') status = 'FULFILLED';
                    if (rawStatus === 'MANAGER_REJECTED' || rawStatus === 'IT_REJECTED' || rawStatus === 'PROCUREMENT_REJECTED' || rawStatus === 'USER_REJECTED') status = 'REJECTED';

                    const procurementStage = r.procurement_finance_status === 'APPROVED' ? 'FINANCE_APPROVED' : (r.procurement_finance_status || 'AWAITING_DECISION');

                    return {
                        ...r,
                        status: status,
                        assetType: r.asset_type || r.type || 'Standard',
                        justification: r.justification || r.business_justification || '',
                        requestedBy: {
                            name: r.requester_name || r.requester_id || 'Employee',
                            email: r.requester_email || ''
                        },
                        procurementStage: procurementStage,
                        currentOwnerRole: deriveOwnerRole(status, r.asset_type || r.type || 'Standard', procurementStage),
                        createdAt: r.created_at || r.requested_date
                    };
                });

                const mappedTickets = apiTickets.map(t => {
                    const rawStatus = (t.status || '').toUpperCase();
                    let status = rawStatus;
                    if (rawStatus === 'OPEN') status = 'REQUESTED';

                    return {
                        ...t,
                        status: status,
                        assetType: 'Ticket',
                        justification: t.description,
                        requestedBy: {
                            name: t.requestor_name || t.requestor_id || 'Employee',
                            email: ''
                        },
                        currentOwnerRole: OWNER_ROLE.IT_MANAGEMENT,
                        createdAt: t.created_at
                    };
                });

                setRequests([...mappedAssetRequests, ...mappedTickets]);

                // 3) Load exit requests (only for relevant roles)
                if (currentRole?.slug === 'ADMIN' ||
                    currentRole?.slug === 'ASSET_MANAGER' ||
                    currentRole?.slug === 'IT_MANAGEMENT' ||
                    currentRole?.slug === 'ASSET_INVENTORY_MANAGER'
                ) {
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

                if (typeof window !== 'undefined') localStorage.removeItem('enterprise_requests');
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
    const createRequest = async (data) => {
        try {
            // Frontend 'justification' -> Backend 'reason'
            // Frontend 'assetType' -> Backend 'type'
            const payload = {
                requester_id: data.requester_id || data.requestedBy?.id || '1',
                asset_name: data.assetName || `${data.assetType} Asset`,
                asset_type: (data.assetType || 'Laptop').toUpperCase(),
                asset_ownership_type: data.assetOwnershipType || data.ownershipType || 'COMPANY_OWNED',
                asset_model: data.deviceDetails?.model || data.assetModel || null,
                serial_number: data.deviceDetails?.serial || data.serialNumber || null,
                os_version: data.deviceDetails?.os || data.osVersion || null,
                justification: data.justification,
                business_justification: data.deviceDetails
                    ? `${data.justification || 'BYOD Registration'}\n\nDevice Details:\n- Model: ${data.deviceDetails.model}\n- OS: ${data.deviceDetails.os}\n- Serial: ${data.deviceDetails.serial}`
                    : (data.businessJustification || data.justification),
                cost_estimate: data.costEstimate || null
            };

            const newReq = await apiClient.createAssetRequest(payload);

            // Optimistic update
            const mappedReq = {
                ...newReq,
                assetType: newReq.type,
                justification: newReq.reason,
                requestedBy: data.requestedBy,
                currentOwnerRole: OWNER_ROLE.MANAGER,
                createdAt: new Date().toISOString()
            };

            setRequests(prev => [mappedReq, ...prev]);
            return mappedReq;
        } catch (e) {
            console.warn("API Create Request Failed - Using Local Fallback", e);

            // No local fallback - throw error
            throw e;
        }
    };

    // 2. Manager Approve
    const managerApproveRequest = async (reqId, managerId, managerName) => {
        try {
            // Call API for approval
            await apiClient.managerApproveRequest(reqId, {
                manager_id: managerId,
                approval_comment: `Approved by ${managerName}`
            });

            setRequests(prev => prev.map(req => {
                if (req.id !== reqId) return req;

                const newAuditEntry = {
                    action: 'MANAGER_APPROVED',
                    byRole: 'MANAGER',
                    byUser: managerName,
                    timestamp: new Date().toISOString(),
                    comment: `Approved by Manager ${managerName}`
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
            alert(`Failed to approve: ${e.message}`);
        }
    };

    // 3. Manager Reject
    const managerRejectRequest = async (reqId, reason, managerId, managerName) => {
        try {
            // Call backend API first to persist the rejection
            await apiClient.managerRejectRequest(reqId, {
                manager_id: managerId,
                reason: reason  // Changed from rejection_reason to reason
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
                        byUser: managerName,
                        timestamp: new Date().toISOString(),
                        comment: `Rejected: ${reason}`
                    }]
                };
            }));

            console.log(`[Manager] ✅ Request ${reqId} successfully rejected`);
        } catch (e) {
            console.error('[Manager] ❌ Failed to reject request:', e);
            alert(`Failed to reject request: ${e.message}`);
        }
    };


    // 4. IT Management Approve (Handles BYOD & Standard)
    const itApproveRequest = async (reqId, reviewerId, reviewerName) => {
        try {
            await apiClient.itApproveRequest(reqId, {
                reviewer_id: reviewerId,
                approval_comment: `IT Approved by ${reviewerName}`
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
                    byUser: reviewerName,
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
            alert(`Failed IT approval: ${e.message}`);
        }
    };

    // 4.5. Register BYOD (IT Management)
    const registerByod = async (reqId, reviewerId, reviewerName) => {
        try {
            const req = requests.find(r => r.id === reqId);
            const payload = {
                device_model: req.asset_model || 'Unknown Model',
                os_version: req.os_version || 'Unknown OS',
                serial_number: req.serial_number || 'Unknown Serial'
            };

            await apiClient.byodRegister(reqId, payload, reviewerId);

            setRequests(prev => prev.map(r => {
                if (r.id !== reqId) return r;

                const newAuditEntry = {
                    action: 'BYOD_REGISTERED',
                    byRole: 'IT_MANAGEMENT',
                    byUser: reviewerName,
                    timestamp: new Date().toISOString(),
                    comment: `BYOD Device Registered & Validated`
                };

                return {
                    ...r,
                    status: REQUEST_STATUS.FULFILLED,
                    currentOwnerRole: OWNER_ROLE.END_USER,
                    auditTrail: [...(r.auditTrail || []), newAuditEntry],
                    timeline: [...(r.timeline || []), { role: 'IT_MANAGEMENT', action: 'BYOD_REGISTERED', timestamp: new Date().toISOString(), comment: 'BYOD Device Live' }]
                };
            }));

            // Refresh asset list so the new BYOD device appears in "My Assets"
            try {
                const refreshedAssets = await apiClient.getAssets();
                setAssets(refreshedAssets);
            } catch (assetErr) {
                console.warn("Could not refresh assets after BYOD registration:", assetErr);
            }
        } catch (e) {
            console.error("BYOD Registration Failed:", e);
            alert(`Registration failed: ${e.message}`);
        }
    };

    // 5. IT Management Reject
    const itRejectRequest = async (reqId, reason, reviewerId, reviewerName) => {
        try {
            await apiClient.itRejectRequest(reqId, {
                reviewer_id: reviewerId,
                reason: reason // Changed from rejection_reason to reason to match backend schema
            });

            setRequests(prev => prev.map(req => {
                if (req.id !== reqId) return req;

                const newAuditEntry = {
                    action: 'REJECTED',
                    byRole: 'IT_MANAGEMENT',
                    byUser: reviewerName,
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
            alert(`Failed IT rejection: ${e.message}`);
        }
    };

    // 6. Inventory - Asset Available (allocate directly)
    const inventoryCheckAvailable = async (reqId, allocatedAssetId, inventoryManagerName) => {
        console.log(`[Inventory] Starting allocation for request ${reqId}, asset ${allocatedAssetId}`);
        try {
            // 1. Validate asset exists first
            console.log(`[Inventory] Step 1: Validating asset ${allocatedAssetId}...`);
            try {
                await apiClient.getAsset(allocatedAssetId);
                console.log(`[Inventory] Asset ${allocatedAssetId} found in database`);
            } catch (err) {
                console.error(`[Inventory] Asset validation failed:`, err);
                alert(`Error: Asset "${allocatedAssetId}" not found in database. Please enter a valid Asset ID.`);
                return;
            }

            // 2. Find the request
            console.log(`[Inventory] Step 2: Finding request ${reqId}...`);
            const targetRequest = requests.find(r => r.id === reqId);
            if (!targetRequest) {
                console.error(`[Inventory] Request ${reqId} not found in requests array`);
                alert("Error: Request not found.");
                return;
            }
            console.log(`[Inventory] Request found. Assigning to ${targetRequest.requestedBy.name}`);

            // 3. Call backend API to persist the allocation
            console.log(`[Inventory] Step 3: Calling backend API to allocate asset...`);
            try {
                await apiClient.inventoryAllocateAsset(reqId, allocatedAssetId, user?.id || 'inventory-manager');
                console.log(`[Inventory] Backend allocation successful`);
            } catch (apiError) {
                console.error(`[Inventory] Backend API call failed:`, apiError);
                alert(`Failed to persist allocation to database: ${apiError.message}`);
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
                        byUser: inventoryManagerName,
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
                const refreshedAssets = await apiClient.getAssets();
                setAssets(refreshedAssets);
            } catch (assetErr) {
                console.warn("[Inventory] Could not refresh assets after allocation:", assetErr);
            }

            alert(`Asset ${allocatedAssetId} successfully allocated!`);
        } catch (e) {
            console.error("[Inventory] ❌ Inventory Check Available Failed:", e);
            alert(`Failed to allocate asset: ${e.message}`);
        }
    };

    // 7. Inventory - Asset Not Available (route to procurement)
    const inventoryCheckNotAvailable = async (reqId, inventoryManagerName) => {
        console.log(`[Inventory] Marking request ${reqId} as Not Available`);
        try {
            // 1. Call backend API to persist
            console.log(`[Inventory] Step 1: Calling backend API...`);
            try {
                await apiClient.inventoryMarkNotAvailable(reqId, user?.id || 'inventory-manager');
                console.log(`[Inventory] Backend update successful`);
            } catch (apiError) {
                console.error(`[Inventory] Backend API call failed:`, apiError);
                alert(`Failed to route to procurement: ${apiError.message}`);
                return;
            }

            // 2. Update local state
            console.log(`[Inventory] Step 2: Updating local state...`);
            setRequests(prev => prev.map(req => {
                if (req.id !== reqId) return req;

                const newAuditEntry = {
                    action: 'PROCUREMENT_REQUIRED',
                    byRole: 'ASSET_INVENTORY_MANAGER',
                    byUser: inventoryManagerName,
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
            alert("Request successfully routed to Procurement for purchasing.");
        } catch (e) {
            console.error("[Inventory] ❌ Inventory Check Not Available Failed:", e);
            alert(`Failed to route to procurement: ${e.message}`);
        }
    };

    // 8. Procurement - Decision (approve → Finance, reject → End User)
    const procurementApprove = async (reqId, poNumber, procurementOfficer) => {
        try {
            const poId = poNumber || `PO-${Math.floor(Math.random() * 10000)}`;

            // Call backend API to persist the approval
            await apiClient.procurementApproveRequest(reqId, {
                reviewer_id: user?.id,
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
                        byUser: procurementOfficer,
                        timestamp: new Date().toISOString(),
                        comment: `PO ${poId} created and sent to Finance`
                    }],
                    timeline: [
                        ...(req.timeline || []),
                        { role: 'PROCUREMENT', action: 'PO_CREATED', timestamp: new Date().toISOString(), comment: `PO ${poId} created by ${procurementOfficer}` }
                    ]
                };
            }));

            console.log(`[Procurement] ✅ Request ${reqId} approved with PO ${poId}`);
        } catch (error) {
            console.error('[Procurement] ❌ Failed to approve request:', error);
            alert(`Failed to approve request: ${error.message}`);
        }
    };


    // 8.5. Procurement - Upload PO (Automated Extraction)
    const procurementUploadPO = async (reqId, file) => {
        try {
            console.log(`[Procurement] Uploading PO for request ${reqId}...`);
            const response = await apiClient.uploadPO(reqId, user?.id || 'procurement', file);
            console.log(`[Procurement] PO Upload Response:`, response); // contains extracted details

            // Refresh data to reflect status changes
            loadData();

            return response;

        } catch (error) {
            console.error('[Procurement] ❌ PO Upload Failed:', error);
            alert(`PO Upload Failed: ${error.message}`);
            throw error;
        }
    };

    const procurementReject = async (reqId, reason, procurementOfficer) => {
        try {
            // Call backend API to persist the rejection
            await apiClient.procurementRejectRequest(reqId, {
                reviewer_id: user?.id,
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
                        byUser: procurementOfficer,
                        timestamp: new Date().toISOString(),
                        comment: `Rejected: ${reason}`
                    }],
                    timeline: [...(req.timeline || []), { role: 'PROCUREMENT', action: 'REJECTED', timestamp: new Date().toISOString(), comment: `Rejected: ${reason}` }]
                };
            }));

            console.log(`[Procurement] ✅ Request ${reqId} successfully rejected`);
        } catch (error) {
            console.error('[Procurement] ❌ Failed to reject request:', error);
            alert(`Failed to reject request: ${error.message}`);
        }
    };

    // 9. Procurement - Create PO (legacy entry point, routes to Finance)
    const procurementCreatePO = (reqId, poNumber, procurementOfficer) => {
        setRequests(prev => prev.map(req => {
            if (req.id !== reqId) return req;
            return {
                ...req,
                procurementStage: 'PO_CREATED',
                poNumber: poNumber,
                currentOwnerRole: OWNER_ROLE.FINANCE,
                timeline: [
                    ...(req.timeline || []),
                    { role: 'PROCUREMENT', action: 'PO_CREATED', timestamp: new Date().toISOString(), comment: `PO ${poNumber} created by ${procurementOfficer}` }
                ],
                auditTrail: [...(req.auditTrail || []), {
                    action: 'PROCUREMENT_APPROVED',
                    byRole: 'PROCUREMENT',
                    byUser: procurementOfficer,
                    timestamp: new Date().toISOString(),
                    comment: `PO ${poNumber} created and sent to Finance`
                }]
            };
        }));
    };

    // 9. Finance - Approve Budget
    const financeApprove = (reqId, financeName) => {
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
    };

    // 10. Finance - Reject
    const financeReject = (reqId, reason, financeName) => {
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
    };

    // 11. Procurement - Confirm Delivery
    const procurementConfirmDelivery = async (reqId, procurementOfficer) => {
        console.log(`[Procurement] Confirming delivery for request ${reqId}`);
        try {
            // 1. Call backend API
            await apiClient.procurementConfirmDelivery(reqId, user?.id || 'procurement-officer');
            console.log(`[Procurement] Backend delivery confirmation successful`);

            // 2. Update local state
            setRequests(prev => prev.map(req => {
                if (req.id !== reqId) return req;
                return {
                    ...req,
                    status: 'QC_PENDING',
                    procurementStage: 'DELIVERED',
                    currentOwnerRole: OWNER_ROLE.ASSET_INVENTORY_MANAGER,
                    timeline: [
                        ...(req.timeline || []),
                        { role: 'PROCUREMENT', action: 'DELIVERY_CONFIRMED', timestamp: new Date().toISOString(), comment: `Asset delivered - confirmed by ${procurementOfficer}` }
                    ]
                };
            }));

            // Refresh assets list so the new asset appears in "In Stock" for Inventory Manager
            try {
                const refreshedAssets = await apiClient.getAssets();
                setAssets(refreshedAssets);
            } catch (assetErr) {
                console.warn("[Procurement] Could not refresh assets after delivery confirmation:", assetErr);
            }

            alert("Delivery confirmed! Request moved back to Inventory for allocation.");
        } catch (e) {
            console.error("[Procurement] Delivery Confirmation Failed:", e);
            alert(`Failed to confirm delivery: ${e.message}`);
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
                alert(`Error: Asset "${allocatedAssetId}" not found in database. Please enter a valid Asset ID.`);
                return;
            }

            // 2. Perform assignment & Update backend
            console.log(`[Inventory] Step 2: Calling backend API...`);
            try {
                await apiClient.inventoryAllocateAsset(reqId, allocatedAssetId, user?.id || 'inventory-manager');
                console.log(`[Inventory] Backend allocation successful`);
            } catch (apiError) {
                console.error(`[Inventory] Backend API call failed:`, apiError);
                alert(`Failed to allocate asset: ${apiError.message}`);
                return;
            }

            // 3. Update local state
            setRequests(prev => prev.map(req => {
                if (req.id !== reqId) return req;
                return {
                    ...req,
                    allocatedAssetId: allocatedAssetId,
                    status: REQUEST_STATUS.FULFILLED,
                    currentOwnerRole: OWNER_ROLE.END_USER,
                    timeline: [
                        ...(req.timeline || []),
                        { role: 'INVENTORY', action: 'ALLOCATED', timestamp: new Date().toISOString(), comment: `Asset allocated by ${inventoryManagerName} - Asset ID: ${allocatedAssetId}` }
                    ]
                };
            }));

            // Refresh assets list to show newly assigned asset
            try {
                const refreshedAssets = await apiClient.getAssets();
                setAssets(refreshedAssets);
            } catch (assetErr) {
                console.warn("[Inventory] Could not refresh assets after final allocation:", assetErr);
            }

            alert(`Asset ${allocatedAssetId} successfully allocated and fulfilled!`);
        } catch (e) {
            console.error("Inventory Allocate Delivered Failed:", e);
            alert(`Failed to allocate delivered asset: ${e.message}`);
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
            const refreshedAssets = await apiClient.getAssets();
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
            createRequest,
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
            updateAssetStatus,
            assignAsset,
            updateAsset,
            exitRequests,
            processExitAssets,
            processExitByod,
            refreshData: loadData,
            // Backward compatibility
            managerApproveRequest,
            managerRejectRequest,
            // Backward compatibility
            tickets: requests.filter(r => r.status === 'SUPPORT' || r.requestType === 'SUPPORT' || r.assetType === 'TICKET'),
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
