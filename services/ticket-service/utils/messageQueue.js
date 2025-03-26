// utils/messageQueue.js
const amqp = require('amqplib');
const logger = require('./logger');

let channel;

// Connect to RabbitMQ
async function connectQueue() {
  try {
    const connection = await amqp.connect(process.env.RABBITMQ_URI || 'amqp://localhost');
    channel = await connection.createChannel();
    
    // Ensure queue exists
    await channel.assertQueue('notifications', { durable: true });
    
    logger.info('Connected to RabbitMQ');
    return channel;
  } catch (error) {
    logger.error('RabbitMQ connection error:', error);
    // Retry connection after delay
    setTimeout(connectQueue, 5000);
  }
}

// Send a message to the queue
async function sendNotification(type, data) {
  try {
    if (!channel) await connectQueue();
    
    const message = {
      type,
      data,
      timestamp: new Date()
    };
    
    channel.sendToQueue(
      'notifications',
      Buffer.from(JSON.stringify(message)),
      { persistent: true }
    );
    
    logger.info(`Notification sent: ${type}`);
    return true;
  } catch (error) {
    logger.error('Failed to send notification:', error);
    return false;
  }
}

module.exports = {
  connectQueue,
  sendNotification
};