const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticate, isAdmin } = require('../middleware/auth');

// Register a new user
router.post('/register', authController.register);

// Login user
router.post('/login', authController.login);

// Get current user (protected route)
router.get('/me', authenticate, authController.getCurrentUser);

// Get current user (alternative endpoint for client compatibility)
router.get('/current-user', authenticate, authController.getCurrentUser);

// Get all users (admin only)
router.get('/users', authenticate, isAdmin, authController.getAllUsers);

// Get users (for managers)
router.get('/users/recent', authenticate, authController.getUsers);

// Logout user
router.post('/logout', authController.logout);

// Database status check (for monitoring)
router.get('/db-status', authController.getDatabaseStatus);

module.exports = router; 