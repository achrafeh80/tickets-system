// utils/eventService.mock.js

const mockEvents = {
  '65cba01c5fc13c06d89e4180': {
    _id: '65cba01c5fc13c06d89e4180',
    name: 'String',
    price: 0,
    currency: 'USD',
    availableSeats: 50,
    totalSeats: 100,
    creator: 'mock-creator-id',
    date: new Date(Date.now()) 
  }
};

async function getEvent(eventId) {
  const event = mockEvents[eventId];
  if (!event) {
    return { success: false, error: 'Mock event not found' };
  }

  return { success: true, event };
}

async function updateEventSeats(eventId, seatChange) {
  const event = mockEvents[eventId];
  if (!event || typeof event.availableSeats !== 'number') {
    return { success: false, error: 'Mock event not found or invalid' };
  }

  const newSeats = event.availableSeats + seatChange;
  if (newSeats < 0) {
    return { success: false, error: 'Not enough seats available' };
  }

  event.availableSeats = newSeats;

  return {
    success: true,
    event,
    seatUpdate: {
      property: 'availableSeats',
      oldValue: event.availableSeats - seatChange,
      newValue: event.availableSeats
    }
  };
}

module.exports = {
  getEvent,
  updateEventSeats
};
