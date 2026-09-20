const pino = require('pino');

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  // In production, output pure JSON for log aggregators.
  // In development, use a human-readable format if pino-pretty is installed.
  ...(process.env.NODE_ENV !== 'production' && {
    transport: undefined, // stays as JSON; install pino-pretty locally for pretty output
  }),
  base: {
    service: 'taskmanager-backend',
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  formatters: {
    level(label) {
      return { level: label };
    },
  },
});

module.exports = logger;
