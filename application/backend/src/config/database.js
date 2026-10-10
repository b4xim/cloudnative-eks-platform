const { Pool } = require('pg');
const config = require('./index');
const logger = require('../lib/logger');

const {
  SecretsManagerClient,
  GetSecretValueCommand,
} = require('@aws-sdk/client-secrets-manager');

const secretsClient = new SecretsManagerClient({
  region: process.env.AWS_REGION || 'us-east-1',
});

let pool;

async function getDatabasePassword() {
  const command = new GetSecretValueCommand({
    SecretId: process.env.RDS_SECRET_NAME,
  });

  const response = await secretsClient.send(command);

  if (!response.SecretString) {
    throw new Error('RDS database password secret is empty');
  }

  return response.SecretString;
}

async function initPool() {
  const password = await getDatabasePassword();

  pool = new Pool({
    host: process.env.POSTGRES_HOST,
    port: parseInt(process.env.POSTGRES_PORT, 10),
    database: process.env.POSTGRES_DB,
    user: process.env.POSTGRES_USER,
    password,
    min: config.database.poolMin,
    max: config.database.poolMax,
    ssl: {
      rejectUnauthorized: false,
    },
  });

  pool.on('error', (err) => {
    logger.error({ err }, 'Unexpected PostgreSQL pool error');
  });
}

/**
 * Initialize the database — create the tasks table if it does not exist.
 */
async function initDatabase() {
  await initPool();

  const client = await pool.connect();

  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS tasks (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title VARCHAR(255) NOT NULL,
        description TEXT,
        status VARCHAR(20) DEFAULT 'todo'
          CHECK (status IN ('todo', 'in-progress', 'done')),
        priority VARCHAR(10) DEFAULT 'medium'
          CHECK (priority IN ('low', 'medium', 'high')),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    logger.info('Database initialized — tasks table ready');
  } catch (err) {
    logger.error({ err }, 'Failed to initialize database');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Close the pool gracefully.
 */
async function closeDatabase() {
  if (pool) {
    await pool.end();
    logger.info('Database pool closed');
  }
}

module.exports = { get pool() { return pool; }, initDatabase, closeDatabase };