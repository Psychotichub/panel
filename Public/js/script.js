document.addEventListener('DOMContentLoaded', initindex);

function initindex() {
    const dailyReport = document.getElementById('daily-report');
    const received = document.getElementById('received');
    const stock = document.getElementById('stock');
    const materialData = document.getElementById('material-data');
    const totalPrice = document.getElementById('totalprice');
    const monthlyReport = document.getElementById('monthly-report');

    if (dailyReport) {
        dailyReport.addEventListener('click', () => {
            window.location.href = '/html/daily-report.html';
        });
    }

    if (received) {
        received.addEventListener('click', () => {
            window.location.href = '/html/received.html';
        });
    }

    if (stock) {
        stock.addEventListener('click', () => {
            window.location.href = '/html/stock.html';
        });
    }

    if(materialData) {
        materialData.addEventListener('click', () => {
            window.location.href = '/html/materials.html';
        });
    }

    if (totalPrice) {
        totalPrice.addEventListener('click', () => {
            window.location.href = '/html/totalprice.html';
        });
    }

    if (monthlyReport) {
        monthlyReport.addEventListener('click', () => {
            window.location.href = '/html/monthlyreport.html';
        });
    }
}