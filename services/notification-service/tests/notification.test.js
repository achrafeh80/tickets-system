// tests/notification.test.js - Tests for notification service
const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../app');
const Notification = require('../models/Notification');
const UserPreference = require('../models/UserPreference');
const jwt = require('jsonwebtoken');

// Mock user service
jest.mock('../utils/userService', () => ({
  getUser: jest.fn().mockImplementation((userId) => {
    return Promise.resolve({
      success: true,
      data: {
        _id: userId,
        firstName: 'Test',
        lastName: 'User',
        email: 'test@example.com',
        phone: '+1234567890',
        role: 'User'
      }
    });
  })
}));

// Mock email service
jest.mock('../utils/emailService', () => ({
  sendEmail: jest.fn().mockImplementation(() => {
    return Promise.resolve({
      success: true,
      messageId: 'mock-message-id'
    });
  })
}));

// Mock SMS service
jest.mock('../utils/smsService', () => ({
  sendSMS: jest.fn().mockImplementation(() => {
    return Promise.resolve({
      success: true,
      messageId: 'mock-message-id'
    });
  })
}));

describe('Notification Service', () => {
  let authToken;
  let adminToken;
  let testUserId;
  let testNotificationId;

  beforeAll(async () => {
    // Connect to test database
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/notification-service-test');
    
    // Create test user ID
    testUserId = new mongoose.Types.ObjectId();
    
    // Create authentication tokens
    authToken = jwt.sign(
      { id: testUserId, role: 'User' },
      process.env.JWT_SECRET || 'test_jwt_secret'
    );
    
    adminToken = jwt.sign(
      { id: new mongoose.Types.ObjectId(), role: 'Admin' },
      process.env.JWT_SECRET || 'test_jwt_secret'
    );
  });

  afterAll(async () => {
    // Clean up and disconnect from test database
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    // Clear collections before each test
    await Notification.deleteMany({});
    await UserPreference.deleteMany({});
    
    // Create test notification
    const notification = new Notification({
      userId: testUserId,
      type: 'email',
      subject: 'Test Notification',
      content: 'This is a test notification',
      status: 'failed'
    });
    
    await notification.save();
    testNotificationId = notification._id;
    
    // Create test user preferences
    const preferences = new UserPreference({
      userId: testUserId,
      language: 'en',
      receiveEmails: true,
      receiveSMS: true,
      emailAddress: 'test@example.com',
      phoneNumber: '+1234567890'
    });
    
    await preferences.save();
  });

  describe('GET /api/notifications/me', () => {
    test('should get user notifications', async () => {
      const response = await request(app)
        .get('/api/notifications/me')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(response.statusCode).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBe(1);
      expect(response.body.data[0].subject).toBe('Test Notification');
    });
    
    test('should require authentication', async () => {
      const response = await request(app)
        .get('/api/notifications/me');
      
      expect(response.statusCode).toBe(401);
    });
  });

  describe('GET /api/notifications/preferences', () => {
    test('should get user preferences', async () => {
      const response = await request(app)
        .get('/api/notifications/preferences')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(response.statusCode).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.language).toBe('en');
      expect(response.body.data.receiveEmails).toBe(true);
    });
  });

  describe('PUT /api/notifications/preferences', () => {
    test('should update user preferences', async () => {
      const response = await request(app)
        .put('/api/notifications/preferences')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          language: 'fr',
          receiveEmails: false
        });
      
      expect(response.statusCode).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.language).toBe('fr');
      expect(response.body.data.receiveEmails).toBe(false);
      expect(response.body.data.receiveSMS).toBe(true); // Unchanged
    });
  });

  describe('POST /api/notifications/send', () => {
    test('should send manual notification as admin', async () => {
      const response = await request(app)
        .post('/api/notifications/send')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          userId: testUserId.toString(),
          type: 'email',
          subject: 'Manual Test',
          content: 'This is a manual test notification'
        });
      
      expect(response.statusCode).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('sent');
    });
    
    test('should reject unauthorized users', async () => {
      const response = await request(app)
        .post('/api/notifications/send')
        .set('Authorization', `Bearer ${authToken}`) // Regular user token
        .send({
          userId: testUserId.toString(),
          type: 'email',
          subject: 'Manual Test',
          content: 'This is a manual test notification'
        });
      
      expect(response.statusCode).toBe(403);
    });
  });

  describe('POST /api/notifications/:id/retry', () => {
    test('should retry failed notification', async () => {
      const response = await request(app)
        .post(`/api/notifications/${testNotificationId}/retry`)
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(response.statusCode).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('sent');
    });
  });
});