document.addEventListener('DOMContentLoaded', initMonthlyReport);
async function initMonthlyReport() {
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

    const dateRange = document.getElementById('date-range');
    const monthlyReport = document.getElementById('monthly-report').querySelector('tbody');
    const monthlyReportTable = document.getElementById('monthly-report');
    const showDate = document.getElementById('date');
    const printButton = document.getElementById('print');
    const exportExcelButton = document.getElementById('export');
    const monthlyReportDiv = document.getElementById('monthly-report');

    const displayData = (data) => {
        dateRange.innerHTML = '';
        const uniqueDateRanges = new Set();
        data.forEach(item => {
            if (!uniqueDateRanges.has(item.dateRange)) {
                uniqueDateRanges.add(item.dateRange);
                const row = document.createElement('tr');
                row.innerHTML = `<td>${item.dateRange}</td>`;

                const dateDiv = document.createElement('div');
                dateDiv.innerHTML = `Date: ${item.dateRange}`;
                dateDiv.classList.add('clickable-date-range');
                dateDiv.addEventListener('click', () => displayReportForDateRange(item.dateRange));
                dateRange.appendChild(dateDiv);
            }
        });

        monthlyReportTable.style.display = 'none';
        printButton.style.display = 'none';
        exportExcelButton.style.display = 'none';
    };

    const displayReportForDateRange = async (selectedDateRange) => {
        try {
            // Use authenticatedFetch if available, otherwise use fetch with auth headers
            const fetchFunc = typeof authenticatedFetch === 'function' ? authenticatedFetch : fetch;
            const headers = typeof authHeader === 'function' ? authHeader() : {};
            
            const response = await fetchFunc(`/api/user/total-prices?dateRange=${selectedDateRange}`, {
                headers: headers
            });
            
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            const data = await response.json();
            monthlyReport.innerHTML = '';
            showDate.innerHTML = `Situation for Date: ${selectedDateRange}`;
            let totalSum = 0;
            let totalMaterialPrice = 0;
            let totalLaborPrice = 0;
            data.forEach(item => {
                if (item.dateRange === selectedDateRange) {
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td>${item.materialName} </td>
                        <td>${item.quantity} ${item.unit}</td>
                        <td>${item.materialPrice} €</td>
                        <td>${item.laborPrice} €</td>
                        <td>${item.totalPrice} €</td>
                    `;
                    monthlyReport.appendChild(row);
                    totalSum += item.totalPrice;
                    totalMaterialPrice += item.materialPrice;
                    totalLaborPrice += item.laborPrice;
                }
            });

            // Add total row
            const totalRow = document.createElement('tr');
            totalRow.innerHTML = `
                <td><strong>Total</strong></td>
                <td></td>
                <td><strong>${totalMaterialPrice.toFixed(2)} €</strong></td>
                <td><strong>${totalLaborPrice.toFixed(2)} €</strong></td>
                <td><strong>${totalSum.toFixed(2)} €</strong></td>
            `;
            monthlyReport.appendChild(totalRow);

            monthlyReportTable.style.display = 'block';
            printButton.style.display = 'inline-block';
            exportExcelButton.style.display = 'inline-block';
            monthlyReportDiv.classList.remove('hidden');
        } catch (error) {
            console.error('Error fetching data for date range:', error);
            alert('Failed to load data for the selected date range.');
        }
    };

    const fetchData = async () => {
        try {
            // Use authenticatedFetch if available, otherwise use fetch with auth headers
            const fetchFunc = typeof authenticatedFetch === 'function' ? authenticatedFetch : fetch;
            const headers = typeof authHeader === 'function' ? authHeader() : {};
            
            const response = await fetchFunc('/api/user/total-prices', {
                headers: headers
            });
            
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            
            const data = await response.json();
            displayData(data);
        } catch (error) {
            console.error('Error fetching data:', error);
            alert('Failed to load data. Please try again.');
        }
    };

    // Initialize data
    fetchData();

    // Print functionality
    printButton.addEventListener('click', () => {
        printElement(monthlyReportDiv);
    });

    const printElement = (element) => {
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <html>
            <head>
                <title>Monthly Report</title>
                <style>
                    body { font-family: Arial, sans-serif; }
                    table { width: 100%; border-collapse: collapse; }
                    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                    th { background-color: #f2f2f2; }
                </style>
            </head>
            <body>
                <h2>${showDate.innerHTML}</h2>
                ${element.querySelector('table').outerHTML}
            </body>
            </html>
        `);
        printWindow.document.close();
        printWindow.print();
    };

    // Define exportToExcel function before using it
    const exportToExcel = () => {
        const workbook = XLSX.utils.book_new();
        const table = monthlyReportDiv.querySelector('table');
        const ws = XLSX.utils.table_to_sheet(table);

        // Format the XLSX
        const range = XLSX.utils.decode_range(ws['!ref']);
        for (let C = range.s.c; C <= range.e.c; ++C) {
            const address = XLSX.utils.encode_col(C) + '1';
            if (!ws[address]) continue;
            ws[address].s = {
                font: { bold: true, color: { rgb: 'FFFFFF' } },
                fill: { fgColor: { rgb: '4472C4' } },
                alignment: { horizontal: 'center' }
            };
        }

        XLSX.utils.book_append_sheet(workbook, ws, 'Monthly Report');
        XLSX.writeFile(workbook, `Monthly_Report_${showDate.innerHTML.replace('Situation for Date: ', '')}.xlsx`);
    };

    // Export to Excel - attach event listener after function is defined
    exportExcelButton.addEventListener('click', exportToExcel);
}
