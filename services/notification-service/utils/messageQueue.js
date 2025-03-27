const amqp = require('amqplib');
const logger = require('./logger');
const { sendEmail } = require('./emailService');
const { sendSMS } = require('./smsService');
const Notification = require('../models/Notification');
const UserPreference = require('../models/UserPreference');
const userService = require('./userService');

let channel;

// Connect to RabbitMQ
async function connectQueue() {
  try {
    const connection = await amqp.connect(process.env.RABBITMQ_URI || 'amqp://localhost');
    channel = await connection.createChannel();
    
    // Ensure queue exists
    await channel.assertQueue('notifications', { durable: true });
    
    logger.info('Connected to RabbitMQ');
    
    // Start consuming messages
    channel.consume('notifications', processMessage, { noAck: false });
    
    return channel;
  } catch (error) {
    logger.error('RabbitMQ connection error:', error);
    // Retry connection after delay
    setTimeout(connectQueue, 5000);
  }
}

// Process incoming messages
async function processMessage(msg) {
  if (!msg) return;
  
  try {
    const content = JSON.parse(msg.content.toString());
    logger.info(`Processing notification: ${content.type}`);
    
    // Process based on message type
    switch (content.type) {
      case 'ticket_reserved':
        await processTicketReserved(content.data);
        break;
      case 'ticket_purchased':
        await processTicketPurchased(content.data);
        break;
      case 'ticket_cancelled':
        await processTicketCancelled(content.data);
        break;
      default:
        logger.warn(`Unknown notification type: ${content.type}`);
    }
    
    // Acknowledge the message
    channel.ack(msg);
  } catch (error) {
    logger.error('Error processing message:', error);
    
    // If processing fails, requeue or discard based on severity
    if (error.retryable) {
      channel.nack(msg, false, true); // Requeue
    } else {
      channel.nack(msg, false, false); // Don't requeue, move to dead-letter queue
    }
  }
}

// Process ticket reservation notification
async function processTicketReserved(data) {
  try {
    const { userId, eventId, eventName, quantity, tickets } = data;
    
    // Get user details
    const user = await userService.getUser(userId);
    if (!user.success) {
      throw new Error(`Failed to get user details: ${user.error}`);
    }
    
    // Get user preferences
    const preferences = await UserPreference.findOne({ userId }) || 
      new UserPreference({ userId, emailAddress: user.data.email, phoneNumber: user.data.phone });
    
    // Create the notification content
    const emailSubject = preferences.language === 'fr' 
      ? `Réservation de billets pour ${eventName}` 
      : `Ticket Reservation for ${eventName}`;
    
    const emailContent = preferences.language === 'fr'
      ? `Bonjour ${user.data.firstName},\n\nVous avez réservé ${quantity} billets pour ${eventName}. Votre réservation est valable pour 10 minutes. Veuillez compléter votre achat pour confirmer vos billets.\n\nMerci d'utiliser notre service.`
      : `Hello ${user.data.firstName},\n\nYou have reserved ${quantity} tickets for ${eventName}. Your reservation is valid for 10 minutes. Please complete your purchase to confirm your tickets.\n\nThank you for using our service.`;
    
    const smsContent = preferences.language === 'fr'
      ? `${quantity} billets réservés pour ${eventName}. Validez votre achat dans 10 min.`
      : `${quantity} tickets reserved for ${eventName}. Complete purchase within 10 min.`;
    
    // Send email notification
    if (preferences.receiveEmails && preferences.emailAddress) {
      const notification = new Notification({
        userId,
        type: 'email',
        subject: emailSubject,
        content: emailContent,
        metadata: { eventId, tickets }
      });
      
      await notification.save();
      
      const emailResult = await sendEmail(
        preferences.emailAddress,
        emailSubject,
        emailContent
      );
      
      if (emailResult.success) {
        notification.status = 'sent';
        notification.sentAt = new Date();
      } else {
        notification.status = 'failed';
        logger.error(`Failed to send reservation email to ${preferences.emailAddress}:`, emailResult.error);
      }
      
      await notification.save();
    }
    
    // Send SMS notification
    if (preferences.receiveSMS && preferences.phoneNumber) {
      const notification = new Notification({
        userId,
        type: 'sms',
        subject: 'Ticket Reservation',
        content: smsContent,
        metadata: { eventId, tickets }
      });
      
      await notification.save();
      
      const smsResult = await sendSMS(
        preferences.phoneNumber,
        smsContent
      );
      
      if (smsResult.success) {
        notification.status = 'sent';
        notification.sentAt = new Date();
      } else {
        notification.status = 'failed';
        logger.error(`Failed to send reservation SMS to ${preferences.phoneNumber}:`, smsResult.error);
      }
      
      await notification.save();
    }
    
    logger.info(`Ticket reservation notifications processed for user ${userId}`);
  } catch (error) {
    logger.error('Error processing ticket reservation notification:', error);
    const retryableError = new Error(error.message);
    retryableError.retryable = true;
    throw retryableError; // Mark as retryable
  }
}

// Process ticket purchase notification
async function processTicketPurchased(data) {
  try {
    const { userId, eventId, eventName, tickets, totalAmount, currency } = data;

    // Get user details
    const user = await userService.getUser(userId);
    if (!user.success) {
      throw new Error(`Failed to get user details: ${user.error}`);
    }

    // Get user preferences
    const preferences = await UserPreference.findOne({ userId }) || 
      new UserPreference({ userId, emailAddress: user.data.email, phoneNumber: user.data.phone });

    // Format currency
    const formattedAmount = new Intl.NumberFormat(preferences.language === 'fr' ? 'fr-FR' : 'en-US', {
      style: 'currency',
      currency: currency
    }).format(totalAmount);

    // Create the notification content
    const emailSubject = preferences.language === 'fr' 
      ? `Confirmation d'achat pour ${eventName}` 
      : `Purchase Confirmation for ${eventName}`;

    const emailContent = preferences.language === 'fr'
      ? `Bonjour ${user.data.firstName},\n\nNous confirmons votre achat de ${tickets.length} billets pour ${eventName} pour un montant total de ${formattedAmount}.\n\nVos numéros de billets:\n${tickets.map(t => t.ticketNumber).join('\n')}\n\nMerci d'utiliser notre service.`
      : `Hello ${user.data.firstName},\n\nWe confirm your purchase of ${tickets.length} tickets for ${eventName} for a total amount of ${formattedAmount}.\n\nYour ticket numbers:\n${tickets.map(t => t.ticketNumber).join('\n')}\n\nThank you for using our service.`;

    const smsContent = preferences.language === 'fr'
      ? `Achat confirmé: ${tickets.length} billets pour ${eventName}. Montant: ${formattedAmount}. Merci!`
      : `Purchase confirmed: ${tickets.length} tickets for ${eventName}. Amount: ${formattedAmount}. Thank you!`;

    // Send notifications
    await sendNotification(preferences, userId, 'email', emailSubject, emailContent, { eventId, tickets, totalAmount, currency });
    await sendNotification(preferences, userId, 'sms', 'Ticket Purchase', smsContent, { eventId, tickets, totalAmount, currency });

    logger.info(`Ticket purchase notifications processed for user ${userId}`);
  } catch (error) {
    logger.error('Error processing ticket purchase notification:', error);
    const retryableError = new Error(error.message);
    retryableError.retryable = true;
    throw retryableError; // Mark as retryable
  }
}

async function sendNotification(preferences, userId, type, subject, content, metadata) {
  if ((type === 'email' && preferences.receiveEmails && preferences.emailAddress) || 
      (type === 'sms' && preferences.receiveSMS && preferences.phoneNumber)) {
    const notification = new Notification({
      userId,
      type,
      subject,
      content,
      metadata
    });

    await notification.save();

    const sendResult = type === 'email'
      ? await sendEmail(preferences.emailAddress, subject, content)
      : await sendSMS(preferences.phoneNumber, content);

    if (sendResult.success) {
      notification.status = 'sent';
      notification.sentAt = new Date();
    } else {
      notification.status = 'failed';
      logger.error(`Failed to send ${type} to ${type === 'email' ? preferences.emailAddress : preferences.phoneNumber}:`, sendResult.error);
    }

    await notification.save();
  }
}

// Process ticket cancellation notification
async function processTicketCancelled(data) {
  try {
    const { userId, tickets } = data;

    // Get user details
    const user = await userService.getUser(userId);
    if (!user.success) {
      throw new Error(`Failed to get user details: ${user.error}`);
    }

    // Get user preferences
    const preferences = await UserPreference.findOne({ userId }) || 
      new UserPreference({ userId, emailAddress: user.data.email, phoneNumber: user.data.phone });

    // Get the first ticket's event info
    if (tickets.length === 0) {
      throw new Error('No tickets provided in cancellation data');
    }

    // Create the notification content
    const emailSubject = preferences.language === 'fr' 
      ? `Annulation de billets` 
      : `Ticket Cancellation`;

    const emailContent = preferences.language === 'fr'
      ? `Bonjour ${user.data.firstName},\n\nNous confirmons l'annulation de ${tickets.length} billets. Si vous avez payé pour ces billets, un remboursement sera traité sous 3-5 jours ouvrables.\n\nMerci d'utiliser notre service.`
      : `Hello ${user.data.firstName},\n\nWe confirm the cancellation of ${tickets.length} tickets. If you paid for these tickets, a refund will be processed within 3-5 business days.\n\nThank you for using our service.`;

    const smsContent = preferences.language === 'fr'
      ? `Annulation confirmée pour ${tickets.length} billets. Remboursement sous 3-5 jours si applicable.`
      : `Cancellation confirmed for ${tickets.length} tickets. Refund within 3-5 days if applicable.`;

    // Send notifications
    await sendCancellationNotification(preferences, userId, 'email', emailSubject, emailContent, { tickets });
    await sendCancellationNotification(preferences, userId, 'sms', 'Ticket Cancellation', smsContent, { tickets });

    logger.info(`Ticket cancellation notifications processed for user ${userId}`);
  } catch (error) {
    logger.error('Error processing ticket cancellation notification:', error);
    const retryableError = new Error(error.message);
    retryableError.retryable = true;
    throw retryableError; // Mark as retryable
  }
}

async function sendCancellationNotification(preferences, userId, type, subject, content, metadata) {
  await sendNotification(preferences, userId, type, subject, content, metadata);
}

module.exports = {
  connectQueue
};