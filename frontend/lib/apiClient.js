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
            localStorage.removeItem('auth_session');
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
        // Root Fix: Strip redundant /api/v1 prefix if present in the endpoint string
        const cleanEndpoint = endpoint.startsWith('/api/v1') 
            ? endpoint.replace('/api/v1', '') 
            : endpoint;
            
        const url = `${this.baseURL}${cleanEndpoint}`;
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
                        this.clearToken();
                        if (typeof window !== 'undefined') {
                            // Redirect to login if token refresh fails
                            window.location.href = `/login?message=${encodeURIComponent('Session expired. Please log in again.')}`;
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

            // Handle 403 Forbidden - potential role issue or session mismatch
            if (response.status === 403) {
                console.error('Access Denied (403): You do not have permission for this resource.');
                // We don't automatically redirect as the user might just be on the wrong tab,
                // but we clear local state if it's a persistent auth issue.
            }

            // Handle empty responses
            const contentType = response.headers.get('content-type');
            let data;
            if (contentType && contentType.includes('application/json')) {
                data = await response.json();
            } else {
                const text = await response.text();
                try {
                    data = text ? JSON.parse(text) : {};
                } catch (e) {
                    // Not JSON (e.g. CSV or plain text)
                    data = text;
                }
            }

            if (!response.ok) {
                const err = new Error(data.detail || data.message || `API request failed: ${response.status}`);
                err.status = response.status;
                throw err;
            }

            return data;
        } catch (error) {
            const suppressLog = options.suppressLogForStatuses && error.status != null && options.suppressLogForStatuses.includes(error.status);
            if (!suppressLog) console.error('API Error:', error);
            throw error;
        }
    }

    // Shorthand HTTP methods
    get(endpoint, options = {}) {
        return this.request(endpoint, { ...options, method: 'GET' });
    }

    post(endpoint, body, options = {}) {
        return this.request(endpoint, { ...options, method: 'POST', body });
    }

    put(endpoint, body, options = {}) {
        return this.request(endpoint, { ...options, method: 'PUT', body });
    }

    patch(endpoint, body, options = {}) {
        return this.request(endpoint, { ...options, method: 'PATCH', body });
    }

    delete(endpoint, options = {}) {
        return this.request(endpoint, { ...options, method: 'DELETE' });
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
            body: JSON.stringify(userData),
        });
    }

    async updateMe(userData) {
        return this.patch('/auth/me', userData);
    }

    async logout() {
        await this.request('/auth/logout', { method: 'POST' });
        this.clearToken();
    }

    async getCurrentUser() {
        return this.request('/auth/me');
    }

    // Setup wizard (optional: 404 if backend has no setup route — treat as completed, don't log)
    async getSetupStatus() {
        try {
            return await this.request('/setup/status', { suppressLogForStatuses: [404] });
        } catch (err) {
            if (err?.status === 404) return { setup_completed: true };
            throw err;
        }
    }

    async completeSetup(payload) {
        return this.request('/setup/complete', {
            method: 'POST',
            body: JSON.stringify(payload),
        });
    }

    async updateMyPlan(plan) {
        return this.patch('/auth/me/plan', { plan });
    }

    // --- ROOT FIX: Persistent Preferences & AI Data ---

    async getUserPreferences() {
        return this.get('/preferences/me');
    }

    async updateUserPreferences(data) {
        return this.patch('/preferences/me', data);
    }

    async getAiConfigs() {
        return this.get('/ai-configs');
    }

    async getChatHistory() {
        return this.get('/chat/history');
    }

    async saveChatMessage(role, content, msg_metadata = {}) {
        return this.post('/chat/message', { role, content, msg_metadata });
    }


    // AI Assistant
    async getAIUsage() {
        return this.request('/ai/usage');
    }

    async postAIChat(message) {
        return this.post('/ai/chat', { message });
    }

    // Assets
    async getAssets(params = {}) {
        const queryString = new URLSearchParams(params).toString();
        const url = queryString ? `/assets/?${queryString}` : '/assets';
        return this.request(url);
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

    async getMyAssets() {
        return this.request('/assets/my-assets');
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

    async provisionSoftware(assetId, softwareName) {
        return this.request(`/assets/${assetId}/provision?software_name=${encodeURIComponent(softwareName)}`, {
            method: 'POST'
        });
    }

    async getAlerts(params = {}) {
        const q = new URLSearchParams(params);
        const query = q.toString();
        const url = query ? `/alerts?${query}` : '/alerts';
        return this.request(url);
    }

    // Asset Requests
    async getAssetRequests(params = {}) {
        const queryParams = new URLSearchParams(params);
        const queryString = queryParams.toString();
        const url = queryString ? `/asset-requests?${queryString}` : '/asset-requests';
        return this.request(url);
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

    async managerApproveRequest(id) {
        return this.request(`/asset-requests/${id}/manager/approve`, {
            method: 'POST',
            body: JSON.stringify({}),
        });
    }

    async managerRejectRequest(id, rejectionData) {
        return this.request(`/asset-requests/${id}/manager/reject`, {
            method: 'POST',
            body: JSON.stringify(rejectionData),
        });
    }

    // New Manager Confirmation Methods (Phase 5)
    async managerConfirmIT(id, confirmationData) {
        return this.request(`/asset-requests/${id}/manager/confirm-it`, {
            method: 'POST',
            body: JSON.stringify({
                decision: confirmationData.decision,
                reason: confirmationData.reason
            }),
        });
    }

    async managerConfirmBudget(id, confirmationData) {
        return this.request(`/asset-requests/${id}/manager/confirm-budget`, {
            method: 'POST',
            body: JSON.stringify({
                decision: confirmationData.decision,
                reason: confirmationData.reason
            }),
        });
    }

    async managerConfirmAssignment(id, confirmationData) {
        return this.request(`/asset-requests/${id}/manager/confirm-assignment`, {
            method: 'POST',
            body: JSON.stringify({
                decision: confirmationData.decision,
                reason: confirmationData.reason
            }),
        });
    }

    async itApproveRequest(id, approvalData) {
        return this.request(`/asset-requests/${id}/it/approve`, {
            method: 'POST',
            body: JSON.stringify({
                approval_comment: approvalData?.approval_comment
            }),
        });
    }

    async itRejectRequest(id, rejectionData) {
        return this.request(`/asset-requests/${id}/it/reject`, {
            method: 'POST',
            body: JSON.stringify({
                reason: rejectionData.reason
            }),
        });
    }

    async byodRegister(requestId, payload) {
        return this.request(`/asset-requests/${requestId}/byod/register`, {
            method: 'POST',
            body: JSON.stringify(payload)
        });
    }

    async registerBYOD(byodData) {
        // Wrapper for creating a BYOD asset request
        const payload = {
            asset_name: byodData.device_model || 'BYOD Device',
            asset_type: (byodData.device_type || 'Mobile').toUpperCase(),
            asset_ownership_type: 'BYOD',
            business_justification: byodData.reason || 'BYOD Registration',
            asset_model: byodData.device_model,
            os_version: byodData.os_version,
            serial_number: byodData.serial_number
        };
        return this.createAssetRequest(payload);
    }

    // New BYOD Compliance Methods (Phase 7)
    async byodComplianceCheck(requestId) {
        return this.request(`/asset-requests/${requestId}/byod-compliance-check`, {
            method: 'POST',
            body: JSON.stringify({})
        });
    }

    async mdmEnrollDevice(deviceId, policies) {
        return this.request(`/asset-requests/byod-devices/${deviceId}/mdm-enroll`, {
            method: 'POST',
            body: JSON.stringify({
                device_id: deviceId,
                security_policies: policies
            })
        });
    }

    async procurementApproveRequest(id) {
        return this.request(`/asset-requests/${id}/procurement/approve`, {
            method: 'POST',
            body: JSON.stringify({}),
        });
    }

    async procurementRejectRequest(id, rejectionData) {
        return this.request(`/asset-requests/${id}/procurement/reject`, {
            method: 'POST',
            body: JSON.stringify({
                reason: rejectionData.reason
            }),
        });
    }

    async financeApproveRequest(id) {
        return this.request(`/asset-requests/${id}/finance/approve`, {
            method: 'POST',
            body: JSON.stringify({}),
        });
    }

    async financeRejectRequest(id, rejectionData) {
        return this.request(`/asset-requests/${id}/finance/reject`, {
            method: 'POST',
            body: JSON.stringify({
                reason: rejectionData.reason
            }),
        });
    }

    async procurementConfirmDelivery(id, payload) {
        return this.request(`/asset-requests/${id}/procurement/confirm-delivery`, {
            method: 'POST',
            body: JSON.stringify(payload)
        });
    }


    async getPO(requestId) {
        return this.request(`/upload/po/${requestId}`, {
            method: 'GET'
        });
    }

    getPOViewUrl(requestId) {
        // Returns the static download/view URL for the PO PDF
        const token = localStorage.getItem('token');
        return `${this.baseUrl}/upload/po/${requestId}/view?token=${token}`;
    }

    async updatePODetails(poId, data) {
        return this.request(`/upload/po/${poId}`, {
            method: 'PATCH',
            body: JSON.stringify(data)
        });
    }

    async performQC(requestId, qcData) {
        return this.request(`/asset-requests/${requestId}/qc/perform`, {
            method: 'POST',
            body: JSON.stringify({
                qc_status: qcData.qc_status,
                qc_notes: qcData.qc_notes
            })
        });
    }

    async userAcceptAsset(requestId) {
        return this.request(`/asset-requests/${requestId}/user/accept`, {
            method: 'POST',
            body: JSON.stringify({})
        });
    }

    async inventoryAllocateAsset(requestId, assetId) {
        return this.request(`/asset-requests/${requestId}/inventory/allocate?asset_id=${assetId}`, {
            method: 'POST',
        });
    }

    async inventoryMarkNotAvailable(requestId) {
        return this.request(`/asset-requests/${requestId}/inventory/not-available`, {
            method: 'POST',
        });
    }

    async uploadPO(requestId, file) {
        const formData = new FormData();
        formData.append('file', file);

        return this.request(`/upload/po/${requestId}`, {
            method: 'POST',
            body: formData,
        });
    }

    async uploadInvoice(poId, file) {
        const formData = new FormData();
        formData.append('file', file);

        return this.request(`/upload/invoice/${poId}`, {
            method: 'POST',
            body: formData,
        });
    }

    async updatePODetails(poId, data) {
        return this.request(`/upload/po/${poId}`, {
            method: 'PATCH',
            body: JSON.stringify(data)
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
    async getTickets(skip = 0, limit = 100, department = null, search = null, isInternal = null) {
        const queryParams = { skip, limit };
        if (department) queryParams.department = department;
        if (search) queryParams.search = search;
        if (isInternal !== null) queryParams.is_internal = isInternal;
        const params = new URLSearchParams(queryParams);
        return this.request(`/tickets/?${params.toString()}`);
    }

    async getTicket(id) {
        return this.request(`/tickets/${id}`);
    }

    async getTicketAttachments(ticketId) {
        return this.request(`/tickets/${ticketId}/attachments`);
    }

    async uploadTicketAttachment(ticketId, file) {
        const formData = new FormData();
        formData.append('file', file);
        return this.request(`/tickets/${ticketId}/attachments`, {
            method: 'POST',
            body: formData,
        });
    }

    async deleteTicketAttachment(attachmentId) {
        return this.request(`/tickets/attachments/${attachmentId}`, {
            method: 'DELETE',
        });
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

    async itDiagnoseTicket(ticketId, diagnosisData) {
        return this.request(`/tickets/${ticketId}/it/diagnose`, {
            method: 'POST',
            body: JSON.stringify({
                outcome: diagnosisData.outcome,
                notes: diagnosisData.notes
            }),
        });
    }

    async acknowledgeTicket(id) {
        return this.request(`/tickets/${id}/acknowledge`, {
            method: 'POST',
            body: JSON.stringify({
                notes: 'Ticket acknowledged by IT'
            }),
        });
    }

    async resolveTicket(id, notes, checklist = [], percentage = 100.0) {
        return this.request(`/tickets/${id}/resolve`, {
            method: 'POST',
            body: JSON.stringify({
                notes: notes,
                checklist: checklist,
                percentage: percentage
            }),
        });
    }

    async updateTicketProgress(id, notes, checklist, percentage) {
        return this.request(`/tickets/${id}/progress`, {
            method: 'POST',
            body: JSON.stringify({
                notes: notes,
                checklist: checklist,
                percentage: percentage
            }),
        });
    }

    async getTicketStatsByCategory(days = 30, isInternal = null) {
        let url = `/tickets/stats/category?range_days=${days}`;
        if (isInternal !== null) url += `&is_internal=${isInternal}`;
        return this.request(url);
    }

    async getOEMMetrics() {
        return this.request('/analytics/oem/metrics');
    }

    async getTicketSolverStats(days = null) {
        const query = days ? `?range_days=${days}` : '';
        return this.request(`/tickets/stats/solvers${query}`);
    }

    async getTicketExecutiveSummary(days = 30, options = {}) {
        let url = `/tickets/analytics/summary?range_days=${days}`;
        if (options.periodStart) url += `&period_mode=calendar&period_start=${options.periodStart}&period_end=${options.periodEnd}`;
        if (options.fiscal_year) url += `&fiscal_year=${options.fiscal_year}`;
        return this.request(url);
    }

    async getTicketTrendSeries(granularity = 'monthly', year = new Date().getFullYear()) {
        return this.request(`/tickets/analytics/trend?granularity=${granularity}&year=${year}`);
    }

    async getTicketComparison(periodAStart, periodAEnd, periodBStart, periodBEnd) {
        const params = new URLSearchParams({
            period_a_start: periodAStart,
            period_a_end: periodAEnd,
            period_b_start: periodBStart,
            period_b_end: periodBEnd
        });
        return this.request(`/tickets/analytics/compare?${params.toString()}`);
    }

    async getSolverPortfolio(userId) {
        return this.request(`/tickets/solvers/${userId}/portfolio`);
    }

    // Categories (Dynamic Styling)
    async getCategoryConfigs() {
        return this.request('/categories/configs');
    }

    async updateCategoryConfig(config) {
        return this.post('/categories/configs', config);
    }

    async suggestIcon(categoryName) {
        return this.request(`/categories/suggest-icon/${encodeURIComponent(categoryName)}`);
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
            body: JSON.stringify(userData),
        });
    }

    // Departments
    async getDepartments() {
        return this.get('/departments');
    }

    async getDepartment(slug) {
        return this.get(`/departments/${slug}`);
    }

    /**
     * Get user counts by role (Admin only).
     * @param {Object} params - Optional { status: 'ACTIVE' } to count only active users.
     * @returns {Promise<Record<string, number>>} e.g. { FINANCE: 2, PROCUREMENT: 3, END_USER: 50 }
     */
    async getRoleCounts(params = {}) {
        const queryString = new URLSearchParams(params).toString();
        return this.request(`/users/role-counts${queryString ? `?${queryString}` : ''}`);
    }

    // Exits
    async getExitRequests(params = {}) {
        const queryString = new URLSearchParams(params).toString();
        return this.request(`/auth/exit-requests?${queryString}`);
    }

    // Software
    async getLicenses() {
        return this.request('/software');
    }

    async getDiscoveredSoftware() {
        return this.request('/software/discovered');
    }

    async getSoftwareReconciliation() {
        return this.request('/software/reconciliation');
    }

    async matchSoftware(discoveredName, licenseId) {
        return this.request('/software/match', {
            method: 'POST',
            body: JSON.stringify({
                discovered_name: discoveredName,
                license_id: licenseId
            })
        });
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

    // NOTE: getDepartments() is defined above (hits /departments/ with slug+metadata)
    // getReferenceDeptsLegacy was removed - it returned objects without slugs which broke portal links

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

    async getProcurementSummary(months = 6) {
        return this.request(`/financials/procurement-summary?months=${months}`, { suppressLogForStatuses: [404] });
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

    async getAllRelationships() {
        return this.request('/assets/relationships/all');
    }

    async createAssetRelationship(sourceAssetId, targetAssetId, relationshipType, options = {}) {
        return this.request(`/assets/${sourceAssetId}/relationships`, {
            method: 'POST',
            body: JSON.stringify({
                target_asset_id: targetAssetId,
                relationship_type: relationshipType,
                description: options.description || null,
                criticality: options.criticality || 3.0
            })
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
            body: JSON.stringify({ cidr, community })
        });
    }

    async getDiscoveredSoftware() {
        return this.request('/software/discovered');
    }

    async getSoftwareLicenses() {
        return this.request('/software');
    }

    async collectBarcodeScan(serial_number, scan_type = 'VERIFY', location = null) {
        return this.request('/collect/barcode', {
            method: 'POST',
            body: JSON.stringify({ serial_number, scan_type, location })
        });
    }

    async triggerAdSync() {
        return this.request('/collect/users/trigger', {
            method: 'POST'
        });
    }

    async forgotPassword(email) {
        return this.request('/auth/forgot-password', {
            method: 'POST',
            body: JSON.stringify({ email })
        });
    }

    async resetPassword(token, newPassword) {
        return this.request('/auth/reset-password', {
            method: 'POST',
            body: JSON.stringify({ token, new_password: newPassword })
        });
    }

    // Discovery Scan History & Diff Tracking
    async getDiscoveryScans(limit = 50, agentId = null) {
        const params = new URLSearchParams({ limit: limit.toString() });
        if (agentId) params.append('agent_id', agentId);
        return this.request(`/agents/scans?${params.toString()}`);
    }

    async getScanDiffs(scanId) {
        return this.request(`/agents/scans/${scanId}/diffs`);
    }

    async getAssetChangeHistory(assetId, limit = 100) {
        return this.request(`/agents/assets/${assetId}/history?limit=${limit}`);
    }

    // Audit Logging (Phase 10)
    async getAuditLogs(params = {}) {
        const query = new URLSearchParams(params).toString();
        return this.request(`/audit/logs${query ? `?${query}` : ''}`);
    }

    async getAuditStats() {
        return this.request('/audit/stats');
    }

    // Port Policies
    async getPortPolicies(params = {}) {
        const query = new URLSearchParams(params).toString();
        const url = query ? `/port-policies?${query}` : '/port-policies';
        return this.request(url);
    }

    async getPortPolicy(id) {
        return this.request(`/port-policies/${id}`);
    }

    async createPortPolicy(data) {
        return this.request('/port-policies', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    async updatePortPolicy(id, data) {
        return this.request(`/port-policies/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    }

    async deletePortPolicy(id) {
        return this.request(`/port-policies/${id}`, {
            method: 'DELETE',
        });
    }

    async assignPortPolicyTargets(policyId, targets) {
        return this.request(`/port-policies/${policyId}/targets`, {
            method: 'POST',
            body: JSON.stringify(targets),
        });
    }

    async getPortPolicyEnforcement(policyId) {
        return this.request(`/port-policies/${policyId}/enforcement`);
    }

    // Automation Rules
    async getAutomationRules() {
        return this.request('/tickets/automation/rules');
    }

    async createAutomationRule(ruleData) {
        return this.request('/tickets/automation/rules', {
            method: 'POST',
            body: JSON.stringify(ruleData),
        });
    }

    async updateAutomationRule(ruleId, ruleData) {
        return this.request(`/tickets/automation/rules/${ruleId}`, {
            method: 'PATCH',
            body: JSON.stringify(ruleData),
        });
    }

    async deleteAutomationRule(ruleId) {
        return this.request(`/tickets/automation/rules/${ruleId}`, {
            method: 'DELETE',
        });
    }

    // SLA Policies
    async getSLAPolicies() {
        return this.request('/tickets/sla-policies');
    }

    async createSLAPolicy(policyData) {
        const { name, priority, res_min, rem_min } = policyData;
        const params = new URLSearchParams({ name, priority, res_min, rem_min });
        return this.request(`/tickets/sla-policies?${params.toString()}`, {
            method: 'POST',
        });
    }

    async deleteSLAPolicy(policyId) {
        return this.request(`/tickets/sla-policies/${policyId}`, {
            method: 'DELETE',
        });
    }

    async updateSLAPolicy(policyId, policyData) {
        return this.patch(`/tickets/sla-policies/${policyId}`, policyData);
    }

    // Assignment Groups
    async getAssignmentGroups() {
        return this.request('/groups/');
    }

    async createAssignmentGroup(groupData) {
        return this.post('/groups/', groupData);
    }

    async deleteAssignmentGroup(id) {
        return this.delete(`/groups/${id}`);
    }

    async addGroupMember(groupId, userId) {
        return this.post(`/groups/${groupId}/members/${userId}`);
    }

    async removeGroupMember(groupId, userId) {
        return this.delete(`/groups/${groupId}/members/${userId}`);
    }

    // Tasks
    async getTicketTasks(ticketId) {
        return this.request(`/tasks/ticket/${ticketId}`);
    }

    async createTask(taskData) {
        return this.post('/tasks/', taskData);
    }

    async updateTask(taskId, taskData) {
        return this.patch(`/tasks/${taskId}`, taskData);
    }

    async deleteTask(taskId) {
        return this.delete(`/tasks/${taskId}`);
    }

    // Patch Management
    async getPatches() {
        return this.get('/patch-management');
    }

    async getPatchCompliance() {
        return this.get('/patch-management/compliance');
    }

    async getPatchDeployments(params = {}) {
        const query = new URLSearchParams(params).toString();
        return this.get(`/patch-management/deployments${query ? `?${query}` : ''}`);
    }

    async deployPatch(patchId, assetId) {
        return this.post('/patch-management/deploy', { patch_id: patchId, asset_id: assetId });
    }

    async deployPatchBulk(patchId, targetGroup = "ALL") {
        return this.post('/patch-management/deploy-bulk', { patch_id: patchId, target_group: targetGroup });
    }

    async schedulePatch(patchId, scheduledAt, targetGroup = "ALL") {
        return this.post('/patch-management/schedule', {
            patch_id: patchId,
            scheduled_at: scheduledAt,
            target_group: targetGroup
        });
    }

    async retryPatch(deploymentId) {
        return this.post(`/patch-management/retry/${deploymentId}`);
    }

    async rollbackPatch(deploymentId) {
        return this.post(`/patch-management/rollback/${deploymentId}`);
    }

    async exportCompliance() {
        // Since it's a StreamingResponse, we fetch as text (CSV) and return a blob URL
        const data = await this.get('/patch-management/export/compliance');
        // If the data is already a string (parsed text), wrap it
        // Note: The request helper in apiClient might try to parse it as JSON if content-type is json.
        // But StreamingResponse is set to text/csv.
        const blob = new Blob([typeof data === 'string' ? data : JSON.stringify(data)], { type: 'text/csv' });
        return URL.createObjectURL(blob);
    }

    async getPatchSyncStatus() {
        return this.get('/patch-management/sync-status');
    }

    async triggerPatchSync() {
        return this.post('/patch-management/sync');
    }

    async getPatchJobs() {
        return this.get('/patch-management/jobs');
    }

    async getPatchJob(jobId) {
        return this.get(`/patch-management/jobs/${jobId}`);
    }

    async getPatchJobLogs(jobId) {
        return this.get(`/patch-management/jobs/${jobId}/logs`);
    }

    async approvePatchJob(jobId) {
        return this.post(`/patch-management/jobs/${jobId}/approve`);
    }

    async uploadPatchBinary(patchId, file) {
        const formData = new FormData();
        formData.append('file', file);
        return this.request(`/upload/patch/${patchId}`, {
            method: 'POST',
            body: formData,
        });
    }

    // Notifications
    async getNotifications(limit = 20) {
        return this.get(`/notifications?limit=${limit}`);
    }

    async markNotificationRead(id) {
        return this.patch(`/notifications/${id}/read`, {});
    }

    async markAllNotificationsRead() {
        return this.post('/notifications/read-all', {});
    }

    async getExecutiveSummary() {
        return this.get('/analytics/executive/summary');
    }
}

// Export singleton instance
const apiClient = new ApiClient();
export default apiClient;
