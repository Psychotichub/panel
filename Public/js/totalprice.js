document.addEventListener('DOMContentLoaded', initTotalPrice);
async function initTotalPrice() {
    // Check if user is authenticated and is admin
    if (typeof isAuthenticated === 'function' && !isAuthenticated()) {
        console.log('Not authenticated, redirecting to login page');
        window.location.href = '/login';
        return;
    }

    if (typeof isAdmin === 'function' && !isAdmin()) {
        console.log('Access denied: Admin privileges required');
        alert('You do not have permission to access this page. Admin privileges required.');
        window.location.href = '/index';
        return;
    }

    const startDateInput = document.getElementById('startDateInput');
    const endDateInput = document.getElementById('endDateInput');
    const fetchButton = document.getElementById('fetchButton');
    const selectedDateRangeElement = document.getElementById('selected-date-range');
    const contentElement = document.getElementById('content');
    const exportElement = document.getElementById('export');
    const saveButton = document.getElementById('save');
    const locationInput = document.getElementById('location');
    const panelNameInput = document.getElementById('panel-name');
    const panelDropdown = document.getElementById('panel-dropdown');
    const panelList = document.getElementById('panel-list');

    const showElement = (element) => {
        if (element) element.classList.remove('hidden');
    };
    const hideElement = (element) => {
        if (element) element.classList.add('hidden');
    };

    let panelsCache = [];
    let currentMode = 'location'; // 'location' or 'panel'

    // formatDate defined but not used; keep for parity with other pages without lint warning
    // eslint-disable-next-line no-unused-vars
    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-CA').split('T')[0];
    };

    const currentDate = new Date().toLocaleDateString('en-CA').split('T')[0];
    startDateInput.value = currentDate;
    endDateInput.value = currentDate;

    let selectedUnit = '';
    void selectedUnit; // not used in this script currently
    hideElement(contentElement);
    hideElement(exportElement);

    // Load panels for dropdown
    const loadPanels = async () => {
        try {
            const fetchFunc = typeof authenticatedFetch === 'function' ? authenticatedFetch : fetch;
            const response = await fetchFunc('/api/user/panels', {
                headers: typeof authHeader === 'function' ? authHeader() : {}
            });
            if (!response.ok) throw new Error('Failed to fetch panels');
            const panels = await response.json();
            panelsCache = panels || [];
            
            // Populate panel list
            panelList.innerHTML = '';
            const uniquePanelNames = [...new Set(panelsCache.map(p => p.panelName))];
            uniquePanelNames.forEach(panelName => {
                const option = document.createElement('option');
                option.value = panelName;
                panelList.appendChild(option);
            });
            
            console.log('Panels loaded:', panelsCache.length);
        } catch (error) {
            console.error('Error loading panels:', error);
        }
    };
    loadPanels();

    // Panel dropdown functionality
    panelNameInput.addEventListener('input', () => {
        const query = panelNameInput.value.toLowerCase();
        const uniquePanelNames = [...new Set(panelsCache.map(p => p.panelName))];
        const filtered = uniquePanelNames.filter(name => name.toLowerCase().includes(query));
        
        panelDropdown.innerHTML = '';
        if (filtered.length && query) {
            filtered.forEach(panelName => {
                const item = document.createElement('div');
                item.className = 'dropdown-item';
                item.textContent = panelName;
                item.addEventListener('click', () => {
                    panelNameInput.value = panelName;
                    panelDropdown.classList.add('hidden');
                    // Switch to panel mode
                    currentMode = 'panel';
                    locationInput.value = '';
                });
                panelDropdown.appendChild(item);
            });
            panelDropdown.classList.remove('hidden');
        } else {
            panelDropdown.classList.add('hidden');
        }
    });

    // Location change switches to location mode
    locationInput.addEventListener('focus', () => {
        currentMode = 'location';
        panelNameInput.value = '';
    });

    // Panel input focus switches to panel mode
    panelNameInput.addEventListener('focus', () => {
        currentMode = 'panel';
        locationInput.value = '';
    });

    document.addEventListener('click', (e) => {
        if (!panelNameInput.contains(e.target) && !panelDropdown.contains(e.target)) {
            panelDropdown.classList.add('hidden');
        }
    });

    fetchButton.addEventListener('click', async () => {
        const startDate = new Date(startDateInput.value);
        const endDate = new Date(endDateInput.value);
        endDate.setHours(23, 59, 59, 999);

        try {
            const formattedStartDate = startDate.toLocaleDateString('en-CA');
            const formattedEndDate = endDate.toLocaleDateString('en-CA');

            // Use authenticatedFetch if available, otherwise use fetch with auth headers
            const fetchFunc = typeof authenticatedFetch === 'function' ? authenticatedFetch : fetch;
            const headers = typeof authHeader === 'function' ? authHeader() : {};

            const [materialResponse, priceResponse] = await Promise.all([
                fetchFunc(`/api/user/daily-reports/range?start=${formattedStartDate}&end=${formattedEndDate}`, {
                    headers: headers
                }),
                fetchFunc(`/api/user/materials`, {
                    headers: headers
                }),
            ]);

            if (!materialResponse.ok) throw new Error('Failed to fetch material data');
            if (!priceResponse.ok) throw new Error('Failed to fetch material prices');

            const materialData = await materialResponse.json();
            const priceData = await priceResponse.json();

            // Sort materialData and priceData alphabetically by materialName
            materialData.sort((a, b) => a.materialName.localeCompare(b.materialName));
            priceData.sort((a, b) => a.materialName.localeCompare(b.materialName));

            if (materialData.length === 0) {
                alert('No data found for the selected date range.');
                return;
            }

            const combinedData = materialData.map(material => {
                const priceItem = priceData.find(p => p.materialName === material.materialName);
                return {
                    ...material,
                    materialPrice: priceItem ? priceItem.materialPrice : 0,
                    laborPrice: priceItem ? priceItem.laborPrice : 0,
                    unit: material.unit
                };
            });

            // Store the combined data globally for filtering
            window.allCombinedData = combinedData;
            window.allMaterialData = materialData;

            if (currentMode === 'location') {
                displayTotalPrice(combinedData, formattedStartDate, formattedEndDate);
            } else {
                // Panel mode - filter by selected panel
                const selectedPanel = panelNameInput.value.trim();
                if (selectedPanel) {
                    displayPanelReport(materialData, formattedStartDate, formattedEndDate, selectedPanel);
                } else {
                    alert('Please select a panel');
                    return;
                }
            }
            
            showElement(contentElement);
            showElement(exportElement);
        } catch (error) {
            console.error('Error fetching data:', error);
            alert('Failed to fetch data. Please try again.');
        }
    });

    // Add location filter functionality
    locationInput.addEventListener('change', () => {
        const selectedLocation = locationInput.value;
        const startDate = startDateInput.value;
        const endDate = endDateInput.value;
        
        // Switch to location mode
        currentMode = 'location';
        panelNameInput.value = '';
        
        if (!window.allCombinedData) {
            alert('Please fetch data first.');
            return;
        }
        
        // If no location is selected, show all data
        if (!selectedLocation) {
            displayTotalPrice(window.allCombinedData, startDate, endDate);
            return;
        }
        
        // Filter data by selected location
        const filteredData = window.allCombinedData.filter(item => item.location === selectedLocation);
        
        if (filteredData.length === 0) {
            alert(`No data found for location: ${selectedLocation}`);
            // Reset the dropdown to default
            locationInput.value = '';
            // Show all data
            displayTotalPrice(window.allCombinedData, startDate, endDate);
            return;
        }
        
        // Display filtered data
        displayTotalPrice(filteredData, startDate, endDate, selectedLocation);
    });

    // Add panel filter functionality
    panelNameInput.addEventListener('change', () => {
        const selectedPanel = panelNameInput.value.trim();
        const startDate = startDateInput.value;
        const endDate = endDateInput.value;
        
        // Switch to panel mode
        currentMode = 'panel';
        locationInput.value = '';
        
        if (!window.allMaterialData) {
            alert('Please fetch data first.');
            return;
        }
        
        if (!selectedPanel) {
            return;
        }
        
        // Display panel report
        displayPanelReport(window.allMaterialData, startDate, endDate, selectedPanel);
    });

    const displayPanelReport = (data, startDate, endDate, panelName) => {
        selectedDateRangeElement.textContent = `Panel Report: ${panelName} (${startDate} to ${endDate})`;
        
        const table = document.getElementById('totalprice-table');
        const thead = table.querySelector('thead tr');
        const tableBody = document.getElementById('materialsTableBody');
        
        // Change table headers for panel mode (removed Location column)
        thead.innerHTML = `
            <th>Panel Name</th>
            <th>Circuit</th>
            <th>Cable Name</th>
            <th>Quantity</th>
        `;
        
        tableBody.innerHTML = '';

        // Filter data by panel name
        const panelData = data.filter(item => item.panelName === panelName);
        
        if (panelData.length === 0) {
            const row = document.createElement('tr');
            row.innerHTML = `<td colspan="4" style="text-align: center;">No data found for panel: ${panelName}</td>`;
            tableBody.appendChild(row);
            return;
        }

        // Aggregate data by panel name + circuit + material name
        const aggregatedData = panelData.reduce((acc, item) => {
            const key = `${item.panelName}|${item.circuit}|${item.materialName}`;
            
            if (!acc[key]) {
                acc[key] = {
                    panelName: item.panelName,
                    circuit: item.circuit,
                    materialName: item.materialName,
                    quantity: 0,
                    unit: item.unit
                };
            }
            
            acc[key].quantity += item.quantity;
            return acc;
        }, {});

        // Sort by circuit, then by material name
        const sortedData = Object.values(aggregatedData).sort((a, b) => {
            const circuitCompare = (a.circuit || '').localeCompare(b.circuit || '');
            if (circuitCompare !== 0) return circuitCompare;
            return a.materialName.localeCompare(b.materialName);
        });

        // Display aggregated panel data
        sortedData.forEach(item => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${item.panelName}</td>
                <td>${item.circuit || 'N/A'}</td>
                <td>${item.materialName}</td>
                <td>${item.quantity} ${item.unit}</td>
            `;
            tableBody.appendChild(row);
        });
    };

    const displayTotalPrice = (data, startDate, endDate, selectedLocation = '') => {
        let dateRangeText = `Data for: ${startDate} to ${endDate}`;
        if (selectedLocation) {
            dateRangeText += ` From: ${selectedLocation}`;
        }
        selectedDateRangeElement.textContent = dateRangeText;
        
        const table = document.getElementById('totalprice-table');
        const thead = table.querySelector('thead tr');
        const tableBody = document.getElementById('materialsTableBody');
        
        // Restore price mode headers
        thead.innerHTML = `
            <th>Material Name</th>
            <th>Quantity</th>
            <th>Material Price</th>
            <th>Labor Price</th>
            <th>Total Price</th>
        `;
        
        tableBody.innerHTML = '';

        let grandTotal = 0;
        let totalMaterialPrice = 0;
        let totalLaborPrice = 0;

        // Aggregate data by material name
        const aggregatedData = data.reduce((acc, item) => {
            if (!acc[item.materialName]) {
                acc[item.materialName] = {
                    materialName: item.materialName,
                    quantity: 0,
                    unit: item.unit,
                    materialPrice: item.materialPrice,
                    laborPrice: item.laborPrice
                };
            }
            acc[item.materialName].quantity += item.quantity;
            return acc;
        }, {});

        // Convert aggregated data back to array
        Object.values(aggregatedData).forEach(item => {
            const row = document.createElement('tr');
            
            // Calculate individual row totals
            const rowMaterialCost = item.quantity * item.materialPrice;
            const rowLaborCost = item.quantity * item.laborPrice;
            const rowTotalPrice = rowMaterialCost + rowLaborCost;
            
            // Add to running totals
            totalMaterialPrice += rowMaterialCost;
            totalLaborPrice += rowLaborCost;
            grandTotal += rowTotalPrice;

            row.innerHTML = `
                <td>${item.materialName}</td>
                <td>${item.quantity} ${item.unit}</td>
                <td>${rowMaterialCost.toFixed(2)} €</td>
                <td>${rowLaborCost.toFixed(2)} €</td>
                <td>${rowTotalPrice.toFixed(2)} €</td>
            `;
            tableBody.appendChild(row);
        });

        // Create and add grand total row
        const totalRow = document.createElement('tr');
        totalRow.className = 'table-dark fw-bold'; // Keep this class to match CSS selectors
        totalRow.innerHTML = `
            <td>TOTAL</td>
            <td></td>
            <td>${totalMaterialPrice.toFixed(2)} €</td>
            <td>${totalLaborPrice.toFixed(2)} €</td>
            <td>${grandTotal.toFixed(2)} €</td>
        `;
        tableBody.appendChild(totalRow);
    };

    saveButton.addEventListener('click', async () => {
        if (startDateInput.value && endDateInput.value) {
            try {
                const startDate = startDateInput.value;
                const endDate = endDateInput.value;
                const dateRange = `${startDate} to ${endDate}`;
                const selectedLocation = locationInput.value;
                
                // Get all the materials from the table
                const tableBody = document.getElementById('materialsTableBody');
                const rows = tableBody.querySelectorAll('tr:not(.table-dark)');
                
                // Create an array of materials with proper formatting
                const materials = [];
                
                rows.forEach(row => {
                    if (row.cells.length >= 5) {
                        const materialName = row.cells[0].textContent;
                        const quantityText = row.cells[1].textContent.trim();
                        const quantity = parseFloat(quantityText.split(' ')[0]);
                        const unit = quantityText.split(' ')[1] || '';
                        const materialCost = parseFloat(row.cells[2].textContent.replace(' €', ''));
                        const laborCost = parseFloat(row.cells[3].textContent.replace(' €', ''));
                        const totalPrice = parseFloat(row.cells[4].textContent.replace(' €', ''));
                        
                        // Calculate unit prices
                        const materialPrice = quantity > 0 ? materialCost / quantity : 0;
                        const laborPrice = quantity > 0 ? laborCost / quantity : 0;
                        
                        materials.push({
                            materialName,
                            quantity,
                            unit,
                            materialPrice,
                            laborPrice,
                            totalPrice,
                            dateRange,
                            location: selectedLocation || '', // Include selected location
                            notes: ''
                        });
                    }
                });
                
                if (materials.length === 0) {
                    throw new Error('No materials found in the table');
                }
                
                console.log(`Saving ${materials.length} materials...`);
                
                // Use authenticatedFetch if available, otherwise use fetch with auth headers
                const fetchFunc = typeof authenticatedFetch === 'function' ? authenticatedFetch : fetch;
                const headers = {
                    'Content-Type': 'application/json',
                    ...(typeof authHeader === 'function' ? authHeader() : {})
                };
                
                // Send all materials in a single request
                console.log('Saving materials:', materials);
                const response = await fetchFunc('/api/user/total-prices', {
                    method: 'POST',
                    headers: headers,
                    body: JSON.stringify({ materials })
                });
                
                // Check if the response was successful
                if (!response.ok) {
                    const errorText = await response.text();
                    console.error('Error response:', errorText);
                    throw new Error(`Failed to save materials: ${response.status} ${response.statusText}`);
                }
                
                const savedMaterials = await response.json();
                console.log('Materials saved successfully:', savedMaterials);
                alert('All material data saved successfully!');
            } catch (error) {
                console.error('Error saving total price:', error);
                alert('Failed to save total price: ' + error.message);
            }
        } else {
            alert('Please select a date range first.');
        }
    });
}