const mongoose = require('mongoose');

const ticketSchema = new mongoose.Schema({
  eventId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'Event'
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'User'
  },
  ticketNumber: {
    type: String,
    required: true,
    unique: true
  },
  purchaseDate: {
    type: Date,
    default: Date.now
  },
  price: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    required: true,
    enum: ['EUR', 'USD', 'GBP']
  },
  status: {
    type: String,
    required: true,
    enum: ['reserved', 'purchased', 'cancelled', 'used'],
    default: 'reserved'
  },
  paymentId: {
    type: String
  },
  checkedIn: {
    type: Boolean,
    default: false
  },
  checkedInAt: {
    type: Date
  },
  isActive: {
    type: Boolean,
    default: true
  },
  expiresAt: {
    type: Date
  }
});

// Generate unique ticket number before save
ticketSchema.pre('save', async function(next) {
  if (this.isNew) {
    // Generate a random ticket number - combine eventId, userId and random string
    const randomStr = Math.random().toString(36).substring(2, 10).toUpperCase();
    this.ticketNumber = `TIX-${this.eventId.toString().substring(0, 6)}-${randomStr}`;
    
    // Set expiration for reserved tickets (10 minutes)
    if (this.status === 'reserved') {
      this.expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    }
  }
  next();
});

const Ticket = mongoose.model('Ticket', ticketSchema);

module.exports = Ticket;