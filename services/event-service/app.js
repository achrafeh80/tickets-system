const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const routes = require('./routes');
const { errorHandler } = require('./middleware/errorHandler');
const logger = require('./utils/logger');
const setupSwagger = require('./utils/swagger');


// Load environment variables
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => logger.info('Connected to MongoDB'))
  .catch(err => logger.error('MongoDB connection error:', err));

setupSwagger(app);
// Routes
app.use('/api/events', routes);

// Error handling middleware
app.use(errorHandler);

// Swagger



// Start server
const PORT = process.env.PORT || 3002;
app.listen(PORT, () => {
  logger.info(`Event service running on port ${PORT}`);
});

module.exports = app; // For testing