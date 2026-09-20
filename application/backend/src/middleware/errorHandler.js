const logger = require('../lib/logger');

/**
 * Global Express error handler.
 * Must have 4 parameters for Express to recognize it as an error handler.
 */
function errorHandler(err, req, res, _next) {
  const status = err.status || err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  logger.error({
    err,
    method: req.method,
    url: req.originalUrl,
    status,
  }, 'Request error');

  res.status(status).json({
    error: {
      message,
      status,
      ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
    },
  });
}

/**
 * 404 handler for unknown routes.
 */
function notFoundHandler(req, res) {
  res.status(404).json({
    error: {
      message: `Route not found: ${req.method} ${req.originalUrl}`,
      status: 404,
    },
  });
}

module.exports = { errorHandler, notFoundHandler };
