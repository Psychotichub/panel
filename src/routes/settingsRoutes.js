const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settingsController');
const { authenticate, requireSiteAccess } = require('../middleware/auth');

// Apply authentication middleware to all routes
router.use(authenticate);

// User routes (require site access) - ALL users including admins
router.get('/user-site-details', requireSiteAccess, settingsController.getUserSiteDetails);

module.exports = router; 