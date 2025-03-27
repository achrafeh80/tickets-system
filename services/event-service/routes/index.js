
const express = require('express');
const {
  createEvent,
  getEvents,
  getEvent,
  updateEvent,
  deleteEvent
} = require('../controllers/eventController');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Events
 *   description: Event management
 */

/**
 * @swagger
 * /api/events:
 *   get:
 *     summary: Get all events
 *     tags: [Events]
 *     responses:
 *       200:
 *         description: List of events
 */
router.get('/', getEvents);

/**
 * @swagger
 * /api/events/{id}:
 *   get:
 *     summary: Get single event by ID
 *     tags: [Events]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Event ID
 *     responses:
 *       200:
 *         description: Event found
 *       404:
 *         description: Event not found
 */
router.get('/:id', getEvent);

/**
 * @swagger
 * /api/events:
 *   post:
 *     summary: Create a new event
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: 
 *               - name
 *               - description
 *               - venue
 *               - date
 *               - startTime
 *               - endTime
 *               - capacity
 *               - price
 *               - category
 *             properties:
 *               name:
 *                 type: string
 *                 description: Name of the event
 *               description:
 *                 type: string
 *                 description: Detailed description of the event
 *               venue:
 *                 type: string
 *                 description: Location where the event will take place
 *               date:
 *                 type: string
 *                 format: date
 *                 description: Date of the event
 *               startTime:
 *                 type: string
 *                 description: Start time of the event
 *               endTime:
 *                 type: string
 *                 description: End time of the event
 *               capacity:
 *                 type: integer
 *                 minimum: 1
 *                 description: Total number of available seats/tickets
 *               price:
 *                 type: number
 *                 minimum: 0
 *                 description: Ticket price
 *               currency:
 *                 type: string
 *                 enum: ['EUR', 'USD', 'GBP']
 *                 default: EUR
 *                 description: Currency of the ticket price
 *               category:
 *                 type: string
 *                 enum: ['Concert', 'Festival', 'Conference', 'Sport', 'Theater', 'Other']
 *                 description: Category of the event
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                   description: URLs of event images
 *                 description: Optional array of image URLs related to the event
 *     responses:
 *       201:
 *         description: Event created
 */
router.post('/', authenticate, authorize('Admin', 'EventCreator'), createEvent);

/**
 * @swagger
 * /api/events/{id}:
 *   put:
 *     summary: Update an event
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Event ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Event updated
 */
router.put('/:id', authenticate, authorize('Admin', 'EventCreator'), updateEvent);

/**
 * @swagger
 * /api/events/{id}:
 *   delete:
 *     summary: Delete an event
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Event ID
 *     responses:
 *       200:
 *         description: Event deleted
 */
router.delete('/:id', authenticate, authorize('Admin', 'EventCreator'), deleteEvent);

module.exports = router;
