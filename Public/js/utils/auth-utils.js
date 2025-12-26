// Authentication utilities for handling login, permissions, and role-based access control

// Function to get the token from localStorage or cookies
function getToken() {
    // Prefer a persistent token if available so user stays signed in across restarts
    const localToken = localStorage.getItem('token');
    if (localToken) return localToken;
    const sessionToken = sessionStorage.getItem('token');
    if (sessionToken) return sessionToken;
    // Grace window for non-remembered logins across browser restarts
    const until = Number(localStorage.getItem('sessionTokenUntil') || 0);
    const sessionBackup = localStorage.getItem('sessionToken');
    if (sessionBackup && until > Date.now()) return sessionBackup;
    return null;
}

// Function to decode JWT token without verification
function decodeToken(token) {
    try {
        if (!token) return null;
        
        // Split the token and get the payload part
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const payload = JSON.parse(window.atob(base64));
        
        // Check if token is expired
        if (payload.exp && payload.exp * 1000 < Date.now()) {
            //console.log('Token has expired');
            return null;
        }
        
        //console.log('Token decoded successfully:', payload);
        return payload;
    } catch (e) {
        console.error('Error decoding token:', e);
        return null;
    }
}

// Function to get the current user information
function getCurrentUser() {
    const userStr = localStorage.getItem('user');
    
    // If user data exists in localStorage, use it
    if (userStr) {
        //console.log('User retrieved from localStorage');
        return JSON.parse(userStr);
    }
    
    // Otherwise try to get user info from token
    const token = getToken();
    if (token) {
        const decoded = decodeToken(token);
        if (decoded) {
            //console.log('User retrieved from token payload');
            return {
                id: decoded.id,
                username: decoded.username,
                role: decoded.role
            };
        }
    }
    
    //console.log('No user found');
    return null;
}

// Function to check if user is authenticated
function isAuthenticated() {
    const token = getToken();
    
    // If no token, user is not authenticated
    if (!token) {
        //console.log('No token found, not authenticated');
        return false;
    }
    
    // Check if token is valid by decoding it
    const decoded = decodeToken(token);
    const isAuth = !!decoded;
    
    //console.log('Authentication check result:', isAuth, 'Token exists:', !!token);
    return isAuth;
}

// Try to bootstrap auth from HTTP-only cookie by calling /api/auth/me
async function checkCookieAuth() {
    try {
        const resp = await fetch('/api/auth/me', {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include'
        });
        if (!resp.ok) return false;
        const data = await resp.json();
        if (data && data.user) {
            try { localStorage.setItem('user', JSON.stringify(data.user)); } catch (_) { /* no-op */ }
            // If server returns a token, persist it to avoid loops
            if (data.token) {
                try { localStorage.setItem('token', data.token); } catch (_) { /* no-op */ }
            }
            return true;
        }
        return false;
    } catch (_) { return false; }
}

// Function to check if current user has admin role
function isAdmin() {
    const user = getCurrentUser();
    return user && user.role === 'admin';
}

// Function to check if user has required role
function hasRequiredRole(requiredRole) {
    if (!isAuthenticated()) return false;
    
    const user = getCurrentUser();
    if (requiredRole === 'admin') {
        return user.role === 'admin';
    }
    
    return true; // Regular user role is sufficient
}
// Mark as used for linter without changing behavior
void hasRequiredRole;

// Function to check authorization for specific actions
function canPerformAction(action) {
    if (!isAuthenticated()) return false;
    
    const user = getCurrentUser();
    
    switch (action) {
        case 'delete':
            return user.role === 'admin';
        case 'addMaterial':
            return user.role === 'admin';
        case 'viewTotalPrice':
            return user.role === 'admin';
        case 'viewMonthlyReport':
            return user.role === 'admin';
        default:
            return true;
    }
}
// Mark as used
void canPerformAction;

// Function to logout user (clears all storage and ends server session)
async function logout(redirectTo) {
    try {
        await fetch('/api/auth/logout', {
            method: 'POST',
            credentials: 'include'
        });
    } catch (error) {
        console.error('Error logging out:', error);
    }

    // Clear all client-side storage
    try { localStorage.clear(); } catch (_) { /* ignore */ }
    try { sessionStorage.clear(); } catch (_) { /* ignore */ }

    // Redirect (default to user login)
    window.location.href = redirectTo || '/login';
}

// Function to add authorization header to fetch requests
function authHeader() {
    const token = getToken();
    const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
    //console.log('Auth headers:', token ? 'Authorization header added' : 'No authorization header');
    return headers;
}
// Mark as used
void authHeader;

// Function to store token with cross-browser compatibility in mind
function storeAuthData(token, user, remember = false) {
    try {
        // Try to clear any existing items first
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        sessionStorage.removeItem('token');
        
        // Store new values
        // Always persist user; choose token storage by remember
        localStorage.setItem('user', JSON.stringify(user));
        if (remember) {
            localStorage.setItem('token', token);
        } else {
            // Still store in localStorage with an expiry marker to avoid immediate logout after restart
            // Fallback window: 12 hours
            sessionStorage.setItem('token', token);
            const until = Date.now() + (12 * 60 * 60 * 1000);
            localStorage.setItem('sessionTokenUntil', String(until));
            localStorage.setItem('sessionToken', token);
        }
        
        // Verify storage was successful
        const storedToken = remember ? localStorage.getItem('token') : (sessionStorage.getItem('token') || localStorage.getItem('sessionToken'));
        //console.log('Token storage verification:', storedToken === token ? 'Success' : 'Failed');
        
        return storedToken === token;
    } catch (error) {
        console.error('Error storing authentication data:', error);
        return false;
    }
}
// Mark as used
void storeAuthData;

// Function to make authenticated API requests
async function authenticatedFetch(url, options = {}) {
    // Ensure options.headers exists
    if (!options.headers) {
        options.headers = {};
    }

    // Add authorization header
    let token = getToken();
    // Grace period: if no token in localStorage but a recent session token exists, use it
    if (!token) {
        const until = Number(localStorage.getItem('sessionTokenUntil') || 0);
        const sessionBackup = localStorage.getItem('sessionToken');
        if (sessionBackup && until > Date.now()) {
            token = sessionBackup;
        }
    }
    options.headers = {
        ...options.headers,
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        'Content-Type': 'application/json'
    };

    // Attach site/company context for manager/admin when available in localStorage
    try {
        const lsSite = localStorage.getItem('managerSite');
        const lsCompany = localStorage.getItem('managerCompany');
        if (lsSite && lsCompany) {
            if (!options.headers['X-Site']) options.headers['X-Site'] = lsSite;
            if (!options.headers['X-Company']) options.headers['X-Company'] = lsCompany;
        }
    } catch (_) { /* ignore storage errors */ }
    
    // Always include credentials to send cookies
    options.credentials = 'include';

    // Debug the request
    //console.log(`Authenticated request to: ${url}`);
    //console.log('Request has auth token:', !!token);

    try {
        const response = await fetch(url, options);
        
        // Log the response status
        //console.log(`Response status for ${url}: ${response.status}`);
        
        // Handle authentication errors
        if (response.status === 401) {
            console.error('Authentication error: Unauthorized access');
            
            // Try to refresh token first before logging out
            const refreshed = await tryRefreshToken();
            if (refreshed) {
                // Retry the original request with the new token
                const newToken = getToken();
                options.headers['Authorization'] = `Bearer ${newToken}`;
                return fetch(url, options);
            }
            
            // If refresh failed, logout
            logout();
            throw new Error('Your session has expired. Please login again.');
        }
        
        // If response is 403 (Forbidden), throw permission error
        if (response.status === 403) {
            throw new Error('You do not have permission to perform this action.');
        }
        
        return response;
    } catch (error) {
        console.error('API request failed:', error);
        throw error;
    }
}
// Mark as used
void authenticatedFetch;

// Function to refresh token
async function tryRefreshToken() {
    try {
        const token = getToken();
        if (!token) return false;
        
        // Attempt to refresh token
        const response = await fetch('/api/auth/refresh-token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include' // Include cookies
        });
        
        if (response.ok) {
            const data = await response.json();
            if (data.token) {
                // Store the new token
                localStorage.setItem('token', data.token);
                if (data.user) {
                    localStorage.setItem('user', JSON.stringify(data.user));
                }
                return true;
            }
        }
        
        // If we get here, refresh failed
        return false;
    } catch (error) {
        console.error('Error refreshing token:', error);
        return false;
    }
}

// Check for authentication on page load and redirect if needed
document.addEventListener('DOMContentLoaded', () => {
    //console.log("Auth utils loaded, checking authentication...");
    
    // Get the current page URL
    const currentPage = window.location.pathname;
    //console.log("Current page:", currentPage);
    
    // Pages that don't require authentication
    const publicPages = ['/login', '/html/login.html', '/manager-login'];
    
    // Add a small delay to ensure all scripts are loaded
    setTimeout(async () => {
        const isPublic = publicPages.some(page => currentPage === page || currentPage.includes(page));
        const authed = isAuthenticated();

        if (!isPublic && !authed) {
            // Attempt to bootstrap from cookie session before redirecting
            const cookieOk = await checkCookieAuth();
            if (!cookieOk) {
                window.location.href = '/login';
                return;
            }
        }

        // Enforce role-based page access when authenticated
        const user = getCurrentUser();
        if (authed && user) {
            const isManagerPage = currentPage.startsWith('/manager-') || currentPage.startsWith('/manager/');
            if (user.role === 'manager') {
                // Managers can only access manager pages
                if (!isManagerPage && !isPublic) {
                    window.location.href = '/manager-dashboard';
                    return;
                }
            } else {
                // Non-managers cannot access manager pages
                if (isManagerPage) {
                    window.location.href = '/index';
                    return;
                }
            }
        }

        // Apply role-based UI tweaks
        if (authed || (!isPublic && localStorage.getItem('user'))) {
            applyRoleBasedUIChanges();
        }
    }, 100);
});

// Apply role-based changes to UI elements
function applyRoleBasedUIChanges() {
    // Hide elements with 'admin-only' class for non-admin users
    if (!isAdmin()) {
        const adminOnlyElements = document.querySelectorAll('.admin-only');
        adminOnlyElements.forEach(element => {
            element.style.display = 'none';
        });
    }
    
    //console.log("Security utilities loaded successfully");
} 