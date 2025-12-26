document.addEventListener('DOMContentLoaded', initReceived);

function initReceived() {
    // Check if user is authenticated
    if (typeof isAuthenticated === 'function' && !isAuthenticated()) {
        console.log('Not authenticated, redirecting to login page');
        window.location.href = '/login';
        return;
    }

    const dateInput = document.getElementById('date');
    const materialNameInput = document.getElementById('material-name');
    const quantityInput = document.getElementById('quantity');
    const notesInput = document.getElementById('notes');
    const saveButton = document.querySelector('.save-reoprt');
    const dataTable = document.querySelector('#data-table tbody');
    const savedDataContainer = document.getElementById('saved-data-container');
    const savedDateContainer = document.getElementById('saved-date');
    const materialList = document.getElementById('material-list');
    const filterButton = document.getElementById('filter-btn');
    const materialsTable = document.getElementById('materials-table');
    const filterDateInput = document.getElementById('filter-date');
    const printButton = document.querySelector('.print');
    const sendDataButton = document.querySelector('.send-data');

    const clearInputs = () => {
        materialNameInput.value = '';
        quantityInput.value = '';
        notesInput.value = '';
    };

    const showElement = (element) => element.classList.remove('hidden');
    const hideElement = (element) => element.classList.add('hidden');


    const currentDate = new Date().toLocaleDateString('en-CA').split('T')[0];
    dateInput.value = currentDate;
    filterDateInput.value = currentDate;

    let selectedUnit = '';

    const populateMaterialList = async () => {
        try {
            // Use authenticatedFetch if available, fall back to fetch with auth headers
            const fetchFunc = typeof authenticatedFetch === 'function' ? authenticatedFetch : fetch;
            
            const response = await fetchFunc('/api/user/materials', {
                headers: typeof authHeader === 'function' ? authHeader() : {}
            });
            
            if (!response.ok) throw new Error('Failed to fetch material names');
            const materials = await response.json();
            materialList.innerHTML = '';
            materials.forEach(material => {
                const option = document.createElement('option');
                option.value = material.materialName;
                option.dataset.unit = material.unit;
                materialList.appendChild(option);
            });
        } catch (error) {
            console.error('Error fetching material names:', error);
        }
    };
    populateMaterialList();

    materialNameInput.addEventListener('input', () => {
        const selectedOption = materialList.querySelector(`option[value="${materialNameInput.value}"]`);
        selectedUnit = selectedOption ? selectedOption.dataset.unit : '';

        const query = materialNameInput.value.toLowerCase();
        const filteredOptions = Array.from(materialList.options).filter(option =>
            option.value.toLowerCase().includes(query)
        );

        const dropdown = document.getElementById('material-dropdown');
        dropdown.innerHTML = '';

        if (filteredOptions.length > 0) {
            filteredOptions.forEach(option => {
                const dropdownItem = document.createElement('div');
                dropdownItem.className = 'dropdown-item';
                dropdownItem.textContent = option.value;
                // carry unit to dropdown item for keyboard selection path
                dropdownItem.dataset.unit = option.dataset.unit || '';
                dropdownItem.addEventListener('click', () => {
                    materialNameInput.value = option.value;
                    selectedUnit = option.dataset.unit || '';
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
                    const name = selectedItem.textContent;
                    materialNameInput.value = name;
                    // prefer unit from dropdown item, otherwise resolve from datalist
                    selectedUnit = selectedItem.dataset.unit || (Array.from(materialList.options).find(opt => opt.value === name)?.dataset.unit || '');
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

    materialNameInput.addEventListener('blur', () => {
        const isValid = Array.from(materialList.options).some(option =>
            option.value === materialNameInput.value.trim()
        );
        if (!isValid) {
            materialNameInput.value = '';
            selectedUnit = '';
        }
    });

    saveButton.addEventListener('click', async () => {
        const materialName = materialNameInput.value.trim();
        const quantity = quantityInput.value.trim();
        const notes = notesInput.value.trim();
        const date = dateInput.value;

        if (!materialName || !quantity || !date || !selectedUnit) {
            alert('Please fill in all required fields, including selecting a material and unit.');
            return;
        }

        const selectedOption = Array.from(materialList.options).find(option => option.value === materialName);
        const unit = selectedOption ? selectedOption.dataset.unit : selectedUnit;

        const data = {
            materialName,
            quantity: Number(quantity),
            unit,
            notes,
            date,
            supplier: 'Default Supplier' // Add default supplier
        };

        try {
            // Use authenticatedFetch for the API call
            const fetchFunc = typeof authenticatedFetch === 'function' ? authenticatedFetch : fetch;
            
            let response;
            if (saveButton.dataset.id) {
                const id = saveButton.dataset.id;
                response = await fetchFunc(`/api/user/received/${id}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        ...(typeof authHeader === 'function' ? authHeader() : {})
                    },
                    body: JSON.stringify(data)
                });
                saveButton.textContent = 'Save';
                delete saveButton.dataset.id;
            } else {
                response = await fetchFunc('/api/user/received', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        ...(typeof authHeader === 'function' ? authHeader() : {})
                    },
                    body: JSON.stringify(data)
                });
            }
            const result = await response.json();
            if (!response.ok) throw new Error(result.message);
            alert('Data saved successfully!');
            dataTable.innerHTML = '';
            hideElement(savedDataContainer);
            hideElement(sendDataButton);
            savedDateContainer.textContent = '';
            fetchReceivedByDate(filterDateInput.value);
        } catch (error) {
            console.error('Error saving data:', error);
        }
        clearInputs();
    });

    sendDataButton.addEventListener('click', async () => {
        const rows = document.querySelectorAll('#data-table tbody tr');
        const dataToSend = Array.from(rows).map(row => {
            const cells = row.querySelectorAll('td');
            const quantityWithUnit = cells[1].textContent.trim();
            const [quantity, unit] = quantityWithUnit.split(' ');

            return {
                materialName: cells[0].textContent.trim(),
                quantity: Number(quantity),
                unit: unit.trim(),
                notes: cells[2].textContent.trim(),
                date: dateInput.value,
                supplier: 'Default Supplier' // Add default supplier
            };
        });

        if (!dataToSend.length) {
            alert('No data to send.');
            return;
        }

        try {
            // Use authenticatedFetch for the API call
            const fetchFunc = typeof authenticatedFetch === 'function' ? authenticatedFetch : fetch;
            
            // Send each item individually since the backend expects single items
            for (const item of dataToSend) {
                const response = await fetchFunc('/api/user/received', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        ...(typeof authHeader === 'function' ? authHeader() : {})
                    },
                    body: JSON.stringify(item)
                });
                
                if (!response.ok) {
                    const result = await response.json();
                    throw new Error(result.message);
                }
            }

            alert('Data sent successfully!');
            dataTable.innerHTML = '';
            hideElement(savedDataContainer);
            hideElement(sendDataButton);
            savedDateContainer.textContent = '';
        } catch (error) {
            console.error('Error sending data:', error);
        }
    });

    const fetchReceivedByDate = async (date) => {
        try {
            const fetchFunc = typeof authenticatedFetch === 'function' ? authenticatedFetch : fetch;
            
            const response = await fetchFunc(`/api/user/received/date/${date}`, {
                headers: typeof authHeader === 'function' ? authHeader() : {}
            });
            
            if (!response.ok) throw new Error('Failed to fetch received reports');
            
            const receivedReports = await response.json();
            const tableBody = materialsTable.querySelector('tbody');
            tableBody.innerHTML = '';
            
            receivedReports.forEach(report => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${report.materialName}</td>
                    <td>${report.quantity} ${report.unit}</td>
                    <td>${report.notes || ''}</td>
                    <td>
                        <button class="edit-btn" data-id="${report._id}">Edit</button>
                        <button class="delete-btn" data-id="${report._id}">Delete</button>
                    </td>
                `;
                tableBody.appendChild(row);
            });
            
            if (receivedReports.length > 0) {
                showElement(materialsTable);
                showElement(printButton);
            } else {
                hideElement(materialsTable);
                hideElement(printButton);
            }
        } catch (error) {
            console.error('Error fetching received reports:', error);
        }
    };

    fetchReceivedByDate(currentDate);

    filterButton.addEventListener('click', async () => {
        const selectedDate = filterDateInput.value;
        if (!selectedDate) {
            alert('Please select a date!');
            return;
        }

        fetchReceivedByDate(selectedDate);
    });

    materialsTable.addEventListener('click', async (event) => {
        if (event.target.classList.contains('edit-btn')) {
            const id = event.target.dataset.id;
            const row = event.target.closest('tr');
            const materialName = row.children[0].textContent.trim();
            const quantity = row.children[1].textContent.split(' ')[0].trim();
            const unit = row.children[1].textContent.split(' ')[1].trim();
            const notes = row.children[2].textContent.trim();

            materialNameInput.value = materialName;
            quantityInput.value = quantity;
            notesInput.value = notes;
            selectedUnit = unit;

            saveButton.textContent = 'Update';
            saveButton.dataset.id = id;
        }
    });

    materialsTable.addEventListener('click', async (event) => {
        if (event.target.classList.contains('delete-btn')) {
            const id = event.target.dataset.id;
            try {
                const fetchFunc = typeof authenticatedFetch === 'function' ? authenticatedFetch : fetch;
                
                const response = await fetchFunc(`/api/user/received/${id}`, {
                    method: 'DELETE',
                    headers: typeof authHeader === 'function' ? authHeader() : {}
                });
                if (!response.ok) throw new Error('Failed to delete received material');
                alert('received material deleted successfully');
                fetchReceivedByDate(filterDateInput.value);
            } catch (error) {
                console.error('Error deleting received material:', error);
            }
        }
    });

    printButton.addEventListener('click', () => {
        const printWindow = window.open('', '', 'height=600,width=800');
        if (!printWindow) {
            alert('Unable to open print window. Please check your browser settings.');
            return;
        }

        printWindow.document.write('<html><head><title>Print</title>');
        printWindow.document.write('<style>table { width: 100%; border-collapse: collapse; } td, th { border: 1px solid black; padding: 8px; }</style>');
        printWindow.document.write('</head><body>');
        printWindow.document.write(`<h1>Received Materials: ${filterDateInput.value}</h1>`);

        const tableClone = materialsTable.cloneNode(true);
        tableClone.querySelectorAll('th:last-child, td:last-child').forEach(cell => cell.remove());
        printWindow.document.write(tableClone.outerHTML);

        printWindow.document.write('</body></html>');
        printWindow.document.close();
        printWindow.focus();

        setTimeout(() => {
            printWindow.print();
            printWindow.close();
        }, 500);
    });
}
