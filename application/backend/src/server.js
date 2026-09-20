const app = require('./app');
const config = require('./config/index');
const logger = require('./lib/logger');
const { initDatabase, closeDatabase } = require('./config/database');
const { closeRedis } = require('./config/redis');

let server;

async function start() {
  try {
    // Initialize database (create tables if needed)
    await initDatabase();

    server = app.listen(config.port, () => {
      logger.info({
        port: config.port,
        env: config.nodeEnv,
      }, `Task Manager API running on port ${config.port}`);
    });
  } catch (err) {
    logger.fatal({ err }, 'Failed to start server');
    process.exit(1);
  }
}

// ---------------------------------------------------------------------------
// Graceful shutdown
// ---------------------------------------------------------------------------

async function shutdown(signal) {
  logger.info({ signal }, 'Shutdown signal received — draining connections');

  if (server) {
    server.close(async () => {
      logger.info('HTTP server closed');

      try {
        await closeDatabase();
        await closeRedis();
        logger.info('All connections closed — exiting');
        process.exit(0);
      } catch (err) {
        logger.error({ err }, 'Error during shutdown');
        process.exit(1);
      }
    });

    // Force exit after 10 seconds if graceful shutdown stalls
    setTimeout(() => {
      logger.error('Forced shutdown after timeout');
      process.exit(1);
    }, 10000);
  }
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

process.on('unhandledRejection', (reason) => {
  logger.error({ reason }, 'Unhandled promise rejection');
});

start();
