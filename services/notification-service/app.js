const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const { connectQueue } = require('./utils/messageQueue');
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

// Connect to RabbitMQ
connectQueue();

// Routes
app.use('/', routes);

// Error handling middleware
app.use(errorHandler);

// Swagger
setupSwagger(app);

// Start server
const PORT = process.env.PORT || 3004;
app.listen(PORT, () => {
  logger.info(`Notification service running on port ${PORT}`);
});

module.exports = app;