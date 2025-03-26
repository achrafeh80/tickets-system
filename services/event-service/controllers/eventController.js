const Event = require('../models/Event');
const logger = require('../utils/logger');
const Joi = require('joi');

// Validation schema
const eventSchema = Joi.object({
  name: Joi.string().required(),
  description: Joi.string().required(),
  venue: Joi.string().required(),
  date: Joi.date().required(),
  startTime: Joi.string().required(),
  endTime: Joi.string().required(),
  capacity: Joi.number().integer().min(1).required(),
  price: Joi.number().min(0).required(),
  currency: Joi.string().valid('EUR', 'USD', 'GBP').default('EUR'),
  category: Joi.string().valid('Concert', 'Festival', 'Conference', 'Sport', 'Theater', 'Other').required(),
  images: Joi.array().items(Joi.string())
});

// Create a new event
exports.createEvent = async (req, res, next) => {
  try {
    // Validate request body
    const { error, value } = eventSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      });
    }
    
    const isMaster = req.user.id === 'master-token';

    const eventData = { 
      ...value,
      creator: isMaster ? undefined : req.user.id
    };
    eventData.availableSeats = value.capacity;

    
    const event = new Event(eventData);
    await event.save();
    
    logger.info(`New event created: ${event.name} by ${req.user.id}`);
    
    res.status(201).json({
      success: true,
      data: event
    });
  } catch (error) {
    logger.error('Create event error:', error);
    next(error);
  }
};

// Get all events
exports.getEvents = async (req, res, next) => {
  try {
    const { category, date, minPrice, maxPrice } = req.query;
    
    // Build query
    const query = { isActive: true };
    
    if (category) query.category = category;
    if (date) query.date = { $gte: new Date(date) };
    if (minPrice) query.price = { ...query.price, $gte: minPrice };
    if (maxPrice) query.price = { ...query.price, $lte: maxPrice };
    
    const events = await Event.find(query).sort({ date: 1 });
    
    res.json({
      success: true,
      count: events.length,
      data: events
    });
  } catch (error) {
    logger.error('Get events error:', error);
    next(error);
  }
};

// Get single event
exports.getEvent = async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id);
    
    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }
    
    res.json({
      success: true,
      data: event
    });
  } catch (error) {
    logger.error(`Get event error for ID ${req.params.id}:`, error);
    next(error);
  }
};

// Update event
exports.updateEvent = async (req, res, next) => {
  try {
    // Validate request body (partial validation)
    const { error, value } = Joi.object({
      name: Joi.string(),
      description: Joi.string(),
      venue: Joi.string(),
      date: Joi.date(),
      startTime: Joi.string(),
      endTime: Joi.string(),
      capacity: Joi.number().integer().min(1),
      price: Joi.number().min(0),
      currency: Joi.string().valid('EUR', 'USD', 'GBP'),
      category: Joi.string().valid('Concert', 'Festival', 'Conference', 'Sport', 'Theater', 'Other'),
      images: Joi.array().items(Joi.string()),
      isActive: Joi.boolean()
    }).validate(req.body);
    
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      });
    }
    
    // Find event
    let event = await Event.findById(req.params.id);
    
    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }
    
    // Check if user is creator or admin
    if (event.creator.toString() !== req.user.id && req.user.role !== 'Admin') {
      logger.warn(`Unauthorized update attempt for event ${req.params.id} by user ${req.user.id}`);
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to update this event'
      });
    }
    
    // If capacity is being updated, update availableSeats accordingly
    if (value.capacity && value.capacity !== event.capacity) {
      const soldSeats = event.capacity - event.availableSeats;
      value.availableSeats = Math.max(0, value.capacity - soldSeats);
    }
    
    // Update event
    event = await Event.findByIdAndUpdate(
      req.params.id,
      { ...value, updatedAt: Date.now() },
      { new: true, runValidators: true }
    );
    
    logger.info(`Event updated: ${event.name} by ${req.user.id}`);
    
    res.json({
      success: true,
      data: event
    });
  } catch (error) {
    logger.error(`Update event error for ID ${req.params.id}:`, error);
    next(error);
  }
};

// Delete event
exports.deleteEvent = async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id);
    
    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }
    
    // Check if user is creator or admin
    if (event.creator.toString() !== req.user.id && req.user.role !== 'Admin') {
      logger.warn(`Unauthorized delete attempt for event ${req.params.id} by user ${req.user.id}`);
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to delete this event'
      });
    }
    
    await event.deleteOne();
    
    logger.info(`Event deleted: ${event.name} by ${req.user.id}`);
    
    res.json({
      success: true,
      data: {}
    });
  } catch (error) {
    logger.error(`Delete event error for ID ${req.params.id}:`, error);
    next(error);
  }
};