document.addEventListener('DOMContentLoaded', initMaterialSubmit);

async function initMaterialSubmit() {
    // Check if user is authenticated and has appropriate permissions
    if (!isAuthenticated()) {
        window.location.href = '/html/login.html';
        return;
    }

    // Check if user has permission to add materials (admin only)
    const canAddMaterial = isAdmin();
    
    const submitButton = document.getElementById('submit-btn');
    const materialNameInput = document.getElementById('material-name');
    const unitInput = document.getElementById('unit');
    const materialPriceInput = document.getElementById('material-price');
    const laborPriceInput = document.getElementById('labor-price');
    const submittedTable = document.getElementById('submitted-table');
    const submittedTableBody = document.querySelector('#submitted-table tbody');
    const materialListDatalist = document.getElementById('material-list');
    const searchInput = document.getElementById('search-material-name');
    const searchForm = document.getElementById('search-form');
    const searchDropdown = document.createElement('ul'); // Changed to 'ul' for consistency
    searchDropdown.id = 'search-dropdown';
    searchInput.parentNode.appendChild(searchDropdown);

    // Hide price columns and action column for non-admin users
    if (!canAddMaterial) {
        const tableHeaders = document.querySelectorAll('#submitted-table th');
        if (tableHeaders.length > 0) {
            // Hide price columns (Material Price, Labor Price, Total Price) and Action column
            tableHeaders.forEach((header) => {
                const headerText = header.textContent.toLowerCase();
                if (headerText.includes('price') || headerText.includes('action')) {
                    header.style.display = 'none';
                }
            });
        }
    }

    // Hide add material form if user doesn't have permission
    const materialForm = document.getElementById('material-form');
    if (materialForm && !canAddMaterial) {
        materialForm.style.display = 'none';
        const noPermissionMessage = document.createElement('div');
        noPermissionMessage.className = 'alert alert-warning';
        noPermissionMessage.innerHTML = `
            <p>Only site administrators can manage materials with pricing information.</p>
        `;
        materialForm.parentNode.insertBefore(noPermissionMessage, materialForm);
    } else if (materialForm && canAddMaterial) {
        // Add info message for admin users
        const adminInfoMessage = document.createElement('div');
        adminInfoMessage.className = 'alert alert-info';
        adminInfoMessage.innerHTML = `
            <h4>Site Material Management</h4>
            <p><strong>Note:</strong> Materials you add, edit, or delete will be shared across all users in your site.</p>
            <p>All users in your site can use these materials for their daily reports and received reports.</p>
        `;
        materialForm.parentNode.insertBefore(adminInfoMessage, materialForm);
    }

    let materialsList = [];

    async function loadMaterials() {
        try {
            const response = await authenticatedFetch('/api/user/materials');
            const materials = await response.json();
            if (response.ok) {
                submittedTableBody.innerHTML = '';
                materialsList = materials.map(material => material.materialName);
                materials.sort((a, b) => a.materialName.localeCompare(b.materialName));
                materials.forEach(addMaterialToTable);
                updateMaterialList();
                submittedTable.classList.toggle('hidden', materials.length === 0);
            } else {
                console.error('Error fetching materials:', materials.message);
            }
        } catch (error) {
            console.error('Error loading materials:', error);
        }
    }

    loadMaterials();

    if (submitButton && canAddMaterial) {
        submitButton.addEventListener('click', async () => {
            const materialName = materialNameInput.value.trim();
            const unit = unitInput.value;
            const materialPrice = parseFloat(materialPriceInput.value);
            const laborPrice = parseFloat(laborPriceInput.value);

            if (!materialName || !unit || isNaN(materialPrice) || isNaN(laborPrice)) {
                alert('Please fill in all fields correctly.');
                return;
            }

            const isEditing = submitButton.dataset.editing;
            if (isEditing) {
                try {
                    const response = await authenticatedFetch('/api/user/materials', {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ 
                            originalMaterialName: isEditing,
                            materialName, 
                            unit, 
                            materialPrice, 
                            laborPrice 
                        }),
                    });

                    if (response.ok) {
                        alert('Material updated successfully.');
                        loadMaterials(); // Reload all materials to refresh the table
                        resetForm();
                    } else {
                        const errorResult = await response.json();
                        if (response.status === 403) {
                            alert('Access Denied: ' + errorResult.message);
                        } else {
                            alert('Error: ' + errorResult.message);
                        }
                    }
                } catch (error) {
                    alert('Error updating data on server.');
                }
            } else {
                try {
                    const checkResponse = await authenticatedFetch(`/api/user/materials/check/${materialName}`);
                    const checkResult = await checkResponse.json();
                    if (checkResult.exists) {
                        alert('Material name already exists.');
                        return;
                    }
                } catch (error) {
                    alert('Error checking material name on server.');
                    return;
                }

                try {
                    const response = await authenticatedFetch('/api/user/materials', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            materialName,
                            unit,
                            materialPrice,
                            laborPrice
                        })
                    });

                    const result = await response.json();
                    if (response.ok) {
                        addMaterialToTable({
                            materialName,
                            unit,
                            materialPrice,
                            laborPrice
                        });
                        materialsList.push(materialName);
                        updateMaterialList();
                        submittedTable.classList.remove('hidden');
                        alert('Material added successfully.');
                    } else {
                        if (response.status === 403) {
                            alert('Access Denied: ' + result.message);
                        } else {
                            alert(`Error: ${result.message}`);
                        }
                    }
                } catch (error) {
                    console.error('Error submitting material:', error);
                    alert('Failed to submit material. Please try again.');
                }
            }

            resetForm();
        });
    }

    searchInput.addEventListener('input', () => {
        const searchTerm = searchInput.value.trim();
        updateSearchDropdown(searchTerm);
    });

    function updateSearchDropdown(searchTerm) {
        searchDropdown.innerHTML = '';
        if (searchTerm.length === 0) {
            return;
        }
        const filteredMaterials = materialsList.filter(material =>
            material.toLowerCase().includes(searchTerm.toLowerCase())
        );
        filteredMaterials.forEach((material) => {
            const item = document.createElement('li');
            item.textContent = material;
            item.addEventListener('click', () => {
                searchInput.value = material;
                filterMaterials(material);
                searchDropdown.innerHTML = '';
            });
            searchDropdown.appendChild(item);
        });
    }

    function filterMaterials(searchTerm) {
        const rows = submittedTableBody.querySelectorAll('tr');
        rows.forEach(row => {
            const materialName = row.querySelector('td').textContent.toLowerCase();
            if (materialName.includes(searchTerm.toLowerCase())) {
                row.style.display = '';
            } else {
                row.style.display = 'none';
            }
        });
    }

    searchForm.addEventListener('submit', (event) => {
        event.preventDefault();
        const searchTerm = searchInput.value.trim();
        filterMaterials(searchTerm);
    });

    function addMaterialToTable({ materialName, unit, materialPrice, laborPrice }) {
        const row = document.createElement('tr');
        
        const nameCell = document.createElement('td');
        nameCell.textContent = materialName;
        
        const unitCell = document.createElement('td');
        unitCell.textContent = unit;
        
        // Only add price cells for admin users
        if (canAddMaterial) {
            const materialPriceCell = document.createElement('td');
            materialPriceCell.textContent = materialPrice.toFixed(2) + ' €';
            
            const laborPriceCell = document.createElement('td');
            laborPriceCell.textContent = laborPrice.toFixed(2) + ' €';
            
            const totalPriceCell = document.createElement('td');
            totalPriceCell.textContent = (materialPrice + laborPrice).toFixed(2) + ' €';
            
            row.appendChild(nameCell);
            row.appendChild(unitCell);
            row.appendChild(materialPriceCell);
            row.appendChild(laborPriceCell);
            row.appendChild(totalPriceCell);
            
            // Add actions cell for admin users
            const actionsCell = document.createElement('td');
            
            // Add edit button
            const editButton = document.createElement('button');
            editButton.className = 'btn btn-primary btn-sm me-2';
            editButton.textContent = 'Edit';
            editButton.addEventListener('click', () => {
                // Populate form with material data
                materialNameInput.value = materialName;
                unitInput.value = unit;
                materialPriceInput.value = materialPrice.toFixed(2);
                laborPriceInput.value = laborPrice.toFixed(2);
                
                // Change submit button to indicate editing mode
                submitButton.textContent = 'Update';
                submitButton.dataset.editing = materialName;
                
                // Scroll to form
                materialForm.scrollIntoView({ behavior: 'smooth' });
            });
            actionsCell.appendChild(editButton);
            
            // Add delete button
            const deleteButton = document.createElement('button');
            deleteButton.className = 'btn btn-danger btn-sm';
            deleteButton.textContent = 'Delete';
            deleteButton.addEventListener('click', async () => {
                if (confirm(`Are you sure you want to delete ${materialName}?`)) {
                    try {
                        const response = await authenticatedFetch(`/api/user/materials/${encodeURIComponent(materialName)}`, {
                            method: 'DELETE'
                        });
                        
                        if (response.ok) {
                            row.remove();
                            if (submittedTableBody.children.length === 0) {
                                submittedTable.classList.add('hidden');
                            }
                            updateMaterialList();
                        } else {
                            const result = await response.json();
                            if (response.status === 403) {
                                alert('Access Denied: ' + result.message);
                            } else {
                                alert(`Error: ${result.message}`);
                            }
                        }
                    } catch (error) {
                        console.error('Error deleting material:', error);
                        alert('Failed to delete material. Please try again.');
                    }
                }
            });
            actionsCell.appendChild(deleteButton);
            
            row.appendChild(actionsCell);
        } else {
            // For non-admin users, only show name and unit
            row.appendChild(nameCell);
            row.appendChild(unitCell);
        }
        
        submittedTableBody.appendChild(row);
    }

    function updateMaterialList() {
        materialListDatalist.innerHTML = '';
        materialsList.forEach(material => {
            const option = document.createElement('option');
            option.value = material;
            materialListDatalist.appendChild(option);
        });
    }

    materialNameInput.addEventListener('input', () => {
        const query = materialNameInput.value.toLowerCase();
        const filteredOptions = materialsList.filter(material =>
            material.toLowerCase().includes(query)
        );

        const dropdown = document.getElementById('material-dropdown');
        dropdown.innerHTML = '';

        if (filteredOptions.length > 0) {
            filteredOptions.forEach(material => {
                const dropdownItem = document.createElement('div');
                dropdownItem.className = 'dropdown-item';
                dropdownItem.textContent = material;
                dropdownItem.addEventListener('click', () => {
                    materialNameInput.value = material;
                    dropdown.classList.add('hidden');
                });
                dropdown.appendChild(dropdownItem);
            });
            dropdown.classList.remove('hidden');
        } else {
            dropdown.classList.add('hidden');
        }
    });

    // Add keyboard navigation for material dropdown
    let selectedDropdownIndex = -1;
    const dropdown = document.getElementById('material-dropdown');

    materialNameInput.addEventListener('keydown', (e) => {
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
                    materialNameInput.value = selectedItem.textContent;
                    dropdown.classList.add('hidden');
                    selectedDropdownIndex = -1;
                }
                break;
            case 'Escape':
                dropdown.classList.add('hidden');
                selectedDropdownIndex = -1;
                break;
        }
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

    // Reset selection when input changes
    materialNameInput.addEventListener('input', () => {
        selectedDropdownIndex = -1;
    });

    document.addEventListener('click', (e) => {
        const dropdown = document.getElementById('material-dropdown');
        if (!materialNameInput.contains(e.target) && !dropdown.contains(e.target)) {
            dropdown.classList.add('hidden');
        }
    });

    function resetForm() {
        materialNameInput.value = '';
        unitInput.value = '';
        materialPriceInput.value = '';
        laborPriceInput.value = '';
        submitButton.textContent = 'Submit';
        delete submitButton.dataset.editing;
    }
}
