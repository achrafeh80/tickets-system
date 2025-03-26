const Event = require('../../event-service/models/Event');
const axios = require('axios');
const logger = require('./logger');

const EVENT_SERVICE_URL = process.env.EVENT_SERVICE_URL || 'http://localhost:3002/api/events';

// Get event details
async function getEvent(eventId, token) {
  try {
    const response = await axios.get(`${EVENT_SERVICE_URL}/${eventId}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    });
    
    return {
      success: true,
      event: response.data.data
    };
  } catch (error) {
    logger.error(`Error fetching event ${eventId}:`, error.response?.data || error.message);
    
    return {
      success: false,
      error: error.response?.data?.message || 'Failed to fetch event details'
    };
  }
}

// Update available seats
const updateEventSeats = async (eventId, seatChange, authToken) => {
  try {
    // Validate input parameters
    if (!eventId) {
      return {
        success: false,
        error: 'Event ID is required'
      };
    }

    if (typeof seatChange !== 'number') {
      return {
        success: false,
        error: 'Seat change must be a number'
      };
    }

    // Find the event
    const event = await Event.findById(eventId);
    
    if (!event) {
      return {
        success: false,
        error: 'Event not found',
        details: {
          eventId,
          seatChange
        }
      };
    }

    // Comprehensive logging for diagnostic purposes
    logger.info('Event Seat Update Attempt', {
      eventId,
      seatChange,
      eventProperties: {
        availableSeats: event.availableSeats,
        seats: event.seats,
        totalSeats: event.totalSeats
      }
    });

    // Flexible seat property detection and update
    const seatProperties = ['availableSeats', 'seats', 'totalSeats'];
    let updatedProperty = null;

    for (let prop of seatProperties) {
      if (event.hasOwnProperty(prop) && typeof event[prop] === 'number') {
        const currentSeats = event[prop] || 0;
        const newSeatCount = Math.max(0, currentSeats + seatChange);

        const updateObj = { [prop]: newSeatCount };
        const updatedEvent = await Event.findByIdAndUpdate(
          eventId, 
          { $set: updateObj }, 
          { 
            new: true,
            runValidators: true 
          }
        );

        updatedProperty = {
          property: prop,
          oldValue: currentSeats,
          newValue: newSeatCount
        };

        return {
          success: true,
          event: updatedEvent,
          seatUpdate: updatedProperty
        };
      }
    }

    // If no suitable seat property found
    return {
      success: false,
      error: 'No valid seat property found to update',
      details: {
        eventId,
        eventProperties: Object.keys(event.toObject())
      }
    };

  } catch (error) {
    // Comprehensive error logging
    logger.error('Seat Update Error', {
      eventId,
      seatChange,
      errorName: error.name,
      errorMessage: error.message,
      errorStack: error.stack
    });

    return {
      success: false,
      error: 'Failed to update event seats',
      details: {
        message: error.message,
        name: error.name
      }
    };
  }
};

module.exports = { getEvent, updateEventSeats };