// Simple security utilities to be included on all pages
document.addEventListener('DOMContentLoaded', function() {
    // Check authentication status
    function checkAuth() {
        // Prefer shared auth-utils getter when available
        const token = (typeof getToken === 'function') 
            ? getToken() 
            : (sessionStorage.getItem('token') || localStorage.getItem('token'));
        const user = localStorage.getItem('user');
        
        // Get current page path
        const currentPath = window.location.pathname;
        
        // Skip auth check for login page
        if (currentPath === '/login' || currentPath === '/html/login.html') {
            return;
        }
        
        // If no token or user, redirect to login
        if (!token || !user) {
            //console.log('No authentication detected, redirecting to login page');
            window.location.href = '/login';
            return;
        }
        
        // Add authorization header to all fetch requests
        const originalFetch = window.fetch;
        window.fetch = function(url, options = {}) {
            // If it's already an authenticated fetch, don't modify
            if (options?.headers?.Authorization) {
                return originalFetch(url, options);
            }
            
            // Don't add auth headers for public endpoints
            if (url.includes('/api/auth/login')) {
                return originalFetch(url, options);
            }
            
            // Add authorization header to all requests
            if (!options.headers) {
                options.headers = {};
            }
            // Resolve token dynamically each call to honor sessionStorage/localStorage
            const currentToken = (typeof getToken === 'function') 
                ? getToken() 
                : (sessionStorage.getItem('token') || localStorage.getItem('token'));
            if (currentToken) {
                options.headers = {
                    ...options.headers,
                    'Authorization': `Bearer ${currentToken}`,
                    'Content-Type': 'application/json'
                };
            }
            
            return originalFetch(url, options);
        };
    }
    
    // Apply role-based UI changes
    function applyRoleBasedUI() {
        try {
            const userStr = localStorage.getItem('user');
            if (!userStr) return;
            
            const user = JSON.parse(userStr);
            const isAdmin = user.role === 'admin';
            
            // Hide admin-only elements for non-admin users
            if (!isAdmin) {
                const adminElements = document.querySelectorAll('.admin-only');
                adminElements.forEach(el => {
                    el.style.display = 'none';
                });
            }
        } catch (err) {
            console.error('Error applying role-based UI:', err);
        }
    }
    
    // Execute security checks
    checkAuth();
    applyRoleBasedUI();
    
    //console.log('Security utilities loaded successfully');
}); 