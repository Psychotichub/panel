document.addEventListener('DOMContentLoaded', function() {
    // Add a small delay to ensure auth-utils is loaded
    setTimeout(() => {
        // Check if user is authenticated
        if (!isAuthenticated()) {
            //console.log('Not authenticated, redirecting to login page');
            window.location.href = '/login';
            return;
        }

        // Role guard: managers are not allowed on normal index
        const user = getCurrentUser();
        if (user && user.role === 'manager') {
            window.location.href = '/manager-dashboard';
            return;
        }

        // Display welcome message with username
        if (user) {
            const welcomeElement = document.getElementById('welcome-message');
            if (welcomeElement) {
                welcomeElement.textContent = `Welcome, ${user.username}! (${user.role})`;
            }
        }

        // Apply role-based UI changes
        applyRoleBasedUIChanges();
        
        // Display authentication status
        //console.log('Index page loaded, authentication verified');
    }, 100);
});