const { getUserModels } = require('../models/siteUserModels');

// Compatibility middleware to handle both old and new API endpoints
function compatibilityMiddleware(req, res, next) {
    // Store original URL for reference
    req.originalUrl = req.originalUrl || req.url;
    
    // Check if this is a user-specific API call
    if (req.originalUrl.startsWith('/api/user/')) {
        // Extract user information from request
        const user = req.user;
        
        if (!user) {
            return res.status(401).json({ 
                success: false, 
                message: 'User not authenticated' 
            });
        }

        // Set user context for the request
        req.userContext = {
            userId: user.username || user.id,
            site: user.site || 'default',
            company: user.company || 'default'
        };

        // Add helper methods to request
        req.getUserModels = async () => {
            try {
                return await getUserModels(
                    req.userContext.userId,
                    req.userContext.site,
                    req.userContext.company
                );
            } catch (error) {
                console.error('Error getting user models:', error);
                throw error;
            }
        };

        // Add database info to request
        req.getUserDatabaseInfo = () => {
            const dbName = `user_${req.userContext.userId}_${req.userContext.site}_${req.userContext.company}`;
            return {
                dbName,
                userId: req.userContext.userId,
                site: req.userContext.site,
                company: req.userContext.company
            };
        };
    }

    next();
}

module.exports = compatibilityMiddleware; 