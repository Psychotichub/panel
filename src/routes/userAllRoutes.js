const express = require('express');
const router = express.Router();
const compatibilityMiddleware = require('../middleware/compatibilityMiddleware');
const { authenticateToken, requireSiteAccess } = require('../middleware/auth');

// Import user-specific controllers
const {
    getMaterials,
    addMaterial,
    updateMaterial,
    deleteMaterial,
    checkMaterialExists,
    searchMaterial
} = require('../controllers/userMaterialController');

const {
    getPanels,
    addPanel,
    updatePanel,
    deletePanel,
    checkPanelExists,
    searchPanel
} = require('../controllers/userPanelController');

const {
    getDailyReports,
    addDailyReport,
    updateDailyReport,
    deleteDailyReport,
    getDailyReportsByDate,
    getDailyReportsByDateRange
} = require('../controllers/userDailyReportController');

const {
    getReceivedItems,
    addReceivedItem,
    updateReceivedItem,
    deleteReceivedItem,
    getReceivedItemsByDate,
    getReceivedItemsByDateRange
} = require('../controllers/userReceivedController');

const {
    getTotalPrices,
    addTotalPrice,
    updateTotalPrice,
    deleteTotalPrice,
    getTotalPricesByDate,
    getTotalPricesByDateRange,
    calculateTotalPrice
} = require('../controllers/userTotalPriceController');

// Apply authentication, site access, and compatibility middleware to all routes
router.use(authenticateToken);
router.use(requireSiteAccess);
router.use(compatibilityMiddleware);

// ===== MATERIAL ROUTES =====
router.get('/materials', getMaterials);
router.post('/materials', addMaterial);
router.put('/materials', updateMaterial);
router.delete('/materials/:materialName', deleteMaterial);
router.get('/materials/check/:materialName', checkMaterialExists);
router.get('/materials/search/:materialName', searchMaterial);

// ===== PANEL ROUTES =====
router.get('/panels', getPanels);
router.post('/panels', addPanel);
router.put('/panels', updatePanel);
router.delete('/panels/:panelName', deletePanel);
router.get('/panels/check/:panelName', checkPanelExists);
router.get('/panels/search/:panelName', searchPanel);

// ===== DAILY REPORT ROUTES =====
router.get('/daily-reports', getDailyReports);
router.post('/daily-reports', addDailyReport);
router.put('/daily-reports/:id', updateDailyReport);
router.delete('/daily-reports/:id', deleteDailyReport);
router.get('/daily-reports/date/:date', getDailyReportsByDate);
router.get('/daily-reports/range', getDailyReportsByDateRange);

// ===== RECEIVED ITEMS ROUTES =====
router.get('/received', getReceivedItems);
router.post('/received', addReceivedItem);
router.put('/received/:id', updateReceivedItem);
router.delete('/received/:id', deleteReceivedItem);
router.get('/received/date/:date', getReceivedItemsByDate);
router.get('/received/range', getReceivedItemsByDateRange);

// ===== TOTAL PRICE ROUTES =====
router.get('/total-prices', getTotalPrices);
router.post('/total-prices', addTotalPrice);
router.put('/total-prices/:id', updateTotalPrice);
router.delete('/total-prices/:id', deleteTotalPrice);
router.get('/total-prices/date/:date', getTotalPricesByDate);
router.get('/total-prices/range', getTotalPricesByDateRange);
router.post('/total-prices/calculate', calculateTotalPrice);

module.exports = router; 