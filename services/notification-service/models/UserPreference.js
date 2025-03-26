const mongoose = require('mongoose');

const userPreferenceSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'User',
    unique: true
  },
  language: {
    type: String,
    enum: ['en', 'fr'],
    default: 'en'
  },
  receiveEmails: {
    type: Boolean,
    default: true
  },
  receiveSMS: {
    type: Boolean,
    default: true
  },
  emailAddress: {
    type: String
  },
  phoneNumber: {
    type: String
  }
});

const UserPreference = mongoose.model('UserPreference', userPreferenceSchema);

module.exports = UserPreference;