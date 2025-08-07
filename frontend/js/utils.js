const utils = {
    getEl(id) {
        return document.getElementById(id);
    },

    formatDate(date) {
        if (!date) return 'N/A';
        return new Date(date).toLocaleDateString('ar-EG');
    },

    getInitials(name) {
        if (!name) return '';
        const parts = name.split(' ');
        if (parts.length > 1) {
            return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`;
        }
        return name.substring(0, 2);
    },

    generateAvatarColor(name) {
        let hash = 0;
        for (let i = 0; i < name.length; i++) {
            hash = name.charCodeAt(i) + ((hash << 5) - hash);
            hash = hash & hash;
        }
        let color = '#';
        for (let i = 0; i < 3; i++) {
            let value = (hash >> (i * 8)) & 0xFF;
            color += ('00' + value.toString(16)).substr(-2);
        }
        return color;
    },

    showLoading() {
        const loader = document.createElement('div');
        loader.id = 'global-loader';
        loader.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
        loader.innerHTML = '<div class="bg-white p-4 rounded-lg"><i class="fas fa-spinner fa-spin text-3xl text-primary"></i></div>';
        document.body.appendChild(loader);
    },

    hideLoading() {
        const loader = document.getElementById('global-loader');
        if (loader) loader.remove();
    },

    showError(message) {
        const toast = document.createElement('div');
        toast.className = 'fixed top-4 right-4 bg-red-500 text-white p-4 rounded-lg shadow-lg z-50';
        toast.innerHTML = `<i class="fas fa-exclamation-circle ml-2"></i>${message}`;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 5000);
    },

    showSuccess(message) {
        const toast = document.createElement('div');
        toast.className = 'fixed top-4 right-4 bg-green-500 text-white p-4 rounded-lg shadow-lg z-50';
        toast.innerHTML = `<i class="fas fa-check-circle ml-2"></i>${message}`;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    },

    async fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result);
            reader.onerror = error => reject(error);
        });
    }
};