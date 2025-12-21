const { getUserModels } = require('../models/userModels');

/**
 * Middleware to inject user-specific models into request object
 * This middleware should be used after authentication middleware
 */
function userDatabaseMiddleware(req, res, next) {
    // Check if user information is available in request
    if (!req.user) {
        return res.status(401).json({ error: 'User not authenticated' });
    }

    const { username, site, company } = req.user;

    // Get user-specific models (handle async operation properly)
    getUserModels(username, site, company)
        .then(userModels => {
            // Attach user models to request object
            req.userModels = userModels;
            req.userDbName = userModels.dbName;

            // Add user database info to response headers for debugging
            res.setHeader('X-User-Database', userModels.dbName);

            next();
        })
        .catch(error => {
            console.error('Error in userDatabaseMiddleware:', error);
            res.status(500).json({ error: 'Database connection error' });
        });
}

/**
 * Middleware to handle user-specific database operations
 * This middleware can be used for routes that need user-specific database access
 */
function requireUserDatabase(req, res, next) {
    if (!req.userModels) {
        return res.status(500).json({ error: 'User database not initialized' });
    }
    next();
}

/**
 * Helper function to get user models from request
 * @param {Object} req - Express request object
 * @returns {Object} User-specific models
 */
function getUserModelsFromRequest(req) {
    if (!req.userModels) {
        throw new Error('User models not available in request');
    }
    return req.userModels;
}

module.exports = {
    userDatabaseMiddleware,
    requireUserDatabase,
    getUserModelsFromRequest
}; 