
// Global variables
let currentUser = null;
let availableSites = [];
let availableCompanies = [];
let siteToCompanies = {};
let totalPriceData = [];
let tableSort = { key: 'materialName', dir: 'asc' };
let pagination = { page: 1, pageSize: 25 };
let charts = { costBreakdown: null, totalsOverTime: null };

// Initialize the page
document.addEventListener('DOMContentLoaded', function() {
    // Theme initialization
    applyStoredThemePreference();
    initThemeToggleButton();
    checkAuthentication();
    loadAvailableSites();
    setDefaultDates();
    setupEventListeners();
    // Hide results (charts + table) until user calculates
    setResultsVisible(false);
    // Announce dynamic messages to screen readers
    ensureAriaLiveRegion();
});

// Setup event listeners
function setupEventListeners() {
    
    // Logout button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }

    // Fetch button
    const fetchBtn = document.getElementById('fetchBtn');
    if (fetchBtn) {
        fetchBtn.addEventListener('click', fetchTotalPrices);
    }

    // Export button
    const exportBtn = document.getElementById('exportBtn');
    if (exportBtn) {
        exportBtn.addEventListener('click', exportToExcel);
    }

    // Clear button
    const clearBtn = document.getElementById('clearBtn');
    if (clearBtn) {
        clearBtn.addEventListener('click', clearResults);
    }

    // Create User button
    const createUserBtn = document.getElementById('createUserBtn');
    const headerCreateUserBtn = document.getElementById('headerCreateUserBtn');
    if (createUserBtn) {
        createUserBtn.addEventListener('click', function() {
            console.log('👤 Create User button clicked');
            window.location.href = '/manager-create-user';
        });
    }

    if (headerCreateUserBtn) {
        headerCreateUserBtn.addEventListener('click', function() {
            console.log('👤 Header Create User clicked');
            window.location.href = '/manager-create-user';
        });
    }

    // Site and company selection
    const siteSelect = document.getElementById('siteSelect');
    const companySelect = document.getElementById('companySelect');
    const startDate = document.getElementById('startDate');
    const endDate = document.getElementById('endDate');
    // Preset controls removed
    const table = document.getElementById('totalPriceTable');
    const prevPageBtn = document.getElementById('prevPageBtn');
    const nextPageBtn = document.getElementById('nextPageBtn');

    // Add change event listeners for site and company
    if (siteSelect) {
        siteSelect.addEventListener('change', function() {
            updateCompanyOptions(this.value);
            if (this.value) localStorage.setItem('managerSite', this.value);
        });
    }

    if (companySelect) {
        companySelect.addEventListener('change', function() {
            if (this.value) localStorage.setItem('managerCompany', this.value);
        });
    }

    // Table sorting
    if (table) {
        const headers = Array.from(table.querySelectorAll('thead th'));
        headers.forEach((th) => {
            th.addEventListener('click', () => {
                const index = Array.from(th.parentNode.children).indexOf(th);
                const key = getSortKeyByColumnIndex(index);
                if (!key) return;
                if (tableSort.key === key) {
                    tableSort.dir = tableSort.dir === 'asc' ? 'desc' : 'asc';
                } else {
                    tableSort.key = key;
                    tableSort.dir = 'asc';
                }
                updateSortHeaderStyles(headers);
                renderTable();
            });
        });
    }

    // Pagination buttons
    if (prevPageBtn) prevPageBtn.addEventListener('click', () => changePage(-1));
    if (nextPageBtn) nextPageBtn.addEventListener('click', () => changePage(1));

    // Add date change listeners
    [startDate, endDate].forEach((input) => {
        if (input) {
            input.addEventListener('change', function() { /* intentionally empty */ });
        }
    });

    // Add keyboard shortcuts
    document.addEventListener('keydown', function(e) {
        // Ctrl/Cmd + Enter to fetch data
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            e.preventDefault();
            //console.log('⌨️ Keyboard shortcut: Ctrl+Enter - Fetching data');
            fetchTotalPrices();
        }
        
        // Ctrl/Cmd + E to export
        if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
            e.preventDefault();
            //console.log('⌨️ Keyboard shortcut: Ctrl+E - Exporting data');
            exportToExcel();
        }
        
        // Ctrl/Cmd + R to clear results
        if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
            e.preventDefault();
            //console.log('⌨️ Keyboard shortcut: Ctrl+R - Clearing results');
            clearResults();
        }

        // Shift + / (question mark) toggles shortcuts overlay
        if ((e.key === '?' || (e.key === '/' && e.shiftKey)) && !e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            toggleShortcutsOverlay();
        }

        // Escape closes shortcuts overlay
        if (e.key === 'Escape') {
            const overlay = document.getElementById('shortcutsOverlay');
            if (overlay && overlay.classList.contains('open')) {
                e.preventDefault();
                closeShortcutsOverlay();
            }
        }
    });

    // Click on Total Materials card opens materials window
    const totalMaterialsEl = document.getElementById('totalUsers');
    if (totalMaterialsEl) {
        const statCard = totalMaterialsEl.closest('.manager-stat-card');
        if (statCard) {
            statCard.style.cursor = 'pointer';
            statCard.title = 'View all materials and prices';
            statCard.setAttribute('role', 'button');
            statCard.setAttribute('tabindex', '0');
            statCard.addEventListener('click', openMaterialsWindow);
            statCard.addEventListener('keydown', (ev) => {
                if (ev.key === 'Enter' || ev.key === ' ') {
                    ev.preventDefault();
                    openMaterialsWindow();
                }
            });
        }
    }
}

function ensureAriaLiveRegion() {
    let live = document.getElementById('ariaLive');
    if (!live) {
        live = document.createElement('div');
        live.id = 'ariaLive';
        live.setAttribute('aria-live', 'polite');
        live.setAttribute('aria-atomic', 'true');
        live.className = 'sr-only';
        document.body.appendChild(live);
    }
}

// ===== Theme toggle (Dark/Light) =====
function getStoredTheme() {
    try {
        return localStorage.getItem('theme') || '';
    } catch (_) {
        return '';
    }
}

function applyTheme(theme) {
    const isDark = theme === 'dark';
    const body = document.body;
    if (isDark) {
        body.classList.add('theme-dark');
    } else {
        body.classList.remove('theme-dark');
    }
    updateThemeToggleUI();
}

function applyStoredThemePreference() {
    const stored = getStoredTheme();
    applyTheme(stored === 'dark' ? 'dark' : 'light');
}

function updateThemeToggleUI() {
    const btn = document.getElementById('themeToggleBtn');
    const icon = document.getElementById('themeToggleIcon');
    const isDark = document.body.classList.contains('theme-dark');
    if (btn) btn.setAttribute('aria-pressed', String(isDark));
    if (icon) {
        icon.classList.remove('fa-moon', 'fa-sun');
        icon.classList.add(isDark ? 'fa-sun' : 'fa-moon');
    }
}

function toggleTheme() {
    const isDark = document.body.classList.contains('theme-dark');
    const next = isDark ? 'light' : 'dark';
    applyTheme(next);
    try {
        if (next === 'dark') {
            localStorage.setItem('theme', 'dark');
        } else {
            localStorage.removeItem('theme');
        }
    } catch (_) { /* ignore */ }
}

function initThemeToggleButton() {
    const btn = document.getElementById('themeToggleBtn');
    if (btn) {
        btn.addEventListener('click', toggleTheme);
    }
    updateThemeToggleUI();
}

// Shortcuts overlay controls
function openShortcutsOverlay() {
    const overlay = document.getElementById('shortcutsOverlay');
    if (!overlay) return;
    overlay.classList.add('open');
    overlay.setAttribute('aria-hidden', 'false');
}

function closeShortcutsOverlay() {
    const overlay = document.getElementById('shortcutsOverlay');
    if (!overlay) return;
    overlay.classList.remove('open');
    overlay.setAttribute('aria-hidden', 'true');
}

function toggleShortcutsOverlay() {
    const overlay = document.getElementById('shortcutsOverlay');
    if (!overlay) return;
    if (overlay.classList.contains('open')) {
        closeShortcutsOverlay();
    } else {
        openShortcutsOverlay();
    }
}

// Wire overlay buttons and backdrop click
document.addEventListener('DOMContentLoaded', function() {
    const btn = document.getElementById('shortcutsBtn');
    const closeBtn = document.getElementById('shortcutsCloseBtn');
    const overlay = document.getElementById('shortcutsOverlay');
    if (btn) btn.addEventListener('click', openShortcutsOverlay);
    if (closeBtn) closeBtn.addEventListener('click', closeShortcutsOverlay);
    if (overlay) {
        overlay.addEventListener('click', function(ev) {
            if (ev.target === overlay) closeShortcutsOverlay();
        });
    }
});

// Show or hide results sections (charts + table)
function setResultsVisible(visible) {
    const sections = document.querySelectorAll('.manager-results');
    sections.forEach(sec => {
        sec.style.display = visible ? '' : 'none';
    });
}

// Check if user is authenticated and is manager
function checkAuthentication() {
    const token = (typeof getToken === 'function') ? getToken() : (sessionStorage.getItem('token') || localStorage.getItem('token'));
    const managerAccess = localStorage.getItem('managerAccess');
    
    if (!token) {
        window.location.href = '/manager-login';
        return;
    }

    if (!managerAccess) {
        window.location.href = '/manager-login';
        return;
    }

    // Clear any potentially stale site/company cache on page load
    localStorage.removeItem('managerSite');
    localStorage.removeItem('managerCompany');

    // Decode JWT token to get user info
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        currentUser = payload;
        // Check if user has manager access (admin or manager role)
        if (currentUser.role !== 'admin' && currentUser.role !== 'manager') {
            showMessage(`Access denied. Manager privileges required. Current role: ${currentUser.role}`, 'error');
            setTimeout(() => {
                window.location.href = '/manager-login';
            }, 2000);
            return;
        }

        const currentUserEl = document.getElementById('currentUser');
        if (currentUserEl) {
            const initials = (currentUser.username || '?')
                .split(/\s+/)
                .map(s => s.charAt(0))
                .join('')
                .slice(0, 2)
                .toUpperCase();
            const role = currentUser.role || 'user';
            currentUserEl.innerHTML = `
                <span class="user-chip">
                    <span class="user-avatar" aria-hidden="true">${initials}</span>
                    <span class="user-name">${currentUser.username}</span>
                    <span class="role-badge ${role}">${role}</span>
                </span>
            `;
        }
    } catch (error) {
        window.location.href = '/manager-login';
    }
}

// Load available sites from the database
async function loadAvailableSites() {
    try {
        const token = (typeof getToken === 'function') ? getToken() : (sessionStorage.getItem('token') || localStorage.getItem('token'));

        // Decode token to see current user info
        let payload = null;
        if (token) {
            try {
                payload = JSON.parse(atob(token.split('.')[1]));
            } catch (error) { /* no-op */ }
        }

    // Admins can query site users; managers try their own site/company from token or fallback to users they created
        if (payload?.role === 'admin') {
            const response = await fetch('/api/admin/site/users', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
            }

            const data = await response.json();

            if (data.success === false) {
                throw new Error(data.message || 'Failed to load sites');
            }

            const sites = new Set();
            const companies = new Set();
            if (data.users && data.users.length > 0) {
                data.users.forEach((user) => {
                    if (user.site) sites.add(user.site);
                    if (user.company) companies.add(user.company);
                    if (user.site && user.company) {
                        if (!siteToCompanies[user.site]) siteToCompanies[user.site] = new Set();
                        siteToCompanies[user.site].add(user.company);
                    }
                });
            } else if (data.site) {
                sites.add(data.site);
            }

            availableSites = Array.from(sites);
            availableCompanies = Array.from(companies);
        } else {
            // Manager mode: try token first
            // Also check previously saved managerSite/managerCompany in localStorage
            const savedSite = localStorage.getItem('managerSite');
            const savedCompany = localStorage.getItem('managerCompany');
            availableSites = payload?.site ? [payload.site] : (savedSite ? [savedSite] : []);
            availableCompanies = payload?.company ? [payload.company] : (savedCompany ? [savedCompany] : []);
            if (payload?.site && payload?.company) {
                if (!siteToCompanies[payload.site]) siteToCompanies[payload.site] = new Set();
                siteToCompanies[payload.site].add(payload.company);
            }
            
            if (availableSites.length === 0 || availableCompanies.length === 0) {
                // Fallback: ask backend for users created by this manager and derive site/company from them
                try {
                    const resp = await fetch('/api/auth/users/recent', {
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json'
                        }
                    });
                    if (resp.ok) {
                        const data = await resp.json();
                        const sites = new Set();
                        const companies = new Set();
                        (data.users || []).forEach(u => {
                            if (u.site) sites.add(u.site);
                            if (u.company) companies.add(u.company);
                            if (u.site && u.company) {
                                if (!siteToCompanies[u.site]) siteToCompanies[u.site] = new Set();
                                siteToCompanies[u.site].add(u.company);
                            }
                        });
                        availableSites = availableSites.length ? availableSites : Array.from(sites);
                        availableCompanies = availableCompanies.length ? availableCompanies : Array.from(companies);
                    }
                } catch (_) { /* ignore */ }
            }
            // If we resolved exactly one site/company, persist for future requests
            if (availableSites.length === 1) {
                localStorage.setItem('managerSite', availableSites[0]);
            }
            if (availableCompanies.length === 1) {
                localStorage.setItem('managerCompany', availableCompanies[0]);
            }
        }

        if (availableSites.length === 0) {
            showMessage('No sites available yet. Create users with site info or contact admin.', 'info');
        }
        
        populateSiteSelect();
        populateCompanySelect();
        updateSortHeaderFromState();
        
    } catch (error) {
        console.error('Error loading sites:', error);
        showMessage(`Failed to load available sites: ${error.message}`, 'error');
        
        // Keep selections empty on error (no demo fallbacks)
        populateSiteSelect();
        populateCompanySelect();
    }
}

// Populate site select dropdown
function populateSiteSelect() {
    const siteSelect = document.getElementById('siteSelect');
    if (!siteSelect) {
        return;
    }
    
    // Store current selection if it exists
    const currentSite = siteSelect.value;
    
    siteSelect.innerHTML = '<option value="">Select a site...</option>';
    
    availableSites.forEach(site => {
        const option = document.createElement('option');
        option.value = site;
        option.textContent = site;
        siteSelect.appendChild(option);
    });
    
    // Restore selection if it's still valid
    if (currentSite && availableSites.includes(currentSite)) {
        siteSelect.value = currentSite;
    }
}

// Populate company select dropdown
function populateCompanySelect() {
    const companySelect = document.getElementById('companySelect');
    if (!companySelect) {
        return;
    }
    
    // Store current selection if it exists
    const currentCompany = companySelect.value;
    const selectedSite = document.getElementById('siteSelect')?.value || '';
    const allowedCompanies = selectedSite && siteToCompanies[selectedSite]
        ? Array.from(siteToCompanies[selectedSite])
        : availableCompanies.slice();
    
    companySelect.innerHTML = '<option value="">Select a company...</option>';
    
    allowedCompanies.forEach(company => {
        const option = document.createElement('option');
        option.value = company;
        option.textContent = company;
        companySelect.appendChild(option);
    });
    
    // Restore selection if it's still valid
    if (currentCompany && allowedCompanies.includes(currentCompany)) {
        companySelect.value = currentCompany;
    } else if (allowedCompanies.length === 1) {
        companySelect.value = allowedCompanies[0];
        try { localStorage.setItem('managerCompany', allowedCompanies[0]); } catch (_) { /* ignore */ }
    } else {
        companySelect.value = '';
        try { localStorage.removeItem('managerCompany'); } catch (_) { /* ignore */ }
    }
}

// Update company options based on selected site
function updateCompanyOptions(selectedSite) {
    const companySelect = document.getElementById('companySelect');
    if (!companySelect) {
        return;
    }
    
    // Store current company selection
    const currentCompany = companySelect.value;
    
    // Filter companies based on selected site
    const filteredCompanies = selectedSite && siteToCompanies[selectedSite]
        ? Array.from(siteToCompanies[selectedSite])
        : availableCompanies.slice();
    
    companySelect.innerHTML = '<option value="">Select a company...</option>';
    
    filteredCompanies.forEach(company => {
        const option = document.createElement('option');
        option.value = company;
        option.textContent = company;
        companySelect.appendChild(option);
    });
    
    // Restore company selection if it's still valid
    if (currentCompany && filteredCompanies.includes(currentCompany)) {
        companySelect.value = currentCompany;
    } else if (filteredCompanies.length === 1) {
        companySelect.value = filteredCompanies[0];
        try { localStorage.setItem('managerCompany', filteredCompanies[0]); } catch (_) { /* ignore */ }
    } else {
        companySelect.value = '';
        try { localStorage.removeItem('managerCompany'); } catch (_) { /* ignore */ }
    }
}

// Set default date range (current month)
function setDefaultDates() {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    
    const startDateInput = document.getElementById('startDate');
    const endDateInput = document.getElementById('endDate');
    
    // Only set default dates if they're not already set
    if (startDateInput && !startDateInput.value) {
        startDateInput.value = formatDateForInput(firstDay);
    }
    
    if (endDateInput && !endDateInput.value) {
        endDateInput.value = formatDateForInput(lastDay);
    }
}

// Format date for input field
function formatDateForInput(date) {
    return date.toISOString().split('T')[0];
}

// Fetch total prices for selected site, company and date range
async function fetchTotalPrices() {
    const siteSelect = document.getElementById('siteSelect');
    const companySelect = document.getElementById('companySelect');
    const startDate = document.getElementById('startDate');
    const endDate = document.getElementById('endDate');
    
    if (!siteSelect || !companySelect || !startDate || !endDate) {
        showMessage('Required elements not found.', 'error');
        return;
    }
    
    // Validation
    if (!siteSelect.value) {
        showMessage('Please select a site.', 'error');
        return;
    }
    
    if (!companySelect.value) {
        showMessage('Please select a company.', 'error');
        return;
    }
    // Ensure selected company belongs to selected site
    const allowedForSite = siteSelect.value && siteToCompanies[siteSelect.value]
        ? Array.from(siteToCompanies[siteSelect.value])
        : availableCompanies.slice();
    if (companySelect.value && !allowedForSite.includes(companySelect.value)) {
        showMessage('Selected company is not available for the chosen site.', 'error');
        updateCompanyOptions(siteSelect.value);
        return;
    }
    
    if (!startDate.value || !endDate.value) {
        showMessage('Please select both start and end dates.', 'error');
        return;
    }
    
    if (new Date(startDate.value) > new Date(endDate.value)) {
        showMessage('Start date cannot be after end date.', 'error');
        return;
    }

    showLoading(true);
    
    try {
        const token = (typeof getToken === 'function') ? getToken() : (sessionStorage.getItem('token') || localStorage.getItem('token'));
        const selectedSite = siteSelect.value;
        const selectedCompany = companySelect.value;
        // Persist for API middleware headers
        localStorage.setItem('managerSite', selectedSite);
        localStorage.setItem('managerCompany', selectedCompany);
        
        // Use manager-specific API endpoint
        const apiUrl = `/api/manager/site/calculate-total-prices?site=${selectedSite}&company=${selectedCompany}&startDate=${startDate.value}&endDate=${endDate.value}`;
        
        // Fetch calculated total prices for the specific site and company
        const response = await fetch(apiUrl, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'X-Site': selectedSite,
                'X-Company': selectedCompany
            }
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        
        if (data.success) {
            totalPriceData = data.calculatedTotalPrices || [];

            
            if (totalPriceData.length === 0) {
                // No records found: show table section with the built-in no-data row, but hide charts
                displayCalculatedTotalPrices();
                // Show the table section only
                const sections = document.querySelectorAll('.manager-results');
                sections.forEach(sec => {
                    const hasTable = sec.querySelector('#totalPriceTable');
                    sec.style.display = hasTable ? '' : 'none';
                });
                const exportBtnEl = document.getElementById('exportBtn');
                if (exportBtnEl) exportBtnEl.disabled = true;
                showMessage('No records found for the selected criteria.', 'info');
                // Still refresh activity logs
                await loadActivityLogs(selectedSite, selectedCompany);
                // Update stats area with selected site name even if no data
                updateCalculatedStatistics(data.summary, data.site || selectedSite);
            } else {
                displayCalculatedTotalPrices();
                updateCalculatedStatistics(data.summary, data.site || selectedSite);
                updateCharts(totalPriceData, data.summary, { start: startDate.value, end: endDate.value });
                // Reveal results and enable export
                setResultsVisible(true);
                const exportBtnEl = document.getElementById('exportBtn');
                if (exportBtnEl) exportBtnEl.disabled = false;
                showMessage(`Successfully calculated ${totalPriceData.length} total price records for ${data.site || selectedSite}, ${data.company || selectedCompany}. Grand Total: €${formatNumber(data.summary?.grandTotal || 0)}`, 'success');
                await loadActivityLogs(selectedSite, selectedCompany);
            }
        } else {
            throw new Error(data.message || 'Failed to calculate total prices');
        }
        
    } catch (error) {
        showMessage('Failed to calculate total prices. Please try again.', 'error');
    } finally {
        showLoading(false);
    }
}

// Display calculated total prices in the table
function displayCalculatedTotalPrices() {
    const tableBody = document.getElementById('totalPriceTableBody');
    if (!tableBody) {
        return;
    }
    
    if (totalPriceData.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="5" class="no-data">No records found for the selected criteria.</td></tr>';
        return;
    }

    tableBody.innerHTML = '';
    
    // Render with sorting and pagination
        const { sorted, totalPages, page } = getSortedAndPagedData();
    
    sorted.forEach((item) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${item.materialName || 'N/A'}</td>
            <td>${item.quantity || 'N/A'} ${item.unit || ''}</td>
            <td>€${formatNumber(item.materialCost)}</td>
            <td>€${formatNumber(item.laborCost)}</td>
            <td>€${formatNumber(item.totalPrice)}</td>
        `;
        tableBody.appendChild(row);
    });
    
    // Add grand total row
    const grandTotal = totalPriceData.reduce((sum, item) => sum + (item.totalPrice || 0), 0);
    const totalMaterialCost = totalPriceData.reduce((sum, item) => sum + (item.materialCost || 0), 0);
    const totalLaborCost = totalPriceData.reduce((sum, item) => sum + (item.laborCost || 0), 0);
    
    const totalRow = document.createElement('tr');
    totalRow.className = 'table-dark fw-bold';
    totalRow.innerHTML = `
        <td><strong>TOTAL</strong></td>
        <td></td>
        <td><strong>€${formatNumber(totalMaterialCost)}</strong></td>
        <td><strong>€${formatNumber(totalLaborCost)}</strong></td>
        <td><strong>€${formatNumber(grandTotal)}</strong></td>
    `;
    tableBody.appendChild(totalRow);
    
    updatePaginationControls(totalPages, page);
}

// Update statistics panel with calculated data
function updateCalculatedStatistics(summary, selectedSiteName) {
    
    const totalUsersElement = document.getElementById('totalUsers');
    const totalPricesElement = document.getElementById('totalPrices');
    const totalAmountElement = document.getElementById('totalAmount');
    const selectedSiteElement = document.getElementById('selectedSite');
    
    if (totalUsersElement) totalUsersElement.textContent = summary?.totalMaterials || 0;
    if (totalPricesElement) totalPricesElement.textContent = totalPriceData.length;
    if (totalAmountElement) totalAmountElement.textContent = `€${formatNumber(summary?.grandTotal || 0)}`;
    if (selectedSiteElement) selectedSiteElement.textContent = selectedSiteName || '-';
    

}

// Load and render activity logs for current site/company
async function loadActivityLogs(site, company) {
    try {
        const token = (typeof getToken === 'function') ? getToken() : (sessionStorage.getItem('token') || localStorage.getItem('token'));
        const url = `/api/manager/site/activity-logs?site=${encodeURIComponent(site)}&company=${encodeURIComponent(company)}&limit=100`;
        const resp = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        if (!resp.ok) return;
        const payload = await resp.json();
        const logs = payload.logs || [];

        const tbody = document.getElementById('activityLogsTableBody');
        if (!tbody) return;
        if (logs.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="no-data">No activity found.</td></tr>';
            return;
        }
        tbody.innerHTML = logs.map(l => {
            const when = new Date(l.timestamp).toLocaleString();
            const details = l.details || {};
            const material = details.materialName || details.name || '';
            const qtyVal = (details.quantity !== undefined && details.quantity !== null) ? details.quantity : '';
            const unitVal = details.unit || '';
            return `<tr>
                <td>${when}</td>
                <td>${l.username || ''}</td>
                <td>${l.role || ''}</td>
                <td>${l.action || ''}</td>
                <td>${l.resource || ''}</td>
                <td>${material}</td>
                <td>${qtyVal}${unitVal ? ` ${unitVal}` : ''}</td>
            </tr>`;
        }).join('');
    } catch (_) { /* no-op */ }
}

// Open a new window listing all materials (name, unit, prices) for the selected site/company
async function openMaterialsWindow() {
    try {
        const site = document.getElementById('siteSelect')?.value || localStorage.getItem('managerSite');
        const company = document.getElementById('companySelect')?.value || localStorage.getItem('managerCompany');
        if (!site || !company) {
            showMessage('Please select site and company first.', 'error');
            return;
        }
        const url = `/manager-materials?site=${encodeURIComponent(site)}&company=${encodeURIComponent(company)}`;
        const win = window.open(url, '', 'width=900,height=650');
        if (!win) {
            showMessage('Popup blocked. Please allow popups for this site.', 'error');
        }
    } catch (err) {
        showMessage('Failed to open materials window.', 'error');
    }
}

// Format number for display
function formatNumber(number) {
    if (isNaN(number) || number === null || number === undefined) return '0.00';
    return parseFloat(number).toFixed(2);
}

// Charts
function updateCharts(dataRows, summary, range) {
    if (!(window.Chart)) return;
    const ctxPie = document.getElementById('costBreakdownChart');
    const ctxLine = document.getElementById('totalsOverTimeChart');
    if (!ctxPie || !ctxLine) return;

    // Cost breakdown pie (material vs labor vs total)
    const material = Number(summary?.totalMaterialCost || 0);
    const labor = Number(summary?.totalLaborCost || 0);
    const total = Number(summary?.grandTotal || 0);
    const other = Math.max(0, total - (material + labor));

    const pieData = {
        labels: ['Material', 'Labor', 'Other'],
        datasets: [{
            data: [material, labor, other],
            backgroundColor: ['#667eea', '#56ab2f', '#f6ad55']
        }]
    };

    if (charts.costBreakdown) charts.costBreakdown.destroy();
    charts.costBreakdown = new Chart(ctxPie, {
        type: 'pie',
        data: pieData,
        options: {
            plugins: { legend: { position: 'bottom' }, title: { display: true, text: 'Cost Breakdown' } }
        }
    });

    // Totals over time (group by location as proxy if no date per row)
    // If rows contain a date field in the future, replace grouping accordingly.
    const groups = new Map();
    dataRows.forEach(r => {
        const key = r.location || 'N/A';
        const prev = groups.get(key) || 0;
        groups.set(key, prev + Number(r.totalPrice || 0));
    });
    const labels = Array.from(groups.keys());
    const values = Array.from(groups.values());

    if (charts.totalsOverTime) charts.totalsOverTime.destroy();
    charts.totalsOverTime = new Chart(ctxLine, {
        type: 'bar',
        data: {
            labels,
            datasets: [{ label: `Totals (${range.start} to ${range.end})`, data: values, backgroundColor: '#764ba2' }]
        },
        options: {
            plugins: { legend: { display: false } },
            scales: { y: { beginAtZero: true } }
        }
    });
}

// Sorting and pagination helpers
function getSortKeyByColumnIndex(index) {
    switch (index) {
        case 0: return 'materialName';
        case 1: return 'quantity';
        case 2: return 'materialCost';
        case 3: return 'laborCost';
        case 4: return 'totalPrice';
        default: return null;
    }
}

function compareValues(a, b) {
    if (a == null && b == null) return 0;
    if (a == null) return -1;
    if (b == null) return 1;
    if (typeof a === 'string' && typeof b === 'string') {
        return a.localeCompare(b);
    }
    const numA = Number(a);
    const numB = Number(b);
    if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
    return String(a).localeCompare(String(b));
}

function getSortedAndPagedData() {
    const sortedAll = [...totalPriceData].sort((x, y) => {
        const valA = x[tableSort.key];
        const valB = y[tableSort.key];
        const cmp = compareValues(valA, valB);
        return tableSort.dir === 'asc' ? cmp : -cmp;
    });
    const totalPages = Math.max(1, Math.ceil(sortedAll.length / pagination.pageSize));
    pagination.page = Math.min(Math.max(1, pagination.page), totalPages);
    const start = (pagination.page - 1) * pagination.pageSize;
    const end = start + pagination.pageSize;
    return { sorted: sortedAll.slice(start, end), totalPages, page: pagination.page, pageSize: pagination.pageSize };
}

function updatePaginationControls(totalPages, page) {
    const pageInfo = document.getElementById('pageInfo');
    const prevPageBtn = document.getElementById('prevPageBtn');
    const nextPageBtn = document.getElementById('nextPageBtn');
    if (pageInfo) pageInfo.textContent = `Page ${page} of ${totalPages}`;
    if (prevPageBtn) prevPageBtn.disabled = page <= 1;
    if (nextPageBtn) nextPageBtn.disabled = page >= totalPages;
}

function changePage(delta) {
    pagination.page += delta;
    renderTable();
}

function renderTable() {
    const tbody = document.getElementById('totalPriceTableBody');
    if (!tbody) return;
    // Reuse display function for totals and structure; it will call pagination updates
    displayCalculatedTotalPrices();
}

function updateSortHeaderStyles(headers) {
    headers.forEach(h => h.classList.remove('sort-asc', 'sort-desc'));
    const index = ['materialName', 'quantity', 'materialCost', 'laborCost', 'totalPrice'].indexOf(tableSort.key);
    if (index >= 0 && headers[index]) {
        headers[index].classList.add(tableSort.dir === 'asc' ? 'sort-asc' : 'sort-desc');
    }
}

function updateSortHeaderFromState() {
    const table = document.getElementById('totalPriceTable');
    if (!table) return;
    const headers = Array.from(table.querySelectorAll('thead th'));
    updateSortHeaderStyles(headers);
}



// Export data to Excel
function exportToExcel() {
    if (totalPriceData.length === 0) {
        showMessage('No data to export. Please calculate total prices first.', 'error');
        return;
    }

    try {
        // Prepare data for Excel
        const excelData = totalPriceData.map(item => ({
            'Material': item.materialName || 'N/A',
            'Total Quantity': `${item.quantity || 'N/A'} ${item.unit || ''}`,
            'Material Cost': `€${formatNumber(item.materialCost)}`,
            'Labor Cost': `€${formatNumber(item.laborCost)}`,
            'Total Price': `€${formatNumber(item.totalPrice)}`
        }));

        // Add grand total row
        const grandTotal = totalPriceData.reduce((sum, item) => sum + (item.totalPrice || 0), 0);
        const totalMaterialCost = totalPriceData.reduce((sum, item) => sum + (item.materialCost || 0), 0);
        const totalLaborCost = totalPriceData.reduce((sum, item) => sum + (item.laborCost || 0), 0);
        
        excelData.push({
            'Material': 'TOTAL',
            'Total Quantity': '',
            'Material Cost': `€${formatNumber(totalMaterialCost)}`,
            'Labor Cost': `€${formatNumber(totalLaborCost)}`,
            'Total Price': `€${formatNumber(grandTotal)}`
        });

        // Create workbook and worksheet
        const wb = XLSX.utils.book_new();
        const selectedSite = document.getElementById('siteSelect')?.value || localStorage.getItem('managerSite') || 'unknown';
        const selectedCompany = document.getElementById('companySelect')?.value || localStorage.getItem('managerCompany') || 'unknown';
        const headerText = `Company: ${selectedCompany}    Site: ${selectedSite}`;

        // Place data starting at A2 to leave room for a merged header row
        const ws = XLSX.utils.json_to_sheet(excelData, { origin: 'A2' });
        XLSX.utils.sheet_add_aoa(ws, [[headerText]], { origin: 'A1' });
        // Merge header across 5 columns (A1:E1) to match table width
        ws['!merges'] = (ws['!merges'] || []).concat([{ s: { r: 0, c: 0 }, e: { r: 0, c: 4 } }]);

        // Make A1 and header row (A2:E2) bold; also bold Material (A) and Total Price (E) values
        try {
            if (ws['A1']) ws['A1'].s = { font: { bold: true } };
            ['A2','B2','C2','D2','E2'].forEach(cell => {
                if (ws[cell]) {
                    ws[cell].s = { font: { bold: true } };
                }
            });
            if (ws['!ref']) {
                const range = XLSX.utils.decode_range(ws['!ref']);
                for (let r = 2; r <= range.e.r; r += 1) {
                    const aCell = XLSX.utils.encode_cell({ r, c: 0 });
                    const eCell = XLSX.utils.encode_cell({ r, c: 4 });
                    if (ws[aCell]) ws[aCell].s = { ...(ws[aCell].s || {}), font: { ...(ws[aCell].s?.font || {}), bold: true } };
                    if (ws[eCell]) ws[eCell].s = { ...(ws[eCell].s || {}), font: { ...(ws[eCell].s?.font || {}), bold: true } };
                }
            }
        } catch (_) { /* styling may be ignored by some XLSX builds */ }

        // Add worksheet to workbook
        XLSX.utils.book_append_sheet(wb, ws, 'Manager Total Prices');

        // Generate filename
        // Use the same selectedSite/selectedCompany captured above for filename
        const startDate = document.getElementById('startDate')?.value || 'unknown';
        const endDate = document.getElementById('endDate')?.value || 'unknown';
        const filename = `ManagerTotalPrices_${selectedSite}_${selectedCompany}_${startDate}_to_${endDate}.xlsx`;

        // Save file
        XLSX.writeFile(wb, filename);
        
        showMessage('Manager data exported to Excel successfully!', 'success');
        
    } catch (error) {
        showMessage('Failed to export data. Please try again.', 'error');
    }
}

// Clear results
function clearResults() {
    totalPriceData = [];
    const tableBody = document.getElementById('totalPriceTableBody');
    if (tableBody) {
        tableBody.innerHTML = '<tr><td colspan="6" class="no-data">No calculated data available. Select a site and date range to calculate total prices.</td></tr>';
    }
    
    // Reset statistics (but preserve form selections)
    const totalUsersElement = document.getElementById('totalUsers');
    const totalPricesElement = document.getElementById('totalPrices');
    const totalAmountElement = document.getElementById('totalAmount');
    const selectedSiteElement = document.getElementById('selectedSite');
    
    if (totalUsersElement) totalUsersElement.textContent = '0';
    if (totalPricesElement) totalPricesElement.textContent = '0';
    if (totalAmountElement) totalAmountElement.textContent = '€0';
    if (selectedSiteElement) selectedSiteElement.textContent = '-';
    
    showMessage('Calculated results cleared. Form selections preserved.', 'info');
    // Hide results and disable export until next calculate
    setResultsVisible(false);
    const exportBtnEl = document.getElementById('exportBtn');
    if (exportBtnEl) exportBtnEl.disabled = true;
}

// Show/hide loading spinner
function showLoading(show) {
    const spinner = document.getElementById('loadingSpinner');
    if (spinner) {
        spinner.style.display = show ? 'flex' : 'none';
    }
}

// Show message to user
function showMessage(message, type = 'info') {
    // Prefer toasts for non-blocking feedback
    if (typeof window.showToast === 'function') {
        window.showToast(message, type);
    } else {
        // Fallback inline message
        const existingMessages = document.querySelectorAll('.message');
        existingMessages.forEach(msg => msg.remove());

        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}`;
        messageDiv.textContent = message;

        const container = document.querySelector('.admin-panel') || document.querySelector('.manager-panel');
        if (container) {
            container.insertBefore(messageDiv, container.firstChild);
            setTimeout(() => { if (messageDiv.parentNode) messageDiv.remove(); }, 10000);
        }
    }

    // Announce to screen readers
    const live = document.getElementById('ariaLive');
    if (live) {
        live.textContent = message;
    }
}

// Logout function
async function logout() {
    try {
        await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    } catch (_) { /* ignore */ }
    try { localStorage.clear(); } catch (_) { /* ignore */ }
    try { sessionStorage.clear(); } catch (_) { /* ignore */ }
    window.location.href = '/manager-login';
}