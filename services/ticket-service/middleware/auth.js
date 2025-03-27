const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

exports.authenticate = (req, res, next) => {
  try {
    // Get token from  header
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (token === process.env.MASTER_TOKEN) {
      req.user = {
        id: process.env.MASTER_USER_ID,
        role: 'Admin'
      };
      return next();
    }
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No authentication token, access denied'
      });
    }
    
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Add user info to request object
    req.user = {
      id: decoded.id,
      role: decoded.role
    };
    
    next();
  } catch (error) {
    logger.error('Authentication error:', error);
    res.status(401).json({
      success: false,
      message: 'Token is not valid'
    });
  }
};

// Authorization middleware for specific roles
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      logger.warn(`Unauthorized access attempt by user ${req.user.id}`);
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to perform this action'
      });
    }
    next();
  };
};