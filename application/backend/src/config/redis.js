const { createClient } = require('redis');
const config = require('./index');
const logger = require('../lib/logger');

let client = null;
let isConnected = false;

/**
 * Get or create the Redis client.
 * Returns null if Redis is unavailable — callers must handle gracefully.
 */
async function getRedisClient() {
  if (client && isConnected) return client;

  try {
    client = createClient({ url: config.redis.url });

    client.on('error', (err) => {
      logger.warn({ err: err.message }, 'Redis client error');
      isConnected = false;
    });

    client.on('connect', () => {
      logger.info('Redis connected');
      isConnected = true;
    });

    client.on('end', () => {
      logger.info('Redis disconnected');
      isConnected = false;
    });

    await client.connect();
    return client;
  } catch (err) {
    logger.warn({ err: err.message }, 'Redis unavailable — running without cache');
    isConnected = false;
    return null;
  }
}

/**
 * Get a cached value (returns null on miss or Redis unavailability).
 */
async function cacheGet(key) {
  try {
    const redis = await getRedisClient();
    if (!redis) return null;
    const data = await redis.get(key);
    return data ? JSON.parse(data) : null;
  } catch (err) {
    logger.warn({ err: err.message, key }, 'Cache GET failed');
    return null;
  }
}

/**
 * Set a cached value with TTL.
 */
async function cacheSet(key, value, ttl) {
  try {
    const redis = await getRedisClient();
    if (!redis) return;
    await redis.set(key, JSON.stringify(value), { EX: ttl || config.redis.cacheTTL });
  } catch (err) {
    logger.warn({ err: err.message, key }, 'Cache SET failed');
  }
}

/**
 * Invalidate all task-related cache entries.
 */
async function cacheInvalidate(pattern) {
  try {
    const redis = await getRedisClient();
    if (!redis) return;

    const keys = await redis.keys(pattern || 'tasks:*');
    if (keys.length > 0) {
      await redis.del(keys);
    }
  } catch (err) {
    logger.warn({ err: err.message }, 'Cache invalidation failed');
  }
}

/**
 * Check if Redis is reachable.
 */
async function isRedisReady() {
  try {
    const redis = await getRedisClient();
    if (!redis) return false;
    await redis.ping();
    return true;
  } catch {
    return false;
  }
}

/**
 * Close the Redis client gracefully.
 */
async function closeRedis() {
  try {
    if (client) {
      await client.quit();
      logger.info('Redis client closed');
    }
  } catch (err) {
    logger.warn({ err: err.message }, 'Error closing Redis client');
  }
}

module.exports = {
  getRedisClient,
  cacheGet,
  cacheSet,
  cacheInvalidate,
  isRedisReady,
  closeRedis,
};
