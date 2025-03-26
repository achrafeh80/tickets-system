const express = require('express');
const bodyParser = require('body-parser');
const { createProxyMiddleware } = require('http-proxy-middleware');
const logger = require('../utils/logger');
const router = express.Router();


const proxy = (target, serviceName) => {
  const proxyTarget = target || `http://localhost:3001`;

  logger.info(`Configuring proxy for ${serviceName}`, {
    target: proxyTarget
  });

  return createProxyMiddleware({
    target: proxyTarget,
    changeOrigin: true,


    pathRewrite: (path, req) => path.replace(/^\/api\/[^/]+/, ''),

    onError(err, req, res) {
      logger.error(`Proxy error for ${serviceName}`, {
        error: err.message,
        stack: err.stack,
        url: req.url,
        method: req.method
      });

      res.status(500).json({
        success: false,
        message: `${serviceName} service unavailable`,
        details: process.env.NODE_ENV === 'development' ? err.message : 'Internal error'
      });
    },
    logLevel: 'debug',
    onProxyReq(proxyReq, req, res) {
      logger.info(`Proxying request to ${serviceName}`, {
        method: req.method,
        path: req.url,
        headers: req.headers
      });

      proxyReq.setHeader('X-Forwarded-By', 'API-Gateway');
      proxyReq.setHeader('X-Request-ID', Date.now().toString());
    },

    onProxyRes(proxyRes, req, res) {
      logger.info(`Received response from ${serviceName}`, {
        status: proxyRes.statusCode,
        headers: proxyRes.headers
      });

      let body = Buffer.from([]);
      proxyRes.on('data', (chunk) => {
        body = Buffer.concat([body, chunk]);
      });

      proxyRes.on('end', () => {
        try {
          const content = body.length > 0 ? JSON.parse(body.toString()) : {};
          res.status(proxyRes.statusCode).json(content);
        } catch (err) {
          logger.warn(`Non-JSON response from ${serviceName}`, {
            error: err.message,
            responseStatus: proxyRes.statusCode
          });
          res.status(proxyRes.statusCode).send(body);
        }
      });
    },
  });
};

router.use('/users', proxy(process.env.USER_SERVICE_URL || 'http://localhost:3001', 'user-service'));
router.use('/events', proxy(process.env.EVENT_SERVICE_URL || 'http://localhost:3002', 'event-service'));
router.use('/tickets', proxy(process.env.TICKET_SERVICE_URL || 'http://localhost:3003', 'ticket-service'));
router.use('/notifications', proxy(process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3004', 'notification-service'));

module.exports = router;