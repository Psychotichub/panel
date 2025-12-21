document.addEventListener('DOMContentLoaded', () => {
    console.log('Register page loaded');
    
    const registerForm = document.getElementById('register-form');
    const errorMessage = document.getElementById('error-message');
    const successMessage = document.getElementById('success-message');
    const siteInput = document.getElementById('site');
    
    // Form validation function
    function validateForm() {
        const site = document.getElementById('site').value.trim();
        const company = document.getElementById('company').value.trim();
        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value;
        const passwordConfirm = document.getElementById('password-confirm').value;
        const role = document.getElementById('role').value;
        
        // Clear previous messages
        errorMessage.style.display = 'none';
        successMessage.style.display = 'none';
        
        // Check if all required fields are filled
        if (!site) {
            showError('Site is required');
            return false;
        }
        
        if (!company) {
            showError('Company is required');
            return false;
        }
        
        if (!username) {
            showError('Username is required');
            return false;
        }
        
        if (!password) {
            showError('Password is required');
            return false;
        }
        
        if (!passwordConfirm) {
            showError('Password confirmation is required');
            return false;
        }
        
        // Validate username format (alphanumeric and underscore only)
        if (!/^[a-zA-Z0-9_]+$/.test(username)) {
            showError('Username can only contain letters, numbers, and underscores');
            return false;
        }
        
        // Validate username length
        if (username.length < 3 || username.length > 20) {
            showError('Username must be between 3 and 20 characters');
            return false;
        }
        
        // Validate password strength
        if (password.length < 6) {
            showError('Password must be at least 6 characters long');
            return false;
        }
        
        // Check if passwords match
        if (password !== passwordConfirm) {
            showError('Passwords do not match');
            return false;
        }
        
        // Validate role
        if (!['user', 'admin'].includes(role)) {
            showError('Invalid role selected');
            return false;
        }
        
        // Check if trying to create admin account without being logged in as admin
        if (role === 'admin') {
            if (typeof isAuthenticated === 'function' && !isAuthenticated()) {
                showError('You must be logged in as an admin to create admin accounts');
                return false;
            }
            
            if (typeof isAdmin === 'function' && !isAdmin()) {
                showError('Only admin users can create admin accounts');
                return false;
            }
        }

        // If admin is creating a user/admin, ensure site equals admin's site
        try {
            if (typeof isAdmin === 'function' && isAdmin()) {
                const currentUser = typeof getCurrentUser === 'function' ? getCurrentUser() : JSON.parse(localStorage.getItem('user') || '{}');
                if (currentUser && currentUser.site) {
                    const inputSite = document.getElementById('site');
                    if (inputSite && inputSite.value.trim().toLowerCase() !== String(currentUser.site).toLowerCase()) {
                        showError(`Admins can only create users for their own site (${currentUser.site}).`);
                        return false;
                    }
                }
            }
        } catch (e) { /* ignore */ }
        
        return true;
    }
    
    // Function to show error message
    function showError(message) {
        errorMessage.textContent = message;
        errorMessage.style.display = 'block';
        successMessage.style.display = 'none';
    }
    
    // Function to show success message
    function showSuccess(message) {
        successMessage.textContent = message;
        successMessage.style.display = 'block';
        errorMessage.style.display = 'none';
    }
    
    // Function to clear form
    function clearForm() {
        document.getElementById('site').value = '';
        document.getElementById('company').value = '';
        document.getElementById('username').value = '';
        document.getElementById('password').value = '';
        document.getElementById('password-confirm').value = '';
        document.getElementById('role').value = 'user';
    }
    
    // Handle form submission
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // Validate form
        if (!validateForm()) {
            return;
        }
        
        // Get form data
        const formData = {
            site: document.getElementById('site').value.trim(),
            company: document.getElementById('company').value.trim(),
            username: document.getElementById('username').value.trim(),
            password: document.getElementById('password').value,
            role: document.getElementById('role').value
        };
        
        try {
            console.log('Attempting to register user:', formData.username);
            
            // Prepare headers
            const headers = {
                'Content-Type': 'application/json'
            };
            
            // Add authorization header if user is logged in
            if (typeof authHeader === 'function') {
                const authHeaders = authHeader();
                Object.assign(headers, authHeaders);
            } else {
                // Fallback to basic token check
                const token = (typeof getToken === 'function') ? getToken() : (sessionStorage.getItem('token') || localStorage.getItem('token'));
                if (token) {
                    headers['Authorization'] = `Bearer ${token}`;
                }
            }
            
            // Make registration request
            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(formData),
                credentials: 'include'
            });
            
            const data = await response.json();
            console.log('Registration response status:', response.status);
            
            if (!response.ok) {
                throw new Error(data.message || 'Registration failed');
            }
            
            // Show success message
            showSuccess('User registered successfully!');
            
            // Clear form after successful registration
            clearForm();
            
            // Optionally redirect after a short delay
            setTimeout(() => {
                window.location.href = '/index';
            }, 2000);
            
        } catch (error) {
            console.error('Registration error:', error);
            showError(error.message);
        }
    });
    
    // Real-time password confirmation validation
    const passwordConfirmField = document.getElementById('password-confirm');
    const passwordField = document.getElementById('password');
    
    passwordConfirmField.addEventListener('input', () => {
        const password = passwordField.value;
        const passwordConfirm = passwordConfirmField.value;
        
        if (passwordConfirm && password !== passwordConfirm) {
            passwordConfirmField.setCustomValidity('Passwords do not match');
        } else {
            passwordConfirmField.setCustomValidity('');
        }
    });
    
    passwordField.addEventListener('input', () => {
        const password = passwordField.value;
        const passwordConfirm = passwordConfirmField.value;
        
        if (passwordConfirm && password !== passwordConfirm) {
            passwordConfirmField.setCustomValidity('Passwords do not match');
        } else {
            passwordConfirmField.setCustomValidity('');
        }
    });
    
    // Real-time username validation
    const usernameField = document.getElementById('username');
    usernameField.addEventListener('input', () => {
        const username = usernameField.value.trim();
        
        if (username && !/^[a-zA-Z0-9_]+$/.test(username)) {
            usernameField.setCustomValidity('Username can only contain letters, numbers, and underscores');
        } else if (username && (username.length < 3 || username.length > 20)) {
            usernameField.setCustomValidity('Username must be between 3 and 20 characters');
        } else {
            usernameField.setCustomValidity('');
        }
    });
    
    // Real-time password strength validation
    passwordField.addEventListener('input', () => {
        const password = passwordField.value;
        
        if (password && password.length < 6) {
            passwordField.setCustomValidity('Password must be at least 6 characters long');
        } else {
            passwordField.setCustomValidity('');
        }
    });
    
    // Check authentication status on page load
    setTimeout(() => {
        if (typeof isAuthenticated === 'function' && isAuthenticated()) {
            console.log('User is authenticated');
            
            // If user is admin, show admin note
            if (typeof isAdmin === 'function' && isAdmin()) {
                console.log('User is admin');
                try {
                    // Force/register only for admin's site
                    const currentUser = typeof getCurrentUser === 'function' ? getCurrentUser() : JSON.parse(localStorage.getItem('user') || '{}');
                    if (currentUser && currentUser.site && siteInput) {
                        siteInput.value = currentUser.site;
                        siteInput.setAttribute('readonly', 'true');
                        siteInput.setAttribute('aria-readonly', 'true');
                        siteInput.placeholder = currentUser.site;
                        siteInput.title = `Site is restricted to your site: ${currentUser.site}`;
                    }
                } catch (e) { /* ignore */ }
            } else {
                // If not admin, disable admin role selection
                const roleSelect = document.getElementById('role');
                const adminOption = roleSelect.querySelector('option[value="admin"]');
                if (adminOption) {
                    adminOption.disabled = true;
                    adminOption.textContent = 'Admin (Admin privileges required)';
                }
            }
        } else {
            console.log('User is not authenticated');
            
            // If not authenticated, disable admin role selection
            const roleSelect = document.getElementById('role');
            const adminOption = roleSelect.querySelector('option[value="admin"]');
            if (adminOption) {
                adminOption.disabled = true;
                adminOption.textContent = 'Admin (Login required)';
            }
        }
    }, 150);
}); 