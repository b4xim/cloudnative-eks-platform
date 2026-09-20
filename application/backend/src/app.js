const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const pinoHttp = require('pino-http');
const config = require('./config/index');
const logger = require('./lib/logger');
const healthRoutes = require('./routes/health');
const taskRoutes = require('./routes/tasks');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

const app = express();

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------

// Security headers
app.use(helmet());

// CORS
app.use(cors({ origin: config.cors.origin }));

// Body parsing
app.use(express.json());

// Structured HTTP request logging
app.use(pinoHttp({
  logger,
  // Don't log health check requests to avoid noise
  autoLogging: {
    ignore: (req) => req.url === '/health',
  },
}));

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

app.use('/', healthRoutes);
app.use('/api/tasks', taskRoutes);

// ---------------------------------------------------------------------------
// Error handling
// ---------------------------------------------------------------------------

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
