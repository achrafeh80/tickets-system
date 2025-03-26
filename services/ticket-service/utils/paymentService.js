// utils/paymentService.js
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const logger = require('./logger');

// Process payment
async function processPayment(amount, currency, paymentToken, description) {
  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency: currency.toLowerCase(),
      payment_method: paymentToken,
      description,
      confirm: true
    });
    
    logger.info(`Payment processed: ${paymentIntent.id}`);
    
    return {
      success: true,
      paymentId: paymentIntent.id,
      status: paymentIntent.status
    };
  } catch (error) {
    logger.error('Payment processing error:', error);
    
    return {
      success: false,
      error: error.message
    };
  }
}

// Refund payment
async function refundPayment(paymentId, amount) {
  try {
    const refund = await stripe.refunds.create({
      payment_intent: paymentId,
      amount: amount ? Math.round(amount * 100) : undefined // Convert to cents if partial refund
    });
    
    logger.info(`Payment refunded: ${refund.id}`);
    
    return {
      success: true,
      refundId: refund.id,
      status: refund.status
    };
  } catch (error) {
    logger.error('Payment refund error:', error);
    
    return {
      success: false,
      error: error.message
    };
  }
}

module.exports = {
  processPayment,
  refundPayment
};