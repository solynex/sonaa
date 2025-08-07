class API {
    constructor() {
        this.baseURL = 'http://localhost:5000/api';
        this.token = localStorage.getItem('token');
    }

    setToken(token) {
        this.token = token;
        localStorage.setItem('token', token);
    }

    clearToken() {
        this.token = null;
        localStorage.removeItem('token');
    }

    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const config = {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            }
        };

        if (this.token) {
            config.headers.Authorization = `Bearer ${this.token}`;
        }

        if (options.body && typeof options.body === 'object') {
            config.body = JSON.stringify(options.body);
        }

        try {
            const response = await fetch(url, config);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Request failed');
            }

            return data;
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    }

    async login(email, password) {
        const response = await this.request('/auth/login', {
            method: 'POST',
            body: { email, password }
        });
        this.setToken(response.token);
        return response;
    }

    async getCurrentUser() {
        return await this.request('/auth/me');
    }

    async getUsers() {
        return await this.request('/users');
    }

    async createUser(userData) {
        const roles = await this.getRoles();
        if (roles.length > 0 && !userData.roleId) {
            userData.roleId = roles[0]._id;
        }
        return await this.request('/users', {
            method: 'POST',
            body: userData
        });
    }
    

    async updateUser(userId, updates) {
        return await this.request(`/users/${userId}`, {
            method: 'PUT',
            body: updates
        });
    }

    async getRoles() {
        return await this.request('/roles');
    }

    async createRole(roleData) {
        return await this.request('/roles', {
            method: 'POST',
            body: roleData
        });
    }

    async updateRole(roleId, updates) {
        return await this.request(`/roles/${roleId}`, {
            method: 'PUT',
            body: updates
        });
    }

    async deleteRole(roleId) {
        return await this.request(`/roles/${roleId}`, {
            method: 'DELETE'
        });
    }

    async getDepartments() {
        return await this.request('/departments');
    }

    async createDepartment(name) {
        return await this.request('/departments', {
            method: 'POST',
            body: { name }
        });
    }

    async deleteDepartment(deptId) {
        return await this.request(`/departments/${deptId}`, {
            method: 'DELETE'
        });
    }

    async getClients() {
        return await this.request('/clients');
    }

    async createClient(clientData) {
        return await this.request('/clients', {
            method: 'POST',
            body: clientData
        });
    }

    async getProjects() {
        return await this.request('/projects');
    }

    async getProject(projectId) {
        return await this.request(`/projects/${projectId}`);
    }

    async createProject(projectData) {
        return await this.request('/projects', {
            method: 'POST',
            body: projectData
        });
    }

    async updateProject(projectId, updates) {
        return await this.request(`/projects/${projectId}`, {
            method: 'PUT',
            body: updates
        });
    }

    async submitProjectTask(projectId, submission) {
        return await this.request(`/projects/${projectId}/submit`, {
            method: 'POST',
            body: submission
        });
    }

    async approveProjectStage(projectId) {
        return await this.request(`/projects/${projectId}/approve`, {
            method: 'POST'
        });
    }

    async requestProjectRevision(projectId, notes) {
        return await this.request(`/projects/${projectId}/revision`, {
            method: 'POST',
            body: { notes }
        });
    }

    async getLeads() {
        return await this.request('/leads');
    }

    async createLead(leadData) {
        return await this.request('/leads', {
            method: 'POST',
            body: leadData
        });
    }

    async getOpportunities() {
        return await this.request('/opportunities');
    }

    async createOpportunity(oppData) {
        return await this.request('/opportunities', {
            method: 'POST',
            body: oppData
        });
    }

    async getInvoices() {
        return await this.request('/invoices');
    }

    async createInvoice(invoiceData) {
        return await this.request('/invoices', {
            method: 'POST',
            body: invoiceData
        });
    }

    async getInvoiceSettings() {
        return await this.request('/invoice-settings');
    }

    async updateInvoiceSettings(settings) {
        return await this.request('/invoice-settings', {
            method: 'PUT',
            body: settings
        });
    }

    async getDashboardStats() {
        return await this.request('/dashboard/stats');
    }
}

const api = new API();