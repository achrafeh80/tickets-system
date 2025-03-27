const request = require('supertest');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const app = require('../app');
const Event = require('../models/Event');

// Mock user data for testing
const testUser = {
  id: new mongoose.Types.ObjectId(),
  role: 'EventCreator'
};

// Create test token
const token = jwt.sign(
  { id: testUser.id, role: testUser.role },
  process.env.JWT_SECRET,
  { expiresIn: '1h' }
);

beforeAll(async () => {
  // Connect to test database
  await mongoose.connect(process.env.MONGO_URI_TEST);
});

afterAll(async () => {
  // Clean up database and close connection
  await Event.deleteMany({});
  await mongoose.connection.close();
});

describe('Event API', () => {
  let eventId;

  it('should create a new event', async () => {
    const res = await request(app)
      .post('/api/events')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Test Event',
        description: 'Test Description',
        venue: 'Test Venue',
        date: '2023-12-31',
        startTime: '19:00',
        endTime: '23:00',
        capacity: 100,
        price: 25.50,
        currency: 'EUR',
        category: 'Concert'
      });
    
    expect(res.statusCode).toEqual(201);
    expect(res.body.success).toEqual(true);
    expect(res.body.data).toHaveProperty('_id');
    expect(res.body.data.name).toEqual('Test Event');
    
    // Save event ID for next tests
    eventId = res.body.data._id;
  });
  
  it('should get all events', async () => {
    const res = await request(app).get('/api/events');
    
    expect(res.statusCode).toEqual(200);
    expect(res.body.success).toEqual(true);
    expect(Array.isArray(res.body.data)).toBeTruthy();
    expect(res.body.data.length).toBeGreaterThan(0);
  });
  
  it('should get a single event', async () => {
    const res = await request(app).get(`/api/events/${eventId}`);
    
    expect(res.statusCode).toEqual(200);
    expect(res.body.success).toEqual(true);
    expect(res.body.data).toHaveProperty('_id', eventId);
    expect(res.body.data.name).toEqual('Test Event');
  });
  
  it('should update an event', async () => {
    const res = await request(app)
      .put(`/api/events/${eventId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Updated Event Name',
        price: 30.00
      });
    
    expect(res.statusCode).toEqual(200);
    expect(res.body.success).toEqual(true);
    expect(res.body.data.name).toEqual('Updated Event Name');
    expect(res.body.data.price).toEqual(30.00);
  });
  
  it('should delete an event', async () => {
    const res = await request(app)
      .delete(`/api/events/${eventId}`)
      .set('Authorization', `Bearer ${token}`);
    
    expect(res.statusCode).toEqual(200);
    expect(res.body.success).toEqual(true);
    
    // Verify event was deleted
    const check = await request(app).get(`/api/events/${eventId}`);
    expect(check.statusCode).toEqual(404);
  });
});