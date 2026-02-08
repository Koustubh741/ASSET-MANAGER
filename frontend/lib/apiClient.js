import { API_URL, API_BASE_URL } from './apiConfig';

class ApiClient {
    constructor() {
        this.baseURL = API_URL;
        this.token = null;
        this.refreshToken = null;
        this.isRefreshing = false;
        this.refreshSubscribers = [];

        // Load tokens from localStorage if available
        if (typeof window !== 'undefined') {
            this.token = localStorage.getItem('accessToken');
            this.refreshToken = localStorage.getItem('refreshToken');
        }
    }

    setToken(token) {
        this.token = token;
        if (typeof window !== 'undefined') {
            localStorage.setItem('accessToken', token);
        }
    }

    setRefreshToken(token) {
        this.refreshToken = token;
        if (typeof window !== 'undefined') {
            localStorage.setItem('refreshToken', token);
        }
    }

    clearToken() {
        this.token = null;
        this.refreshToken = null;
        if (typeof window !== 'undefined') {
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
            localStorage.removeItem('user');
        }
    }

    // Subscribe to token refresh
    subscribeTokenRefresh(callback) {
        this.refreshSubscribers.push(callback);
    }

    // Notify all subscribers with new token
    onTokenRefreshed(newToken) {
        this.refreshSubscribers.forEach(callback => callback(newToken));
        this.refreshSubscribers = [];
    }

    // Attempt to refresh the access token
    async attemptTokenRefresh() {
        if (!this.refreshToken) {
            throw new Error('No refresh token available');
        }

        try {
            const response = await fetch(`${this.baseURL}/auth/refresh`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ refresh_token: this.refreshToken }),
            });

            if (!response.ok) {
                throw new Error('Token refresh failed');
            }

            const data = await response.json();
            this.setToken(data.access_token);
            return data.access_token;
        } catch (error) {
            // Clear tokens on refresh failure
            this.clearToken();
            throw error;
        }
    }

    async request(endpoint, options = {}, retryOnUnauthorized = true) {
        const url = `${this.baseURL}${endpoint}`;
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers,
        };

        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }

        const config = {
            ...options,
            headers,
        };

        // Handle body serialization
        if (config.body && typeof config.body === 'object' && !(config.body instanceof FormData)) {
            config.body = JSON.stringify(config.body);
        }

        if (config.body instanceof FormData) {
            delete headers['Content-Type'];
        }

        try {
            const response = await fetch(url, config);

            // Handle 401 Unauthorized - attempt token refresh
            if (response.status === 401 && retryOnUnauthorized && this.refreshToken) {
                if (!this.isRefreshing) {
                    this.isRefreshing = true;
                    try {
                        const newToken = await this.attemptTokenRefresh();
                        this.isRefreshing = false;
                        this.onTokenRefreshed(newToken);
                        // Retry the original request with new token
                        return this.request(endpoint, options, false);
                    } catch (refreshError) {
                        this.isRefreshing = false;
                        // Redirect to login on refresh failure
                        if (typeof window !== 'undefined') {
                            window.location.href = '/login';
                        }
                        throw refreshError;
                    }
                } else {
                    // Wait for the ongoing refresh to complete
                    return new Promise((resolve, reject) => {
                        this.subscribeTokenRefresh(async (newToken) => {
                            try {
                                const result = await this.request(endpoint, options, false);
                                resolve(result);
                            } catch (error) {
                                reject(error);
                            }
                        });
                    });
                }
            }

            // Handle empty responses
            const contentType = response.headers.get('content-type');
            let data;
            if (contentType && contentType.includes('application/json')) {
                data = await response.json();
            } else {
                const text = await response.text();
                data = text ? JSON.parse(text) : {};
            }

            if (!response.ok) {
                throw new Error(data.detail || data.message || `API request failed: ${response.status}`);
            }

            return data;
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    }

    // Authentication
    async login(email, password) {
        const formData = new URLSearchParams();
        formData.append('username', email); // OAuth2 uses 'username' field
        formData.append('password', password);

        const response = await fetch(`${this.baseURL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: formData,
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.detail || 'Login failed');
        }

        this.setToken(data.access_token);
        if (data.refresh_token) {
            this.setRefreshToken(data.refresh_token);
        }
        if (typeof window !== 'undefined') {
            localStorage.setItem('user', JSON.stringify(data.user));
        }

        return data;
    }

    async ssoLogin(provider) {
        const data = await this.request(`/auth/sso/login/${provider}`);
        if (data.redirect_url) {
            window.location.href = data.redirect_url;
        }
    }

    async ssoCallback(provider, code) {
        const data = await this.request(`/auth/sso/callback/${provider}?code=${code}`);

        this.setToken(data.access_token);
        if (data.refresh_token) {
            this.setRefreshToken(data.refresh_token);
        }
        if (typeof window !== 'undefined') {
            localStorage.setItem('user', JSON.stringify(data.user));
        }

        return data;
    }

    // Refresh token manually
    async refreshAccessToken() {
        return this.attemptTokenRefresh();
    }

    async register(userData) {
        return this.request('/auth/register', {
            method: 'POST',
            body: userData,
        });
    }

    async logout() {
        await this.request('/auth/logout', { method: 'POST' });
        this.clearToken();
    }

    async getCurrentUser() {
        return this.request('/auth/me');
    }

    // Assets
    async getAssets(params = {}) {
        const queryString = new URLSearchParams(params).toString();
        return this.request(`/assets/?${queryString}`);
    }

    async getAsset(id) {
        return this.request(`/assets/${id}`);
    }

    async createAsset(assetData) {
        return this.request('/assets/', {
            method: 'POST',
            body: JSON.stringify(assetData),
        });
    }

    async updateAsset(id, assetData) {
        return this.request(`/assets/${id}`, {
            method: 'PATCH',
            body: JSON.stringify(assetData),
        });
    }

    async assignAsset(id, assignmentData) {
        return this.request(`/assets/${id}/assign`, {
            method: 'PATCH',
            body: JSON.stringify(assignmentData),
        });
    }

    async updateAssetStatus(id, status) {
        return this.request(`/assets/${id}/status`, {
            method: 'PATCH',
            body: JSON.stringify({ status }),
        });
    }

    async getMyAssets(user) {
        return this.request(`/assets/my-assets?user=${encodeURIComponent(user)}`);
    }

    async getAssetEvents(id) {
        return this.request(`/assets/${id}/events`);
    }

    async deleteAsset(id) {
        return this.request(`/assets/${id}`, {
            method: 'DELETE',
        });
    }

    async getAssetStats() {
        return this.request('/assets/stats');
    }

    // Asset Requests
    async getAssetRequests(params = {}) {
        const queryString = new URLSearchParams(params).toString();
        return this.request(`/asset-requests?${queryString}`);
    }

    async getAssetRequest(id) {
        return this.request(`/asset-requests/${id}`);
    }

    async createAssetRequest(requestData) {
        return this.request('/asset-requests', {
            method: 'POST',
            body: JSON.stringify(requestData),
        });
    }

    async managerApproveRequest(id, approvalData) {
        return this.request(`/asset-requests/${id}/manager/approve`, {
            method: 'POST',
            body: JSON.stringify(approvalData || {}),
        });
    }

    async managerRejectRequest(id, rejectionData) {
        return this.request(`/asset-requests/${id}/manager/reject`, {
            method: 'POST',
            body: JSON.stringify(rejectionData),
        });
    }

    async itApproveRequest(id, approvalData) {
        return this.request(`/asset-requests/${id}/it/approve`, {
            method: 'POST',
            body: JSON.stringify(approvalData || {}),
        });
    }

    async itRejectRequest(id, rejectionData) {
        return this.request(`/asset-requests/${id}/it/reject`, {
            method: 'POST',
            body: JSON.stringify(rejectionData),
        });
    }

    async byodRegister(requestId, payload, reviewerId) {
        return this.request(`/asset-requests/${requestId}/byod/register?reviewer_id=${reviewerId}`, {
            method: 'POST',
            body: JSON.stringify(payload)
        });
    }

    async procurementApproveRequest(id, approvalData) {
        return this.request(`/asset-requests/${id}/procurement/approve`, {
            method: 'POST',
            body: JSON.stringify(approvalData || {}),
        });
    }

    async procurementRejectRequest(id, rejectionData) {
        return this.request(`/asset-requests/${id}/procurement/reject`, {
            method: 'POST',
            body: JSON.stringify(rejectionData),
        });
    }

    async procurementConfirmDelivery(id, reviewerId) {
        return this.request(`/asset-requests/${id}/procurement/confirm-delivery?reviewer_id=${reviewerId}`, {
            method: 'POST',
        });
    }

    async inventoryAllocateAsset(requestId, assetId, inventoryManagerId) {
        return this.request(`/asset-requests/${requestId}/inventory/allocate?asset_id=${assetId}&inventory_manager_id=${inventoryManagerId}`, {
            method: 'POST',
        });
    }

    async inventoryMarkNotAvailable(requestId, inventoryManagerId) {
        return this.request(`/asset-requests/${requestId}/inventory/not-available?inventory_manager_id=${inventoryManagerId}`, {
            method: 'POST',
        });
    }

    async uploadPO(requestId, uploaderId, file) {
        const formData = new FormData();
        formData.append('file', file);
        // uploader_id is passed as query param in the backend endpoint signature?
        // Checking backend: @router.post("/po/{request_id}") async def upload_po(request_id: str, uploader_id: str, file: UploadFile = File(...))
        // FastApi expects query params for simple types unless Form(...) is used.
        // Let's assume uploader_id is a query param based on typical FastAPI behavior when mixed with File upload.

        return this.request(`/upload/po/${requestId}?uploader_id=${uploaderId}`, {
            method: 'POST',
            body: formData,
            // Header content-type will be automatically set by fetch for FormData (multipart/form-data) with boundary
            // We need to make sure the request helper doesn't override it with application/json
        });
    }

    async getPO(requestId) {
        return this.request(`/upload/po/${requestId}`);
    }

    // Legacy compatibility methods
    async getRequests(params = {}) {
        return this.getAssetRequests(params);
    }

    async createRequest(requestData) {
        return this.createAssetRequest(requestData);
    }

    async approveRequest(id) {
        return this.managerApproveRequest(id);
    }

    async rejectRequest(id, reason) {
        return this.managerRejectRequest(id, { rejection_reason: reason });
    }

    // Tickets
    async getTickets(params = {}) {
        const queryString = new URLSearchParams(params).toString();
        return this.request(`/tickets?${queryString}`);
    }

    async getTicket(id) {
        return this.request(`/tickets/${id}`);
    }

    async createTicket(ticketData) {
        return this.request('/tickets', {
            method: 'POST',
            body: JSON.stringify(ticketData),
        });
    }

    async updateTicket(id, ticketData) {
        return this.request(`/tickets/${id}`, {
            method: 'PATCH',
            body: JSON.stringify(ticketData),
        });
    }

    async diagnoseTicket(id, diagnosisData) {
        return this.request(`/tickets/${id}/it/diagnose`, {
            method: 'POST',
            body: JSON.stringify(diagnosisData),
        });
    }

    async acknowledgeTicket(id, reviewerId) {
        return this.request(`/tickets/${id}/acknowledge`, {
            method: 'POST',
            body: JSON.stringify({
                reviewer_id: reviewerId,
                outcome: 'acknowledge',
                notes: 'Ticket acknowledged by IT'
            }),
        });
    }

    async resolveTicket(id, reviewerId, notes, checklist = [], percentage = 100.0) {
        return this.request(`/tickets/${id}/resolve`, {
            method: 'POST',
            body: JSON.stringify({
                reviewer_id: reviewerId,
                notes: notes,
                checklist: checklist,
                percentage: percentage
            }),
        });
    }

    async updateTicketProgress(id, reviewerId, notes, checklist, percentage) {
        return this.request(`/tickets/${id}/progress`, {
            method: 'POST',
            body: JSON.stringify({
                reviewer_id: reviewerId,
                notes: notes,
                checklist: checklist,
                percentage: percentage
            }),
        });
    }

    // Users
    async getUsers(params = {}) {
        const queryString = new URLSearchParams(params).toString();
        return this.request(`/auth/users?${queryString}`);
    }

    async activateUser(userId) {
        return this.request(`/auth/users/${userId}/activate`, {
            method: 'POST'
        });
    }

    async denyUser(userId) {
        return this.request(`/auth/users/${userId}/disable`, {
            method: 'POST'
        });
    }

    async getUser(id) {
        return this.request(`/auth/users/${id}`);
    }

    async createUser(userData) {
        return this.request('/users', {
            method: 'POST',
            body: userData,
        });
    }

    // Exits
    async getExitRequests(params = {}) {
        const queryString = new URLSearchParams(params).toString();
        return this.request(`/auth/exit-requests?${queryString}`);
    }

    async initiateExit(userId) {
        return this.request(`/auth/users/${userId}/exit`, {
            method: 'POST'
        });
    }

    async processExitAssets(exitRequestId) {
        return this.request(`/auth/exit-requests/${exitRequestId}/process-assets`, {
            method: 'POST'
        });
    }

    async processExitByod(exitRequestId) {
        return this.request(`/auth/exit-requests/${exitRequestId}/process-byod`, {
            method: 'POST'
        });
    }

    async completeExitRequest(exitRequestId) {
        return this.request(`/auth/exit-requests/${exitRequestId}/complete`, {
            method: 'POST'
        });
    }

    // Disposal
    async getDisposalQueue() {
        return this.request('/disposal/queue');
    }

    async initiateDisposal(assetId) {
        return this.request(`/disposal/${assetId}/initiate`, {
            method: 'POST'
        });
    }

    async validateDisposal(assetId) {
        return this.request(`/disposal/${assetId}/validate`, {
            method: 'POST'
        });
    }

    async recordWipe(assetId) {
        return this.request(`/disposal/${assetId}/wipe`, {
            method: 'POST'
        });
    }

    async finalizeDisposal(assetId) {
        return this.request(`/disposal/${assetId}/finalize`, {
            method: 'POST'
        });
    }

    // Departments
    async getDepartments() {
        return this.request('/reference/departments');
    }

    // Locations
    async getLocations() {
        return this.request('/reference/locations');
    }

    // Reference data
    async getDomains() {
        return this.request('/reference/domains');
    }

    async getRoles() {
        return this.request('/reference/roles');
    }

    async getAssetTypes() {
        return this.request('/reference/asset-types');
    }

    async getAssetStatuses() {
        return this.request('/reference/asset-statuses');
    }

    // Financials
    async getFinancialSummary() {
        return this.request('/financials/summary');
    }

    async getFinancialsByType() {
        return this.request('/financials/by-type');
    }

    async getMonthlySpend(months = 12) {
        return this.request(`/financials/monthly-spend?months=${months}`);
    }

    async getDepreciation(method = 'straight-line', usefulLifeYears = 5) {
        return this.request(`/financials/depreciation?method=${method}&useful_life_years=${usefulLifeYears}`);
    }

    // Renewals
    async getAssetRenewals(daysAhead = 90, expiryType = null) {
        let url = `/assets/renewals?days_ahead=${daysAhead}`;
        if (expiryType) {
            url += `&expiry_type=${expiryType}`;
        }
        return this.request(url);
    }

    // CMDB Relationships
    async getAssetRelationships(assetId) {
        return this.request(`/assets/${assetId}/relationships`);
    }

    async createAssetRelationship(sourceAssetId, targetAssetId, relationshipType, options = {}) {
        return this.request(`/assets/${sourceAssetId}/relationships`, {
            method: 'POST',
            body: {
                target_asset_id: targetAssetId,
                relationship_type: relationshipType,
                description: options.description || null,
                criticality: options.criticality || 3.0,
                created_by: options.createdBy || null
            }
        });
    }

    async deleteAssetRelationship(assetId, relationshipId) {
        return this.request(`/assets/${assetId}/relationships/${relationshipId}`, {
            method: 'DELETE'
        });
    }

    // Health Check
    async healthCheck() {
        return fetch(`${API_BASE_URL}/health`)
            .then(res => res.json());
    }

    async dbHealthCheck() {
        return fetch(`${API_BASE_URL}/health/db`)
            .then(res => res.json());
    }

    // Audit Logs
    async getAuditLogs(params = {}) {
        const query = new URLSearchParams(params).toString();
        return this.request(`/audit/logs${query ? `?${query}` : ''}`);
    }

    async getAuditStats() {
        return this.request('/audit/stats');
    }

    async syncAuditLogs() {
        return this.request('/audit/sync', { method: 'POST' });
    }

    // Network Discovery
    async triggerNetworkScan(cidr = '192.168.1.0/24', community = 'public') {
        return this.request('/collect/scan', {
            method: 'POST',
            body: { cidr, community }
        });
    }

    async getDiscoveredSoftware() {
        return this.request('/software/discovered');
    }
}

// Export singleton instance
const apiClient = new ApiClient();
export default apiClient;
