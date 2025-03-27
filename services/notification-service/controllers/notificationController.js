const Notification = require('../models/Notification');
const UserPreference = require('../models/UserPreference');
const logger = require('../utils/logger');
const { sendEmail } = require('../utils/emailService');
const { sendSMS } = require('../utils/smsService');

// Get user notifications
exports.getUserNotifications = async (req, res, next) => {
  try {
    const { type, status } = req.query;
    
    // Build query
    const query = { userId: req.user.id };
    
    if (type) query.type = type;
    if (status) query.status = status;
    
    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(req.query.limit) || 50);
    
    res.json({
      success: true,
      count: notifications.length,
      data: notifications
    });
  } catch (error) {
    next(error);
  }
};

// Get user notification preferences
exports.getUserPreferences = async (req, res, next) => {
  try {
    let preferences = await UserPreference.findOne({ userId: req.user.id });
    
    // Create default preferences if none exist
    if (!preferences) {
      preferences = new UserPreference({ userId: req.user.id });
      await preferences.save();
    }
    
    res.json({
      success: true,
      data: preferences
    });
  } catch (error) {
    next(error);
  }
};

// Update user notification preferences
exports.updateUserPreferences = async (req, res, next) => {
  try {
    const { language, receiveEmails, receiveSMS, emailAddress, phoneNumber } = req.body;
    
    // Find existing preferences or create new
    let preferences = await UserPreference.findOne({ userId: req.user.id });
    
    if (!preferences) {
      preferences = new UserPreference({ userId: req.user.id });
    }
    
    // Update fields if provided
    if (language !== undefined) preferences.language = language;
    if (receiveEmails !== undefined) preferences.receiveEmails = receiveEmails;
    if (receiveSMS !== undefined) preferences.receiveSMS = receiveSMS;
    if (emailAddress !== undefined) preferences.emailAddress = emailAddress;
    if (phoneNumber !== undefined) preferences.phoneNumber = phoneNumber;
    
    await preferences.save();
    
    res.json({
      success: true,
      message: 'Notification preferences updated',
      data: preferences
    });
  } catch (error) {
    next(error);
  }
};

// Send a manual notification (for admin/support purposes)
exports.sendManualNotification = async (req, res, next) => {
  try {
    const { userId, type, subject, content } = req.body;
    
    // Validate request
    if (!userId || !type || !subject || !content) {
      return res.status(400).json({
        success: false,
        message: 'Please provide userId, type, subject, and content'
      });
    }
    
    if (!['email', 'sms'].includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Type must be either "email" or "sms"'
      });
    }
    
    // Get user preferences
    const preferences = await UserPreference.findOne({ userId });
    
    if (!preferences) {
      return res.status(404).json({
        success: false,
        message: 'User preferences not found'
      });
    }
    
    // Create notification record
    const notification = new Notification({
      userId,
      type,
      subject,
      content,
      metadata: { manualSender: req.user.id }
    });
    
    await notification.save();
    
    // Send notification based on type
    let sendResult;
    
    if (type === 'email' && preferences.emailAddress) {
      sendResult = await sendEmail(preferences.emailAddress, subject, content);
    } else if (type === 'sms' && preferences.phoneNumber) {
      sendResult = await sendSMS(preferences.phoneNumber, content);
    } else {
      return res.status(400).json({
        success: false,
        message: `User has no ${type === 'email' ? 'email address' : 'phone number'} set`
      });
    }
    
    // Update notification status
    if (sendResult.success) {
      notification.status = 'sent';
      notification.sentAt = new Date();
    } else {
      notification.status = 'failed';
    }
    
    await notification.save();
    
    res.json({
      success: sendResult.success,
      message: sendResult.success ? 'Notification sent successfully' : 'Failed to send notification',
      data: notification
    });
  } catch (error) {
    next(error);
  }
};

// Retry failed notification
exports.retryNotification = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Find the notification
    const notification = await Notification.findById(id);
    
    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }
    
    // Only retry failed notifications
    if (notification.status !== 'failed') {
      return res.status(400).json({
        success: false,
        message: 'Only failed notifications can be retried'
      });
    }
    
    // Get user preferences
    // controllers/notificationController.js (continuation of retryNotification method)
    // Get user preferences
    const preferences = await UserPreference.findOne({ userId: notification.userId });
    
    if (!preferences) {
      return res.status(404).json({
        success: false,
        message: 'User preferences not found'
      });
    }
    
    // Retry sending the notification based on type
    let sendResult;
    
    if (notification.type === 'email' && preferences.emailAddress) {
      sendResult = await sendEmail(preferences.emailAddress, notification.subject, notification.content);
    } else if (notification.type === 'sms' && preferences.phoneNumber) {
      sendResult = await sendSMS(preferences.phoneNumber, notification.content);
    } else {
      return res.status(400).json({
        success: false,
        message: `User has no ${notification.type === 'email' ? 'email address' : 'phone number'} set`
      });
    }
    
    // Update notification status
    if (sendResult.success) {
      notification.status = 'sent';
      notification.sentAt = new Date();
    }
    
    await notification.save();
    
    res.json({
      success: sendResult.success,
      message: sendResult.success ? 'Notification resent successfully' : 'Failed to resend notification',
      data: notification
    });
  } catch (error) {
    next(error);
  }
};