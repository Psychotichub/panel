// Settings Page JavaScript
class SettingsManager {
    constructor() {
        this.currentUser = null;
        this.init();
    }

    async init() {
        try {
            // Check authentication
            const token = this.getToken();
            if (!token) {
                window.location.href = '/login';
                return;
            }

            // Get current user info
            await this.loadCurrentUser();
            
            // Load user content (same for all users including admins)
            await this.loadUserContent();

            // Setup event listeners
            this.setupEventListeners();

        } catch (error) {
            console.error('Settings initialization error:', error);
            this.showError('Failed to initialize settings page');
        }
    }

    getToken() {
        return localStorage.getItem('token') || sessionStorage.getItem('token');
    }

    async loadCurrentUser() {
        try {
            const response = await fetch('/api/auth/current-user', {
                headers: {
                    'Authorization': `Bearer ${this.getToken()}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to get current user');
            }

            const data = await response.json();
            this.currentUser = data.user;

        } catch (error) {
            console.error('Error loading current user:', error);
            throw error;
        }
    }

    async loadUserContent() {
        try {
            this.showLoading();
            
            // Load user site details
            const response = await fetch('/api/settings/user-site-details', {
                headers: {
                    'Authorization': `Bearer ${this.getToken()}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to load user site details');
            }

            const data = await response.json();
            this.displayUserInfo(data.userDetails);
            this.displaySiteStats(data.siteStatistics);

            this.hideLoading();

        } catch (error) {
            console.error('Error loading user content:', error);
            this.showError('Failed to load user information');
            this.hideLoading();
        }
    }

    displayUserInfo(userDetails) {
        const userInfoContainer = document.getElementById('userInfo');
        
        userInfoContainer.innerHTML = `
            <div class="user-info-item">
                <span class="user-info-label">Username:</span>
                <span class="user-info-value">${userDetails.username}</span>
            </div>
            <div class="user-info-item">
                <span class="user-info-label">Role:</span>
                <span class="user-info-value">${userDetails.role}</span>
            </div>
            <div class="user-info-item">
                <span class="user-info-label">Company:</span>
                <span class="user-info-value">${userDetails.company}</span>
            </div>
            <div class="user-info-item">
                <span class="user-info-label">Site:</span>
                <span class="user-info-value">${userDetails.site}</span>
            </div>
            <div class="user-info-item">
                <span class="user-info-label">Account Created:</span>
                <span class="user-info-value">${new Date(userDetails.createdAt).toLocaleDateString()}</span>
            </div>
        `;
    }

    displaySiteStats(siteStats) {
        const siteStatsContainer = document.getElementById('siteStats');
        
        const statsHTML = `
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-number">${siteStats.dailyReports || 0}</div>
                    <div class="stat-label">Daily Reports</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">${siteStats.materials || 0}</div>
                    <div class="stat-label">Materials</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">${siteStats.receivedItems || 0}</div>
                    <div class="stat-label">Received Items</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">${siteStats.totalPrices || 0}</div>
                    <div class="stat-label">Total Price Records</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">${siteStats.monthlyReports || 0}</div>
                    <div class="stat-label">Monthly Reports</div>
                </div>
            </div>
            <div class="site-info">
                <h3>Site Database Information</h3>
                <p>This site has its own dedicated database for complete data isolation and security.</p>
                <p>All data operations are automatically scoped to this site only.</p>
            </div>
        `;
        
        siteStatsContainer.innerHTML = statsHTML;
    }

    setupEventListeners() {
        // Logout button
        document.getElementById('logoutBtn').addEventListener('click', () => {
            this.logout();
        });
    }

    async logout() {
        try {
            await fetch('/api/auth/logout', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.getToken()}`
                }
            });
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            // Clear all storage and redirect
            try { localStorage.clear(); } catch (_) { /* ignore */ }
            try { sessionStorage.clear(); } catch (_) { /* ignore */ }
            window.location.href = '/login';
        }
    }

    showLoading() {
        // Create loading modal if it doesn't exist
        let loadingModal = document.getElementById('loadingModal');
        if (!loadingModal) {
            loadingModal = document.createElement('div');
            loadingModal.id = 'loadingModal';
            loadingModal.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.5);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 1000;
            `;
            loadingModal.innerHTML = `
                <div style="background: white; padding: 20px; border-radius: 10px; text-align: center;">
                    <div>Loading...</div>
                </div>
            `;
            document.body.appendChild(loadingModal);
        }
        loadingModal.style.display = 'block';
    }

    hideLoading() {
        const loadingModal = document.getElementById('loadingModal');
        if (loadingModal) {
            loadingModal.style.display = 'none';
        }
    }

    showError(message) {
        alert(message); // Simple error display - could be enhanced with a modal
    }
}

// Initialize settings page when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new SettingsManager();
}); 