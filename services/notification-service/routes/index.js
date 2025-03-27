// routes/index.js - API routes for notification service
const express = require('express');
const notificationController = require('../controllers/notificationController');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();


/**
 * @swagger
 * /api/notifications/me:
 *   get:
 *     summary: Get notifications for the logged-in user
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *         description: Filter by notification type (email or sms)
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: Filter by status (pending, sent, failed)
 *     responses:
 *       200:
 *         description: List of notifications
 */

/**
 * @swagger
 * /api/notifications/preferences:
 *   get:
 *     summary: Get user's notification preferences
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User preferences returned
 */



/**
 * @swagger
 * /api/notifications/preferences:
 *   put:
 *     summary: Update user's notification preferences
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               language:
 *                 type: string
 *                 enum: [en, fr]
 *               receiveEmails:
 *                 type: boolean
 *               receiveSMS:
 *                 type: boolean
 *               emailAddress:
 *                 type: string
 *               phoneNumber:
 *                 type: string
 *     responses:
 *       200:
 *         description: Preferences updated
 */




/**
 * @swagger
 * /api/notifications/send:
 *   post:
 *     summary: Send a manual notification to a user (admin only)
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [userId, type, subject, content]
 *             properties:
 *               userId:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [email, sms]
 *               subject:
 *                 type: string
 *               content:
 *                 type: string
 *     responses:
 *       200:
 *         description: Notification sent or failed
 */




/**
 * @swagger
 * /api/notifications/{id}/retry:
 *   post:
 *     summary: Retry sending a failed notification (admin only)
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Notification ID
 *     responses:
 *       200:
 *         description: Retry result
 */




// Get authenticated user's notifications
router.get(
  '/me', 
  authenticate, 
  notificationController.getUserNotifications
);

// Get authenticated user's notification preferences
router.get(
  '/preferences', 
  authenticate, 
  notificationController.getUserPreferences
);

// Update authenticated user's notification preferences
router.put(
  '/preferences', 
  authenticate, 
  notificationController.updateUserPreferences
);

// Admin routes - require Admin or EventCreator or Operator role
router.post(
  '/send', 
  authenticate, 
  authorize('Admin', 'EventCreator', 'Operator'), 
  notificationController.sendManualNotification
);

router.post(
  '/:id/retry', 
  authenticate, 
  authorize('Admin', 'EventCreator', 'Operator'), 
  notificationController.retryNotification
);

module.exports = router;