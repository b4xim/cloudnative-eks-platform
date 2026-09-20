const { Router } = require('express');
const { pool } = require('../config/database');
const { isRedisReady } = require('../config/redis');
const logger = require('../lib/logger');

const router = Router();

/**
 * GET /health — Liveness probe.
 * Always returns 200 if the process is running.
 */
router.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});

/**
 * GET /ready — Readiness probe.
 * Returns 200 only if PostgreSQL (required) is reachable.
 * Redis status is informational — the app works without it.
 */
router.get('/ready', async (_req, res) => {
  const checks = { postgres: false, redis: false };

  try {
    await pool.query('SELECT 1');
    checks.postgres = true;
  } catch (err) {
    logger.warn({ err: err.message }, 'Readiness check: PostgreSQL unavailable');
  }

  try {
    checks.redis = await isRedisReady();
  } catch (err) {
    logger.warn({ err: err.message }, 'Readiness check: Redis unavailable');
  }

  // PostgreSQL is required; Redis is optional.
  const ready = checks.postgres;
  const status = ready ? 200 : 503;

  res.status(status).json({
    status: ready ? 'ready' : 'not_ready',
    checks,
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;
