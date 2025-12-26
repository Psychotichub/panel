document.addEventListener('DOMContentLoaded', function() {
    fetch('/html/header.html')
        .then(response => response.text())
        .then(data => {
            document.getElementById('header-placeholder').innerHTML = data;
            displayCurrentDateTime();
            
            // Delay calling these functions until everything is loaded
            setTimeout(() => {
                updateUserInterface();
                setupLogout();
            }, 100);
        })
        .catch(error => console.error('Error fetching header:', error));
});

function displayCurrentDateTime() {
    const dateContainer = document.getElementById('date-time');
    if (dateContainer) {
        const now = new Date();
        const formattedDate = now.toLocaleDateString('sv-SE');
        const formattedTime = now.toLocaleTimeString('sv-SE');
        dateContainer.innerHTML += `<p>Now: ${formattedDate}, ${formattedTime}</p>`;
    }
}

function updateUserInterface() {
    // Check if we're on the login page - don't apply authentication to login page
    if (window.location.pathname.includes('login')) {
        return;
    }

    // Check if auth functions are available
    if (typeof getCurrentUser !== 'function') {
        console.error('Auth utilities not loaded properly');
        return;
    }

    const usernameDisplay = document.getElementById('username-display');
    const roleDisplay = document.getElementById('role-display');
    
    if (usernameDisplay && roleDisplay) {
        const user = getCurrentUser();
        
        if (user) {
            usernameDisplay.textContent = user.username;
            roleDisplay.textContent = `(${user.role})`;
            
            // Apply role-based UI changes if the function exists
            if (typeof applyRoleBasedUIChanges === 'function') {
                applyRoleBasedUIChanges();
            }
        } else {
            // If no user is logged in, redirect to login page
            window.location.href = '/login';
        }
    }
}

function setupLogout() {
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function() {
            if (typeof logout === 'function') {
                logout('/login');
                return;
            }
            // Fallback if utils not loaded
            try { localStorage.clear(); } catch (_) { /* ignore */ }
            try { sessionStorage.clear(); } catch (_) { /* ignore */ }
            window.location.href = '/login';
        });
    }
}

// Apply role-based changes to UI elements
function applyRoleBasedUIChanges() {
    // Check if user is admin
    const isAdmin = getCurrentUser()?.role === 'admin';
    
    // Hide admin-only elements for non-admin users
    const adminOnlyElements = document.querySelectorAll('.admin-only');
    adminOnlyElements.forEach(element => {
        if (!isAdmin) {
            element.style.display = 'none';
        } else {
            element.style.display = '';
        }
    });
}