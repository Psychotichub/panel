const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const {
    getSiteUsers,
    getSiteMaterials,
    getSiteDailyReports,
    getSiteReceivedItems,
    getSiteTotalPrices,
    getSiteStatistics,
    getUserData,
    calculateSiteTotalPrices
} = require('../controllers/adminSiteController');

// Middleware to check if user is admin
const requireAdmin = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        res.status(403).json({ error: 'Admin access required' });
    }
};

// Apply authentication and admin middleware to all routes
router.use(authenticateToken);
router.use(requireAdmin);

// ===== SITE-LEVEL ADMIN ROUTES =====

// Get all users in the same site as the admin
router.get('/site/users', getSiteUsers);



// Get all materials from all users in the same site
router.get('/site/materials', getSiteMaterials);

// Get all daily reports from all users in the same site
router.get('/site/daily-reports', getSiteDailyReports);

// Get all received items from all users in the same site
router.get('/site/received', getSiteReceivedItems);

// Get all total prices from all users in the same site
router.get('/site/total-prices', getSiteTotalPrices);

// Calculate total prices dynamically from daily reports and material prices
router.get('/site/calculate-total-prices', calculateSiteTotalPrices);

// Get comprehensive site statistics
router.get('/site/statistics', getSiteStatistics);

// Get specific user's data (admin can access any user in their site)
router.get('/site/users/:username', getUserData);

// ===== DATE RANGE QUERIES =====

// Get daily reports by date range for all users in the site
router.get('/site/daily-reports/range', getSiteDailyReports);

// Get received items by date range for all users in the site
router.get('/site/received/range', getSiteReceivedItems);

// Get total prices by date range for all users in the site
router.get('/site/total-prices/range', getSiteTotalPrices);

module.exports = router; 