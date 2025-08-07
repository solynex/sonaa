class Auth {
    constructor() {
        this.currentUser = null;
        this.permissions = {};
    }

    async login(email, password) {
        try {
            const response = await api.login(email, password);
            this.currentUser = response.user;
            this.permissions = response.user.roleId?.permissions || {};
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async checkAuth() {
        try {
            const response = await api.getCurrentUser();
            this.currentUser = response.user;
            this.permissions = response.user.roleId?.permissions || {};
            return true;
        } catch (error) {
            this.logout();
            return false;
        }
    }

    logout() {
        api.clearToken();
        this.currentUser = null;
        this.permissions = {};
    }

    hasPermission(permission) {
        return this.permissions[permission] === true;
    }

    isAdmin() {
        return this.currentUser?.roleId?.name === 'Admin';
    }
}

const auth = new Auth();