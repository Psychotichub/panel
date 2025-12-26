document.addEventListener('DOMContentLoaded', initStock);

function initStock() {
    // Check if user is authenticated
    if (typeof isAuthenticated === 'function' && !isAuthenticated()) {
        console.log('Not authenticated, redirecting to login page');
        window.location.href = '/login';
        return;
    }

    const stock = document.getElementById('stock');
    void stock; // avoid unused var warning, element used via query selectors below
    const tbody = document.querySelector('#stock tbody');
    const searchForm = document.getElementById('stock-search');
    const searchInput = document.getElementById('search');
    const searchDropdown = document.createElement('ul');
    searchDropdown.id = 'search-dropdown';
    searchInput.parentNode.appendChild(searchDropdown);

    let totalStockData = [];

    const fetchAllData = async () => {
        try {
            const [dailyReports, receivedMaterials] = await Promise.all([
                fetchAllDailyReport(),
                fetchAllReceived()
            ]);
            totalStockData = calculateTotalStock(dailyReports, receivedMaterials);
            displayTotalStock(totalStockData);
        } catch (error) {
            console.error('Error fetching data:', error);
        }
    };

    const fetchAllDailyReport = async () => {
        try {
            // Use authenticatedFetch if available, fall back to fetch with auth headers
            const fetchFunc = typeof authenticatedFetch === 'function' ? authenticatedFetch : fetch;
            
            const response = await fetchFunc('/api/user/daily-reports', {
                headers: typeof authHeader === 'function' ? authHeader() : {}
            });

            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Error fetching daily reports:', error);
            return [];
        }
    };

    const fetchAllReceived = async () => {
        try {
            // Use authenticatedFetch if available, fall back to fetch with auth headers
            const fetchFunc = typeof authenticatedFetch === 'function' ? authenticatedFetch : fetch;
            
            const response = await fetchFunc('/api/user/received', {
                headers: typeof authHeader === 'function' ? authHeader() : {}
            });
            
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Error fetching received materials:', error);
            return [];
        }
    };

    const calculateTotalStock = (dailyReports, receivedMaterials) => {
        const stockMap = new Map();

        // Process received materials (add to stock)
        receivedMaterials.forEach(received => {
            const { materialName, quantity, unit } = received;
            if (!stockMap.has(materialName)) {
                stockMap.set(materialName, { 
                    materialName, 
                    received: quantity, 
                    consumed: 0, 
                    unit 
                });
            } else {
                const item = stockMap.get(materialName);
                item.received += quantity;
            }
        });

        // Process daily reports (subtract from stock)
        dailyReports.forEach(report => {
            const { materialName, quantity, unit } = report;
            if (!stockMap.has(materialName)) {
                stockMap.set(materialName, { 
                    materialName, 
                    received: 0, 
                    consumed: quantity, 
                    unit 
                });
            } else {
                const item = stockMap.get(materialName);
                item.consumed += quantity;
            }
        });

        // Calculate total for each material (received - consumed)
        const result = Array.from(stockMap.values()).map(item => {
            return {
                ...item,
                total: item.received - item.consumed
            };
        });

        return result;
    };

    const displayTotalStock = (totalStock) => {
        tbody.innerHTML = '';
        const displayedMaterials = new Set();
        totalStock.sort((a, b) => a.materialName.localeCompare(b.materialName));
        totalStock.forEach(({ materialName, received, consumed, unit, total }) => {
            if (!displayedMaterials.has(materialName)) {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${materialName}</td>
                    <td>${received} ${unit}</td>
                    <td>${consumed} ${unit}</td>
                    <td>${total !== undefined ? total : 'N/A'} ${unit}</td>
                `;
                tbody.appendChild(row);
                displayedMaterials.add(materialName);
            }
        });
    };

    const filterStock = (searchTerm) => {
        const rows = tbody.querySelectorAll('tr');
        rows.forEach(row => {
            const materialName = row.querySelector('td').textContent.toLowerCase();
            if (materialName.includes(searchTerm.toLowerCase())) {
                row.style.display = '';
            } else {
                row.style.display = 'none';
            }
        });
    };

    const updateSearchDropdown = (searchTerm) => {
        searchDropdown.innerHTML = '';
        if (searchTerm.length === 0) {
            return;
        }
        const filteredMaterials = totalStockData.filter(({ materialName }) =>
            materialName.toLowerCase().includes(searchTerm.toLowerCase())
        );
        filteredMaterials.forEach(({ materialName }) => {
            const item = document.createElement('li');
            item.textContent = materialName;
            item.addEventListener('click', () => {
                searchInput.value = materialName;
                filterStock(materialName);
                searchDropdown.innerHTML = '';
            });
            searchDropdown.appendChild(item);
        });
    };

    searchForm.addEventListener('submit', (event) => {
        event.preventDefault();
        const searchTerm = searchInput.value.trim();
        filterStock(searchTerm);
    });

    searchInput.addEventListener('input', () => {
        const searchTerm = searchInput.value.trim();
        updateSearchDropdown(searchTerm);
    });

    fetchAllData();
}