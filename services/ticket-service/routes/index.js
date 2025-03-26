
const express = require('express');
const {
  reserveTickets,
  purchaseTickets,
  cancelTickets,
  getUserTickets,
  verifyTicket,
  checkInTicket
} = require('../controllers/ticketController');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Tickets
 *   description: Ticket management
 */

/**
 * @swagger
 * /reserve:
 *   post:
 *     summary: Reserve tickets for an event
 *     tags: [Tickets]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               eventId:
 *                 type: string
 *               quantity:
 *                 type: number
 *     responses:
 *       200:
 *         description: Tickets reserved successfully
 */
router.post('/reserve', authenticate, reserveTickets);

/**
 * @swagger
 * /purchase:
 *   post:
 *     summary: Purchase reserved tickets
 *     tags: [Tickets]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reservationId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Tickets purchased successfully
 */
router.post('/purchase', authenticate, purchaseTickets);

/**
 * @swagger
 * /cancel/{id}:
 *   delete:
 *     summary: Cancel a ticket
 *     tags: [Tickets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Ticket cancelled successfully
 */
router.delete('/cancel/:id', authenticate, cancelTickets);

/**
 * @swagger
 * /my:
 *   get:
 *     summary: Get current user's tickets
 *     tags: [Tickets]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of user tickets
 */
router.get('/my', authenticate, getUserTickets);



/**
 * @swagger
 * /verify/{ticketNumber}:
 *   get:
 *     summary: Verify a ticket by its number
 *     tags: [Tickets]
 *     parameters:
 *       - in: path
 *         name: ticketNumber
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Ticket verified
 */
router.get('/verify/:ticketNumber', verifyTicket);

/**
 * @swagger
 * /check-in/{ticketNumber}:
 *   post:
 *     summary: Check in a ticket
 *     tags: [Tickets]
 *     parameters:
 *       - in: path
 *         name: ticketNumber
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Ticket checked in
 */
router.post('/check-in/:ticketNumber', checkInTicket);

module.exports = router;
