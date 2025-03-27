const axios = require('axios');
const logger = require('./logger');

const USER_SERVICE_URL = process.env.USER_SERVICE_URL || 'http://localhost:3001/api/users';

// Get user details
async function getUser(userId, token) {
  try {
    const response = await axios.get(`${USER_SERVICE_URL}/${userId}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    });
    
    return {
      success: true,
      data: response.data.data
    };
  } catch (error) {
    logger.error(`Error fetching user ${userId}:`, error.response?.data || error.message);
    
    // In development, simulate user data
    if (process.env.NODE_ENV !== 'production') {
      logger.info(`[SIMULATED] Returning mock data for user ${userId}`);
      return {
        success: true,
        data: {
          _id: userId,
          firstName: 'Test',
          lastName: 'User',
          email: 'test@example.com',
          phone: '+1234567890',
          role: 'User'
        }
      };
    }
    
    return {
      success: false,
      error: error.response?.data?.message || 'Failed to fetch user details'
    };
  }
}

module.exports = {
  getUser
};