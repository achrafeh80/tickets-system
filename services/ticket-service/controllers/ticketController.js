const Ticket = require('../models/Ticket');
const logger = require('../utils/logger');
const Joi = require('joi');
const { sendNotification } = require('../utils/messageQueue');
const { processPayment, refundPayment } = require('../utils/paymentService');
const { getEvent, updateEventSeats } = require('../utils/eventService.mock'); 
const mongoose = require('mongoose');
// const { getEvent, updateEventSeats } = require('../utils/eventService');

// Validation schema for reserving tickets
const reserveSchema = Joi.object({
  eventId: Joi.string().required().custom((value, helpers) => {
    if (!mongoose.Types.ObjectId.isValid(value)) {
      return helpers.error('any.invalid');
    }
    return value;
  }, 'Event ID Validation'),
  quantity: Joi.number().integer().min(1).max(10).required()
});

// Validation schema for purchasing tickets
const purchaseSchema = Joi.object({
  ticketIds: Joi.array().items(
    Joi.string().custom((value, helpers) => {
      if (!mongoose.Types.ObjectId.isValid(value)) {
        return helpers.error('any.invalid');
      }
      return value;
    }, 'Ticket ID Validation')
  ).min(1).required(),
  paymentToken: Joi.string().required()
});


// Centralized error handler
const handleControllerError = (res, error, action) => {
  logger.error(`${action} error:`, error);
  const statusCode = error.status || 500;
  res.status(statusCode).json({
    success: false,
    message: error.message || 'An unexpected error occurred',
    ...(process.env.NODE_ENV === 'development' && { error: error.toString() })
  });
};

// Reserve tickets with enhanced validation
exports.reserveTickets = async (req, res, next) => {

  
  try {
    
    const { eventId, quantity } = req.body;
    
    // Récupération de l'événement
    const eventResponse = await getEvent(eventId);
    if (!eventResponse.success) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    const event = eventResponse.event;

    // Log complet pour diagnostic
    console.log('Event Seat Properties:', {
      seats: event.seats,
      availableSeats: event.availableSeats,
      totalSeats: event.totalSeats
    });

    // Vérification flexible des sièges
    const availableSeats = 
      event.availableSeats ?? 
      event.seats ?? 
      event.totalSeats ?? 
      0;

    if (availableSeats < quantity) {
      return res.status(400).json({
        success: false,
        message: `Insufficient seats. Only ${availableSeats} available.`
      });
    }

    // Mise à jour des sièges avec fallback
    const updateResponse = await updateEventSeats(
      eventId, 
      -quantity, 
      req.header('Authorization')?.replace('Bearer ', '')
    );


    

    
    if (!updateResponse.success) {
      return res.status(400).json({
        success: false,
        message: 'Seat update failed',
        details: updateResponse.error
      });
    }
    
    const ticket = new Ticket({
      eventId,
      userId: req.user?.id || '65cba01c5fc13c06d89e4180',
      price: event.price,
      currency: event.currency,
      status: 'reserved',
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      ticketNumber: Math.random().toString(36).substring(2, 10).toUpperCase() // Génération simple
    });

    // Ticket reservation with error handling
    const tickets = [];
    try {
      for (let i = 0; i < quantity; i++) {
        const ticket = new Ticket({
          eventId,
          userId: req.user.id || '65cba01c5fc13c06d89e4180',
          price: event.price,
          currency: event.currency,
          status: 'reserved',
          expiresAt: new Date(Date.now() + 15 * 60 * 1000),
          ticketNumber: Math.random().toString(36).substring(2, 10).toUpperCase()
        });
        
        await ticket.save();
        tickets.push(ticket);
      }
    } catch (ticketError) {
      // Rollback seat update if ticket creation fails
      await updateEventSeats(
        eventId, 
        quantity, 
        req.header('Authorization')?.replace('Bearer ', '')
      );
      
      return res.status(500).json({
        success: false,
        message: 'Failed to create tickets',
        details: ticketError.message
      });
    }
    
    // Notification with comprehensive details
    sendNotification('ticket_reserved', {
      userId: req.user.id,
      eventId,
      eventName: event.name,
      quantity,
      tickets: tickets.map(t => ({
        id: t._id,
        price: t.price,
        expiresAt: t.expiresAt
      }))
    });
    
    logger.info(`${quantity} tickets reserved for event ${eventId} by user ${req.user.id}`);
    
    res.status(201).json({
      success: true,
      message: `${quantity} tickets reserved successfully`,
      data: {
        tickets: tickets.map(t => ({
          id: t._id,
          price: t.price,
          expiresAt: t.expiresAt
        })),
        event: {
          id: event._id,
          name: event.name
        }
      }
    });
  } catch (error) {
    handleControllerError(res, error, 'Ticket reservation');
    next(error);
  }
};

// Purchase tickets with enhanced validation and error handling
exports.purchaseTickets = async (req, res, next) => {
  try {
    const { error, value } = purchaseSchema.validate(req.body, { 
      abortEarly: false,
      allowUnknown: false 
    });

    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Invalid purchase request',
        details: error.details.map(err => err.message)
      });
    }
    
    const { ticketIds, paymentToken } = value;
    
    // Advanced ticket validation
    const tickets = await Ticket.find({
      _id: { $in: ticketIds },
      userId: req.user.id,
      status: 'reserved'
    });
    
    // Validation checks
    if (tickets.length !== ticketIds.length) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired tickets',
        details: {
          requested: ticketIds.length,
          found: tickets.length
        }
      });
    }
    
    // Check if tickets are expired
    const now = new Date();
    const expiredTickets = tickets.filter(ticket => ticket.expiresAt < now);
    
    if (expiredTickets.length > 0) {
      // Release expired tickets back to available
      for (const ticket of expiredTickets) {
        await updateEventSeats(ticket.eventId, 1, req.header('Authorization')?.replace('Bearer ', ''));
        await Ticket.findByIdAndUpdate(ticket._id, { status: 'cancelled' });
      }
      
      return res.status(400).json({
        success: false,
        message: 'One or more tickets have expired. Please reserve again.'
      });
    }
    
    // Calculate total amount
    const totalAmount = tickets.reduce((sum, ticket) => sum + ticket.price, 0);
    const currency = tickets[0].currency; // Assuming all tickets have same currency
    
    // Get event details for the first ticket (all should be for the same event)
    const eventResponse = await getEvent(tickets[0].eventId);
    if (!eventResponse.success) {
      return res.status(400).json({
        success: false,
        message: 'Could not verify event details'
      });
    }
    
    const event = eventResponse.event;
    
    // Process payment
    const paymentResult = await processPayment(
      totalAmount,
      currency,
      paymentToken,
      `Tickets for ${event.name}`
    );
    
    if (!paymentResult.success) {
      return res.status(400).json({
        success: false,
        message: `Payment failed: ${paymentResult.error}`
      });
    }
    
    // Update tickets to purchased status
    const updatedTickets = [];
    for (const ticket of tickets) {
      const updatedTicket = await Ticket.findByIdAndUpdate(
        ticket._id,
        {
          status: 'purchased',
          paymentId: paymentResult.paymentId,
          expiresAt: null
        },
        { new: true }
      );
      
      updatedTickets.push(updatedTicket);
    }
    
    // Send confirmation notification
    sendNotification('ticket_purchased', {
      userId: req.user.id,
      eventId: event._id,
      eventName: event.name,
      tickets: updatedTickets,
      totalAmount,
      currency
    });
    
    logger.info(`${tickets.length} tickets purchased for event ${event.name} by user ${req.user.id}`);
    
    res.json({
      success: true,
      message: 'Tickets purchased successfully',
      data: {
        tickets: updatedTickets,
        paymentId: paymentResult.paymentId,
        totalAmount,
        currency
      }
    });
  } catch (error) {
    handleControllerError(res, error, 'Ticket purchase');
    next(error);
  }
};

// Cancel tickets (before the event)
exports.cancelTickets = async (req, res, next) => {
  try {
    const { ticketIds } = req.body;

    if (!ticketIds || !Array.isArray(ticketIds) || ticketIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide valid ticket IDs'
      });
    }

    const tickets = await getValidTickets(ticketIds, req.user.id);
    if (!tickets) {
      return res.status(400).json({
        success: false,
        message: 'One or more tickets not found or already cancelled'
      });
    }

    const isEligible = await checkCancellationEligibility(tickets);
    if (!isEligible) {
      return res.status(400).json({
        success: false,
        message: 'Cannot cancel tickets for past events'
      });
    }

    const purchasedTickets = tickets.filter(t => t.status === 'purchased');
    await processRefunds(purchasedTickets);

    const cancelledTickets = await cancelAndReleaseTickets(tickets, req.header('Authorization')?.replace('Bearer ', ''));

    sendNotification('ticket_cancelled', {
      userId: req.user.id,
      tickets: cancelledTickets
    });

    logger.info(`${tickets.length} tickets cancelled by user ${req.user.id}`);

    res.json({
      success: true,
      message: 'Tickets cancelled successfully',
      data: {
        tickets: cancelledTickets,
        refunded: purchasedTickets.length
      }
    });
  } catch (error) {
    logger.error('Ticket cancellation error:', error);
    next(error);
  }
};

async function getValidTickets(ticketIds, userId) {
  const tickets = await Ticket.find({
    _id: { $in: ticketIds },
    userId,
    isActive: true
  });

  return tickets.length === ticketIds.length ? tickets : null;
}

async function checkCancellationEligibility(tickets) {
  for (const ticket of tickets) {
    const eventResponse = await getEvent(ticket.eventId);
    if (!eventResponse.success) continue;

    const event = eventResponse.event;
    if (new Date(event.date) < new Date()) {
      return false;
    }
  }
  return true;
}

async function processRefunds(purchasedTickets) {
  const ticketsByPayment = purchasedTickets.reduce((acc, ticket) => {
    acc[ticket.paymentId] = acc[ticket.paymentId] || [];
    acc[ticket.paymentId].push(ticket);
    return acc;
  }, {});

  for (const paymentId in ticketsByPayment) {
    const paymentTickets = ticketsByPayment[paymentId];
    const refundAmount = paymentTickets.reduce((sum, ticket) => sum + ticket.price, 0);

    const refundResult = await refundPayment(paymentId, refundAmount);
    if (!refundResult.success) {
      logger.error(`Refund failed for payment ${paymentId}:`, refundResult.error);
    }
  }
}

async function cancelAndReleaseTickets(tickets, authHeader) {
  const cancelledTickets = [];
  for (const ticket of tickets) {
    await updateEventSeats(ticket.eventId, 1, authHeader);

    const cancelledTicket = await Ticket.findByIdAndUpdate(
      ticket._id,
      {
        status: 'cancelled',
        isActive: false
      },
      { new: true }
    );

    cancelledTickets.push(cancelledTicket);
  }
  return cancelledTickets;
}

// Get user tickets
exports.getUserTickets = async (req, res, next) => {
  try {
    const { status, eventId } = req.query;
    
    // Build query
    const query = { userId: req.user.id };
    
    if (status) query.status = status;
    if (eventId) query.eventId = eventId;
    
    const tickets = await Ticket.find(query).sort({ purchaseDate: -1 });
    
    res.json({
      success: true,
      count: tickets.length,
      data: tickets
    });
  } catch (error) {
    logger.error('Get user tickets error:', error);
    next(error);
  }
};

// Verify ticket (for check-in)
exports.verifyTicket = async (req, res, next) => {
  try {
    const { ticketNumber } = req.params;
    
    const ticket = await Ticket.findOne({ ticketNumber });
    
    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found'
      });
    }
    
    // Check if ticket is valid (purchased and not used)
    if (ticket.status !== 'purchased' || ticket.checkedIn) {
      return res.status(400).json({
        success: false,
        message: ticket.checkedIn ? 'Ticket already used' : 'Ticket is not valid for check-in'
      });
    }
    
    // Get event details to check date
    const eventResponse = await getEvent(ticket.eventId);
    if (!eventResponse.success) {
      return res.status(400).json({
        success: false,
        message: 'Could not verify event details'
      });
    }
    
    const event = eventResponse.event;
    
    // Check if user is authorized to verify tickets for this event
    if (req.user.role !== 'Admin' && event.creator.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to check-in tickets for this event'
      });
    }
    
    res.json({
      success: true,
      data: {
        ticket,
        event: {
          name: event.name,
          date: event.date,
          venue: event.venue
        }
      }
    });
  } catch (error) {
    logger.error('Verify ticket error:', error);
    next(error);
  }
};

// Check-in ticket
exports.checkInTicket = async (req, res, next) => {
  try {
    const { ticketNumber } = req.params;
    
    const ticket = await Ticket.findOne({ ticketNumber });
    
    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found'
      });
    }
    
    // Check if ticket is valid (purchased and not used)
    if (ticket.status !== 'purchased') {
      return res.status(400).json({
        success: false,
        message: 'Ticket is not valid for check-in'
      });
    }
    
    if (ticket.checkedIn) {
      return res.status(400).json({
        success: false,
        message: 'Ticket already used'
      });
    }
    
    // Get event details to check date
    const eventResponse = await getEvent(ticket.eventId);
    if (!eventResponse.success) {
      return res.status(400).json({
        success: false,
        message: 'Could not verify event details'
      });
    }
    
    const event = eventResponse.event;
    
    // Check if user is authorized to check-in tickets for this event
    if (req.user.role !== 'Admin' && req.user.role !== 'Operator' && event.creator.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to check-in tickets for this event'
      });
    }
    
    // Update ticket as checked in
    const updatedTicket = await Ticket.findByIdAndUpdate(
      ticket._id,
      {
        checkedIn: true,
        checkedInAt: new Date(),
        status: 'used'
      },
      { new: true }
    );
    
    logger.info(`Ticket ${ticketNumber} checked in by ${req.user.id}`);
    
    res.json({
      success: true,
      message: 'Ticket successfully checked in',
      data: updatedTicket
    });
  } catch (error) {
    logger.error('Check-in ticket error:', error);
    next(error);
  }
};



function validateEventSeats(event) {
  return event && typeof event.availableSeats === 'number' && event.availableSeats >= 0;
}

module.exports = exports;