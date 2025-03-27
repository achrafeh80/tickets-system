const nodemailer = require('nodemailer');
const logger = require('./logger');

// Create a transporter
let transporter;

// Initialize email transporter
function initTransporter() {
  // In development, use Ethereal (fake SMTP service)
  if (process.env.NODE_ENV !== 'production') {
    nodemailer.createTestAccount()
      .then(testAccount => {
        transporter = nodemailer.createTransport({
          host: 'smtp.ethereal.email',
          port: 587,
          secure: false,
          auth: {
            user: testAccount.user,
            pass: testAccount.pass
          }
        });
        logger.info('Ethereal email account created for testing');
      })
      .catch(err => {
        logger.error('Failed to create test email account:', err);
      });
  } else {
    // In production, use real email service (e.g., SendGrid, Amazon SES, etc.)
    transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: parseInt(process.env.EMAIL_PORT),
      secure: process.env.EMAIL_SECURE === 'true',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
      }
    });
  }
}

// Initialize transporter
initTransporter();

// Send an email
async function sendEmail(to, subject, content) {
  try {
    if (!transporter) {
      initTransporter();
      // If still no transporter, simulate success in dev mode
      if (!transporter && process.env.NODE_ENV !== 'production') {
        logger.info(`[SIMULATED] Email sent to ${to}: ${subject}`);
        return { success: true };
      }
    }
    
    const mailOptions = {
      from: process.env.EMAIL_FROM || '"Ticket System" <tickets@example.com>',
      to,
      subject,
      text: content
    };
    
    const info = await transporter.sendMail(mailOptions);
    
    // Log the test URL in development
    if (process.env.NODE_ENV !== 'production') {
      logger.info(`Email sent: ${info.messageId}`);
      logger.info(`Preview URL: ${nodemailer.getTestMessageUrl(info)}`);
    } else {
      logger.info(`Email sent to ${to}: ${subject}`);
    }
    
    return {
      success: true,
      messageId: info.messageId
    };
  } catch (error) {
    logger.error('Email sending error:', error);
    
    // In development, simulate success
    if (process.env.NODE_ENV !== 'production') {
      logger.info(`[SIMULATED] Email sent to ${to}: ${subject}`);
      return { success: true };
    }
    
    return {
      success: false,
      error: error.message
    };
  }
}

module.exports = {
  sendEmail
};