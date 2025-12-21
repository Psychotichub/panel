// Manager Create User JavaScript
document.addEventListener('DOMContentLoaded', function() {
    
    const createUserForm = document.getElementById('createUserForm');
    const errorMessage = document.getElementById('error-message');
    const successMessage = document.getElementById('success-message');
    const backBtn = document.getElementById('backBtn');
    const clearBtn = document.getElementById('clearBtn');
    const currentUserSpan = document.getElementById('currentUser');
    
    // Check authentication
    function checkAuthentication() {
        const token = (typeof getToken === 'function') ? getToken() : (sessionStorage.getItem('token') || localStorage.getItem('token'));
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        const managerAccess = localStorage.getItem('managerAccess');
        
        if (!token || !managerAccess || (user.role !== 'manager' && user.role !== 'admin')) {
            console.log('❌ Authentication failed - redirecting to manager login');
            window.location.href = '/manager-login';
            return false;
        }
        
        console.log('✅ Authentication verified for:', user.username);
        currentUserSpan.textContent = `${user.username} (${user.role})`;

        // Apply UI constraints based on creator role
        applyRoleAndSiteConstraints(user);
        return true;
    }

    function applyRoleAndSiteConstraints(currentUser) {
        const roleSelect = document.getElementById('role');
        const siteInput = document.getElementById('site');

        if (roleSelect) {
            // Restrict role options based on current user role
            if (currentUser.role === 'manager') {
                // Manager can only create admin users
                Array.from(roleSelect.options).forEach(opt => {
                    if (opt.value !== 'admin') opt.remove();
                });
                roleSelect.value = 'admin';
            } else if (currentUser.role === 'admin') {
                // Admin cannot create manager accounts
                Array.from(roleSelect.options).forEach(opt => {
                    if (opt.value === 'manager') opt.remove();
                });
                if (roleSelect.value === 'manager') roleSelect.value = 'user';
            }
        }

        if (siteInput && currentUser.role === 'admin' && currentUser.site) {
            // Admin must create within their own site: lock the site field to their site
            siteInput.value = currentUser.site;
            siteInput.setAttribute('readonly', 'true');
            siteInput.setAttribute('aria-readonly', 'true');
            siteInput.placeholder = currentUser.site;
            siteInput.title = `Site is restricted to your site: ${currentUser.site}`;
        }
    }
    
    // Show message function
    function showMessage(message, type = 'info') {
        if (type === 'error') {
            errorMessage.textContent = message;
            errorMessage.style.display = 'block';
            successMessage.style.display = 'none';
        } else if (type === 'success') {
            successMessage.textContent = message;
            successMessage.style.display = 'block';
            errorMessage.style.display = 'none';
        }
        
        // Auto-hide after 5 seconds
        setTimeout(() => {
            errorMessage.style.display = 'none';
            successMessage.style.display = 'none';
        }, 5000);
    }
    
    // Load recent users
    async function loadRecentUsers() {
        try {
            const token = (typeof getToken === 'function') ? getToken() : (sessionStorage.getItem('token') || localStorage.getItem('token'));
            const response = await fetch('/api/auth/users/recent', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                displayRecentUsers(data.users || []);
            }
        } catch (error) {
            console.error('❌ Error loading recent users:', error);
        }
    }
    
    // Display recent users in table
    function displayRecentUsers(users) {
        const tbody = document.getElementById('recentUsersTableBody');
        
        if (users.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="no-data">No users created yet.</td></tr>';
            return;
        }
        
        tbody.innerHTML = users.map(user => `
            <tr>
                <td>${user.username}</td>
                <td><span class="badge bg-${getRoleBadgeColor(user.role)}">${user.role}</span></td>
                <td>${user.site || 'N/A'}</td>
                <td>${user.company || 'N/A'}</td>
                <td>${new Date(user.createdAt).toLocaleDateString()}</td>
            </tr>
        `).join('');
    }
    
    // Get badge color for role
    function getRoleBadgeColor(role) {
        switch (role) {
            case 'admin': return 'danger';
            case 'manager': return 'warning';
            case 'user': return 'primary';
            default: return 'secondary';
        }
    }
    
    // Handle form submission
    createUserForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        if (!checkAuthentication()) return;
        
        const username = document.getElementById('username').value.trim();
        const role = document.getElementById('role').value;
        const site = document.getElementById('site').value.trim();
        const company = document.getElementById('company').value.trim();
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        
        // Validation
        if (!username || !password || !confirmPassword || !role || !site || !company) {
            showMessage('Please fill in all required fields.', 'error');
            return;
        }

        // Enforce creator rules on client side (additional safety; server also enforces)
        const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
        if (currentUser.role === 'manager' && role !== 'admin') {
            showMessage('Managers can only create admin users.', 'error');
            return;
        }
        if (currentUser.role === 'admin') {
            if (role === 'manager') {
                showMessage('Admins cannot create manager accounts.', 'error');
                return;
            }
            if (currentUser.site && site.toLowerCase() !== String(currentUser.site).toLowerCase()) {
                showMessage(`Admins can only create users for their own site (${currentUser.site}).`, 'error');
                return;
            }
        }
        
        if (password !== confirmPassword) {
            showMessage('Passwords do not match.', 'error');
            return;
        }
        
        if (password.length < 6) {
            showMessage('Password must be at least 6 characters long.', 'error');
            return;
        }
        
        try {
            console.log('🔧 Creating new user:', { username, role, site, company });
            showMessage('Creating user...', 'info');
            
            const token = (typeof getToken === 'function') ? getToken() : (sessionStorage.getItem('token') || localStorage.getItem('token'));
            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    username,
                    password,
                    role,
                    site,
                    company,
                    email: email || undefined
                })
            });
            
            const data = await response.json();
            
            if (response.ok && data.success) {
                console.log('✅ User created successfully:', data.user);
                showMessage(`User "${username}" created successfully!`, 'success');
                
                // Clear form
                createUserForm.reset();
                
                // Reload recent users
                await loadRecentUsers();
                
            } else {
                console.log('❌ User creation failed:', data.message);
                showMessage(data.message || 'Failed to create user.', 'error');
            }
            
        } catch (error) {
            console.error('❌ Error creating user:', error);
            showMessage('Network error. Please try again.', 'error');
        }
    });
    
    // Clear form
    clearBtn.addEventListener('click', function() {
        createUserForm.reset();
        showMessage('Form cleared.', 'info');
    });
    
    // Back to dashboard
    backBtn.addEventListener('click', function() {
        window.location.href = '/manager-dashboard';
    });
    
    // Initialize
    if (checkAuthentication()) {
        loadRecentUsers();
    }
}); 