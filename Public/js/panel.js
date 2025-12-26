document.addEventListener('DOMContentLoaded', initPanelModule);

async function initPanelModule() {
    if (!isAuthenticated()) {
        window.location.href = '/html/login.html';
        return;
    }

    const canManagePanels = isAdmin();
    const panelNameInput = document.getElementById('panel-name');
    const circuitSelect = document.getElementById('circuit');
    const submitButton = document.getElementById('submit-btn');
    const submittedTable = document.getElementById('submitted-table');
    const submittedTableBody = document.getElementById('submitted-table-body');
    const panelListDatalist = document.getElementById('panel-list');
    const searchInput = document.getElementById('search-panel-name');
    const searchForm = document.getElementById('search-form');
    const dropdown = document.getElementById('panel-dropdown');
    const searchDropdown = document.getElementById('search-dropdown');
    const panelFilterSelect = document.getElementById('panel-filter-select');
    const tableFilterContainer = document.getElementById('table-filter-container');

    if (
        !panelNameInput ||
        !circuitSelect ||
        !submitButton ||
        !submittedTableBody ||
        !panelListDatalist ||
        !searchInput ||
        !searchForm ||
        !dropdown ||
        !searchDropdown ||
        !panelFilterSelect ||
        !tableFilterContainer
    ) {
        console.error('Panel form elements are missing.');
        return;
    }

    // Hide action column for non-admin users only
    const headerCells = document.querySelectorAll('#submitted-table th');
    headerCells.forEach((header) => {
        if (!canManagePanels && header.textContent.toLowerCase().includes('action')) {
            header.style.display = 'none';
        }
    });

    const panelForm = document.getElementById('material-form');
    if (panelForm && !canManagePanels) {
        panelForm.style.display = 'none';
        const noPermissionMessage = document.createElement('div');
        noPermissionMessage.className = 'alert alert-warning';
        noPermissionMessage.innerHTML = `
            <p>Only site administrators can manage panels.</p>
        `;
        panelForm.parentNode.insertBefore(noPermissionMessage, panelForm);
    }

    const panelsList = [];
    let selectedDropdownIndex = -1;
    let allPanelsData = []; // Store all panel data for reference

    async function loadPanels() {
        try {
            const response = await authenticatedFetch('/api/user/panels');
            const panels = await response.json();
            if (response.ok) {
                submittedTableBody.innerHTML = '';
                panelsList.length = 0;
                allPanelsData = panels;
                
                // Extract unique panel names for autocomplete
                const uniquePanelNames = [...new Set(panels.map(p => p.panelName))];
                panelsList.push(...uniquePanelNames);
                
                // Group panels by panel name
                const groupedPanels = groupPanelsByName(panels);
                
                // Render grouped panels with merged cells
                renderGroupedPanels(groupedPanels);
                
                updatePanelList();
                updateFilterDropdown();
                submittedTable.classList.toggle('hidden', panels.length === 0);
                tableFilterContainer.classList.toggle('hidden', panels.length === 0);
            } else {
                console.error('Error fetching panels:', panels.message);
            }
        } catch (error) {
            console.error('Error loading panels:', error);
        }
    }

    function groupPanelsByName(panels) {
        const grouped = {};
        panels
            .sort((a, b) => {
                // Sort by panel name first, then by circuit
                const nameCompare = a.panelName.localeCompare(b.panelName);
                if (nameCompare !== 0) return nameCompare;
                return (a.circuit || '').localeCompare(b.circuit || '');
            })
            .forEach((panel) => {
                if (!grouped[panel.panelName]) {
                    grouped[panel.panelName] = [];
                }
                grouped[panel.panelName].push(panel);
            });
        return grouped;
    }

    function renderGroupedPanels(groupedPanels) {
        Object.keys(groupedPanels).forEach((panelName) => {
            const circuits = groupedPanels[panelName];
            circuits.forEach((panel, index) => {
                const row = document.createElement('tr');
                row.dataset.panelName = panel.panelName;
                row.dataset.circuit = panel.circuit;

                // Panel name cell - only show in first row with rowspan
                if (index === 0) {
                    const nameCell = document.createElement('td');
                    nameCell.textContent = panel.panelName;
                    nameCell.rowSpan = circuits.length;
                    nameCell.style.verticalAlign = 'top';
                    row.appendChild(nameCell);
                }

                // Circuit cell
                const circuitCell = document.createElement('td');
                circuitCell.textContent = panel.circuit;
                row.appendChild(circuitCell);

                // Action cell - each circuit has its own edit/delete buttons
                if (canManagePanels) {
                    const actionsCell = document.createElement('td');

                    const editButton = document.createElement('button');
                    editButton.className = 'btn btn-primary btn-sm me-2';
                    editButton.textContent = 'Edit';
                    editButton.addEventListener('click', () => {
                        panelNameInput.value = panel.panelName;
                        circuitSelect.value = panel.circuit;
                        submitButton.textContent = 'Update';
                        submitButton.dataset.editing = panel.panelName;
                        submitButton.dataset.editingCircuit = panel.circuit;
                        panelForm.scrollIntoView({ behavior: 'smooth' });
                    });
                    actionsCell.appendChild(editButton);

                    const deleteButton = document.createElement('button');
                    deleteButton.className = 'btn btn-danger btn-sm';
                    deleteButton.textContent = 'Delete';
                    deleteButton.addEventListener('click', async () => {
                        if (confirm(`Are you sure you want to delete ${panel.panelName} - ${panel.circuit}?`)) {
                            try {
                                const response = await authenticatedFetch(`/api/user/panels/${encodeURIComponent(panel.panelName)}`, {
                                    method: 'DELETE'
                                });

                                if (response.ok) {
                                    // Reload panels to refresh the table with merged cells
                                    loadPanels();
                                } else {
                                    const result = await response.json();
                                    alert(`Error: ${result.message}`);
                                }
                            } catch (error) {
                                console.error('Error deleting panel:', error);
                                alert('Failed to delete panel. Please try again.');
                            }
                        }
                    });
                    actionsCell.appendChild(deleteButton);

                    row.appendChild(actionsCell);
                }

                submittedTableBody.appendChild(row);
            });
        });
    }

    loadPanels();

    if (submitButton && canManagePanels) {
        submitButton.addEventListener('click', async () => {
            const panelName = panelNameInput.value.trim();
            const circuit = circuitSelect.value;

            if (!panelName || !circuit) {
                alert('Please fill in all fields correctly.');
                return;
            }

            const isEditing = submitButton.dataset.editing;
            const editingCircuit = submitButton.dataset.editingCircuit;
            if (isEditing) {
                try {
                    const response = await authenticatedFetch('/api/user/panels', {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            originalPanelName: isEditing,
                            panelName,
                            circuit
                        })
                    });

                    if (response.ok) {
                        alert('Panel updated successfully.');
                        loadPanels();
                        resetForm();
                    } else {
                        const errorResult = await response.json();
                        alert('Error: ' + (errorResult.message || 'Unable to update panel.'));
                    }
                } catch (error) {
                    alert('Error updating panel on server.');
                }
            } else {
                try {
                    // Check if the exact combination of panel name + circuit already exists
                    const response = await authenticatedFetch('/api/user/panels');
                    const panels = await response.json();
                    
                    if (response.ok) {
                        // Check for exact combination match
                        const duplicateCombo = panels.find(p => 
                            p.panelName === panelName && p.circuit === circuit
                        );
                        
                        // Check if panel name exists with different circuit
                        const panelExists = panels.find(p => p.panelName === panelName);
                        const circuitExists = panels.find(p => p.circuit === circuit);
                        
                        console.log('Validation check:', {
                            panelName,
                            circuit,
                            panelExists: !!panelExists,
                            circuitExists: !!circuitExists,
                            duplicateCombo: !!duplicateCombo
                        });
                        
                        if (duplicateCombo) {
                            alert('This combination of Panel Name and Circuit already exists. Please use a different combination.');
                            return;
                        }
                        
                        // Log allowed scenarios
                        if (panelExists && !duplicateCombo) {
                            console.log('✅ Panel name exists but with different circuit - ALLOWED');
                        }
                        if (circuitExists && !duplicateCombo) {
                            console.log('✅ Circuit exists but with different panel - ALLOWED');
                        }
                        if (!panelExists && !circuitExists) {
                            console.log('✅ New panel and circuit combination - ALLOWED');
                        }
                    }
                } catch (error) {
                    console.error('Error checking panel existence:', error);
                    alert('Error checking panel existence on server.');
                    return;
                }

                try {
                    const response = await authenticatedFetch('/api/user/panels', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ panelName, circuit })
                    });

                    const result = await response.json();
                    if (response.ok) {
                        // Reload all panels to refresh the table with merged cells
                        loadPanels();
                        alert('Panel added successfully.');
                    } else {
                        alert(`Error: ${result.message}`);
                    }
                } catch (error) {
                    console.error('Error submitting panel:', error);
                    alert('Failed to submit panel. Please try again.');
                }
            }

            resetForm();
        });
    }

    searchInput.addEventListener('input', () => {
        const searchTerm = searchInput.value.trim();
        updateSearchDropdown(searchTerm);
    });

    searchForm.addEventListener('submit', (event) => {
        event.preventDefault();
        const searchTerm = searchInput.value.trim();
        // Reset filter dropdown when using search
        panelFilterSelect.value = '';
        filterPanels(searchTerm);
    });

    panelNameInput.addEventListener('input', () => {
        const query = panelNameInput.value.toLowerCase();
        const filteredOptions = panelsList.filter((panel) =>
            panel.toLowerCase().includes(query)
        );

        dropdown.innerHTML = '';

        if (filteredOptions.length > 0) {
            filteredOptions.forEach((panel) => {
                const dropdownItem = document.createElement('div');
                dropdownItem.className = 'dropdown-item';
                dropdownItem.textContent = panel;
                dropdownItem.addEventListener('click', () => {
                    panelNameInput.value = panel;
                    dropdown.classList.add('hidden');
                });
                dropdown.appendChild(dropdownItem);
            });
            dropdown.classList.remove('hidden');
        } else {
            dropdown.classList.add('hidden');
        }
    });

    panelNameInput.addEventListener('keydown', (e) => {
        const dropdownItems = dropdown.querySelectorAll('.dropdown-item');

        if (!dropdownItems.length || dropdown.classList.contains('hidden')) {
            selectedDropdownIndex = -1;
            return;
        }

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                selectedDropdownIndex = Math.min(selectedDropdownIndex + 1, dropdownItems.length - 1);
                updateDropdownSelection(dropdownItems);
                break;
            case 'ArrowUp':
                e.preventDefault();
                selectedDropdownIndex = Math.max(selectedDropdownIndex - 1, -1);
                updateDropdownSelection(dropdownItems);
                break;
            case 'Enter':
                e.preventDefault();
                if (selectedDropdownIndex >= 0 && selectedDropdownIndex < dropdownItems.length) {
                    const selectedItem = dropdownItems[selectedDropdownIndex];
                    panelNameInput.value = selectedItem.textContent;
                    dropdown.classList.add('hidden');
                    selectedDropdownIndex = -1;
                }
                break;
            case 'Escape':
                dropdown.classList.add('hidden');
                selectedDropdownIndex = -1;
                break;
            default:
                break;
        }
    });

    // Reset selection when input changes
    panelNameInput.addEventListener('input', () => {
        selectedDropdownIndex = -1;
    });

    document.addEventListener('click', (e) => {
        if (!panelNameInput.contains(e.target) && !dropdown.contains(e.target)) {
            dropdown.classList.add('hidden');
        }
    });


    function updatePanelList() {
        panelListDatalist.innerHTML = '';
        panelsList.forEach((panel) => {
            const option = document.createElement('option');
            option.value = panel;
            panelListDatalist.appendChild(option);
        });
    }

    function updateSearchDropdown(searchTerm) {
        searchDropdown.innerHTML = '';
        if (searchTerm.length === 0) {
            return;
        }
        const filteredPanels = panelsList.filter((panel) =>
            panel.toLowerCase().includes(searchTerm.toLowerCase())
        );
        filteredPanels.forEach((panel) => {
            const item = document.createElement('div');
            item.textContent = panel;
            item.className = 'dropdown-item';
            item.addEventListener('click', () => {
                searchInput.value = panel;
                filterPanels(panel);
                searchDropdown.innerHTML = '';
            });
            searchDropdown.appendChild(item);
        });
    }

    function filterPanels(searchTerm) {
        const rows = submittedTableBody.querySelectorAll('tr');
        const searchLower = searchTerm.toLowerCase();
        
        rows.forEach((row) => {
            const panelName = row.dataset.panelName ? row.dataset.panelName.toLowerCase() : '';
            if (panelName.includes(searchLower)) {
                row.style.display = '';
            } else {
                row.style.display = 'none';
            }
        });
    }

    function updateFilterDropdown() {
        panelFilterSelect.innerHTML = '<option value="">All Panels</option>';
        const uniquePanelNames = [...new Set(panelsList)].sort();
        uniquePanelNames.forEach((panelName) => {
            const option = document.createElement('option');
            option.value = panelName;
            option.textContent = panelName;
            panelFilterSelect.appendChild(option);
        });
    }

    function filterTableByPanel(selectedPanelName) {
        const rows = submittedTableBody.querySelectorAll('tr');
        
        rows.forEach((row) => {
            const rowPanelName = row.dataset.panelName || '';
            if (!selectedPanelName || selectedPanelName === '' || rowPanelName === selectedPanelName) {
                row.style.display = '';
            } else {
                row.style.display = 'none';
            }
        });
    }

    // Add event listener for filter dropdown
    panelFilterSelect.addEventListener('change', (e) => {
        const selectedPanel = e.target.value;
        // Clear search input when using filter dropdown
        searchInput.value = '';
        searchDropdown.innerHTML = '';
        filterTableByPanel(selectedPanel);
    });

    function updateDropdownSelection(dropdownItems) {
        dropdownItems.forEach((item, index) => {
            if (index === selectedDropdownIndex) {
                item.classList.add('selected');
                item.scrollIntoView({ block: 'nearest' });
            } else {
                item.classList.remove('selected');
            }
        });
    }

    function resetForm() {
        panelNameInput.value = '';
        circuitSelect.value = '';
        submitButton.textContent = 'Submit';
        delete submitButton.dataset.editing;
        delete submitButton.dataset.editingCircuit;
    }
}

