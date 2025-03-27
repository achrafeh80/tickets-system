const express = require('express');
const { register, login, getProfile, updateProfile } = require('../controllers/userController');
const { authenticate, authorize } = require('../middleware/auth');
const fs = require('fs').promises;
const path = require('path');
const logger = require('../utils/logger');

const router = express.Router();


/**
 * @swagger
 *  /register:
 *   post:
 *     summary: Register a new user
 *     tags: [Users]
 *     description: Creates a new user with the provided email, password, and personal details.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *               - firstName
 *               - lastName
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               language:
 *                 type: string
 *                 enum: [en, fr]
 *     responses:
 *       201:
 *         description: User registered successfully
 *       400:
 *         description: User already exists
 */



/**
 * @swagger
 *  /login:
 *   post:
 *     summary: User login
 *     tags: [Users]
 *     description: Authenticates a user and returns a JWT token
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful
 *       401:
 *         description: Invalid credentials
 */




/**
 * @swagger
 *  /profile:
 *   get:
 *     summary: Get logged-in user's profile
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile returned
 *       404:
 *         description: User not found
 *       401:
 *         description: Unauthorized
 */



/**
 * @swagger
 *  /profile:
 *   put:
 *     summary: Update user profile
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               language:
 *                 type: string
 *                 enum: [en, fr]
 *     responses:
 *       200:
 *         description: User profile updated
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: User not found
 */



/**
 * @swagger
 * /all:
 *   get:
 *     summary: Get all users (Admin only)
 *     tags: [Admin]
 *     description: Retrieves a list of all users in the system
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all users
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 users:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       email:
 *                         type: string
 *                       firstName:
 *                         type: string
 *                       lastName:
 *                         type: string
 *                       role:
 *                         type: string
 *                       language:
 *                         type: string
 *       401:
 *         description: Unauthorized - Not logged in
 *       403:
 *         description: Forbidden - Not an admin
 */



/**
 * @swagger
 * /logs:
 *   get:
 *     summary: Get system logs (Admin only)
 *     tags: [Admin]
 *     description: Retrieves the most recent system logs and errors
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Most recent logs retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 logs:
 *                   type: array
 *                   items:
 *                     type: string
 *                 errors:
 *                   type: array
 *                   items:
 *                     type: string
 *       401:
 *         description: Unauthorized - Not logged in
 *       403:
 *         description: Forbidden - Not an admin
 *       500:
 *         description: Unable to read logs
 */





// Public routes
router.post('/register', async (req, res) => {
  try {
    const result = await register(req, res);
    return result;
  } catch (error) {
    logger.error('Registration error', { error: error.message, body: req.body });
    res.status(500).json({ 
      success: false, 
      message: 'Registration failed', 
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error' 
    });
  }
});

router.post('/login', async (req, res) => {
  try {
    const result = await login(req, res);
    return result;
  } catch (error) {
    logger.error('Login error', { error: error.message, body: req.body });
    res.status(500).json({ 
      success: false, 
      message: 'Login failed', 
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error' 
    });
  }
});

// Protected routes
router.get('/profile', authenticate, async (req, res) => {
  try {
    const result = await getProfile(req, res);
    return result;
  } catch (error) {
    logger.error('Profile fetch error', { error: error.message, userId: req.user.id });
    res.status(500).json({ 
      success: false, 
      message: 'Could not fetch profile', 
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error' 
    });
  }
});

router.put('/profile', authenticate, async (req, res) => {
  try {
    const result = await updateProfile(req, res);
    return result;
  } catch (error) {
    logger.error('Profile update error', { error: error.message, userId: req.user.id, body: req.body });
    res.status(500).json({ 
      success: false, 
      message: 'Could not update profile', 
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error' 
    });
  }
});

// Admin routes
router.get('/all', authenticate, authorize('Admin'), async (req, res) => {
  try {
    // Implement user retrieval logic
    const users = await User.find({}).select('-password');
    res.json({ success: true, users });
  } catch (error) {
    logger.error('Fetch all users error', { error: error.message });
    res.status(500).json({ 
      success: false, 
      message: 'Could not retrieve users', 
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error' 
    });
  }
});

router.get('/logs', authenticate, authorize('Admin'), async (req, res) => {
  try {
    const logsPath = path.join(__dirname, '..', 'logs', 'combined.log');
    const errorsPath = path.join(__dirname, '..', 'logs', 'error.log');

    // Use async file reading
    const [logs, errors] = await Promise.all([
      readLogFile(logsPath),
      readLogFile(errorsPath)
    ]);

    res.json({ 
      success: true, 
      logs: logs.slice(-100), 
      errors: errors.slice(-100) 
    });
  } catch (err) {
    logger.error('Log retrieval error', { error: err.message });
    res.status(500).json({ 
      success: false, 
      message: 'Unable to read logs', 
      error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error' 
    });
  }
});

// Helper function for reading log files safely
async function readLogFile(filePath) {
  try {
    const fileContent = await fs.readFile(filePath, 'utf8');
    return fileContent ? fileContent.split('\n').filter(line => line.trim() !== '') : [];
  } catch (err) {
    logger.warn(`Could not read log file: ${filePath}`, { error: err.message });
    return [];
  }
}

module.exports = router;