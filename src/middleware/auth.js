const jwt = require('jsonwebtoken');
// Note: `User` is required lazily in specific code paths to avoid unused imports
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_only_for_development';

// Authenticate middleware - verify token and set req.user
exports.authenticate = async (req, res, next) => {
  try {
    // Get token from header or cookie
    const token = 
      req.headers.authorization?.split(' ')[1] || 
      (req.cookies ? req.cookies.token : null);
      
    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: 'Access denied. No token provided.' 
      });
    }

    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Set user in request
    req.user = decoded;
    next();
  } catch (error) {
    console.error('Authentication error:', error.message);
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        success: false, 
        message: 'Token has expired. Please login again.' 
      });
    }
    
    return res.status(401).json({ 
      success: false, 
      message: 'Invalid token. Please login again.' 
    });
  }
};

// Alias for authenticateToken (for compatibility)
exports.authenticateToken = exports.authenticate;

// Authorize middleware - check if user has admin role
exports.isAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    return res.status(403).json({ 
      success: false, 
      message: 'Access denied. Admin privileges required.' 
    });
  }
};

// Manager access middleware - check if user has manager or admin role
exports.requireManagerAccess = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ 
      success: false, 
      message: 'Authentication required.' 
    });
  }

  // Check if user has manager or admin role
  if (req.user.role !== 'manager' && req.user.role !== 'admin') {
    return res.status(403).json({ 
      success: false, 
      message: 'Access denied. Manager privileges required.' 
    });
  }

  next();
};

// Site-based authorization middleware
// Ensures requests resolve to a site/company context.
// Priority:
// 1) If token already has site/company -> use it
// 2) If query/headers provide site/company (manager/admin) -> use them
// 3) If role is manager and no site/company -> derive from a created user
// Otherwise -> 403
exports.requireSiteAccess = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }

    // If already present in token, use it
    if (req.user.site && req.user.company) {
      req.userSite = req.user.site;
      req.userCompany = req.user.company;
      return next();
    }

    // Allow manager/admin to pass site/company via query or headers
    const candidateSite = req.query.site || req.headers['x-site'];
    const candidateCompany = req.query.company || req.headers['x-company'];
    if ((req.user.role === 'manager' || req.user.role === 'admin') && candidateSite && candidateCompany) {
      req.user.site = String(candidateSite);
      req.user.company = String(candidateCompany);
      req.userSite = req.user.site;
      req.userCompany = req.user.company;
      return next();
    }

    // As a convenience, if manager has no site/company, try to derive from any user they created
    if (req.user.role === 'manager' && (!req.user.site || !req.user.company)) {
      try {
        const User = require('../models/user');
        const ownedUser = await User.findOne({ 'createdBy.id': req.user.id, site: { $exists: true }, company: { $exists: true } })
          .select('site company')
          .lean();
        if (ownedUser && ownedUser.site && ownedUser.company) {
          req.user.site = ownedUser.site;
          req.user.company = ownedUser.company;
          req.userSite = ownedUser.site;
          req.userCompany = ownedUser.company;
          return next();
        }
      } catch (e) {
        // Fall through to error response
      }
    }

    return res.status(403).json({ success: false, message: 'Site access not configured for this user.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error resolving site access.', error: err.message });
  }
};

// Create a generic authorization middleware for specific actions
exports.authorize = (requiredRole) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Authentication required.' 
      });
    }
    
    if (requiredRole === 'admin' && req.user.role !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied. Admin privileges required.' 
      });
    }
    
    next();
  };
}; 