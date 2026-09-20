const { pool } = require('../config/database');
const { cacheGet, cacheSet, cacheInvalidate } = require('../config/redis');
const config = require('../config/index');
const logger = require('../lib/logger');

const VALID_STATUSES = ['todo', 'in-progress', 'done'];
const VALID_PRIORITIES = ['low', 'medium', 'high'];

/**
 * Validate task input. Returns an array of error messages (empty = valid).
 */
function validate(data, isUpdate = false) {
  const errors = [];

  if (!isUpdate && (!data.title || typeof data.title !== 'string' || data.title.trim().length === 0)) {
    errors.push('title is required and must be a non-empty string');
  }

  if (data.title !== undefined && typeof data.title === 'string' && data.title.trim().length > 255) {
    errors.push('title must be 255 characters or fewer');
  }

  if (data.status !== undefined && !VALID_STATUSES.includes(data.status)) {
    errors.push(`status must be one of: ${VALID_STATUSES.join(', ')}`);
  }

  if (data.priority !== undefined && !VALID_PRIORITIES.includes(data.priority)) {
    errors.push(`priority must be one of: ${VALID_PRIORITIES.join(', ')}`);
  }

  return errors;
}

/**
 * Find all tasks, optionally filtered by status and/or priority.
 */
async function findAll(filters = {}) {
  const cacheKey = `tasks:all:${filters.status || 'any'}:${filters.priority || 'any'}`;

  // Try cache first
  const cached = await cacheGet(cacheKey);
  if (cached) {
    logger.debug({ cacheKey }, 'Cache HIT');
    return cached;
  }

  let query = 'SELECT * FROM tasks';
  const conditions = [];
  const values = [];

  if (filters.status && VALID_STATUSES.includes(filters.status)) {
    values.push(filters.status);
    conditions.push(`status = $${values.length}`);
  }

  if (filters.priority && VALID_PRIORITIES.includes(filters.priority)) {
    values.push(filters.priority);
    conditions.push(`priority = $${values.length}`);
  }

  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }

  query += ' ORDER BY created_at DESC';

  const result = await pool.query(query, values);
  const tasks = result.rows;

  await cacheSet(cacheKey, tasks, config.redis.cacheTTL);
  return tasks;
}

/**
 * Find a single task by ID.
 */
async function findById(id) {
  const cacheKey = `tasks:${id}`;

  const cached = await cacheGet(cacheKey);
  if (cached) {
    logger.debug({ cacheKey }, 'Cache HIT');
    return cached;
  }

  const result = await pool.query('SELECT * FROM tasks WHERE id = $1', [id]);
  const task = result.rows[0] || null;

  if (task) {
    await cacheSet(cacheKey, task, config.redis.cacheTTL);
  }

  return task;
}

/**
 * Create a new task.
 */
async function create(data) {
  const result = await pool.query(
    `INSERT INTO tasks (title, description, status, priority)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [
      data.title.trim(),
      data.description || null,
      data.status || 'todo',
      data.priority || 'medium',
    ]
  );

  await cacheInvalidate('tasks:*');
  return result.rows[0];
}

/**
 * Update an existing task.
 */
async function update(id, data) {
  // Build SET clause dynamically from provided fields
  const fields = [];
  const values = [];
  let paramIndex = 1;

  if (data.title !== undefined) {
    fields.push(`title = $${paramIndex++}`);
    values.push(data.title.trim());
  }
  if (data.description !== undefined) {
    fields.push(`description = $${paramIndex++}`);
    values.push(data.description);
  }
  if (data.status !== undefined) {
    fields.push(`status = $${paramIndex++}`);
    values.push(data.status);
  }
  if (data.priority !== undefined) {
    fields.push(`priority = $${paramIndex++}`);
    values.push(data.priority);
  }

  if (fields.length === 0) {
    return findById(id);
  }

  fields.push(`updated_at = NOW()`);
  values.push(id);

  const query = `UPDATE tasks SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`;
  const result = await pool.query(query, values);

  if (result.rows[0]) {
    await cacheInvalidate('tasks:*');
  }

  return result.rows[0] || null;
}

/**
 * Delete a task by ID.
 */
async function deleteById(id) {
  const result = await pool.query('DELETE FROM tasks WHERE id = $1 RETURNING id', [id]);
  if (result.rows[0]) {
    await cacheInvalidate('tasks:*');
  }
  return result.rows[0] || null;
}

module.exports = {
  validate,
  findAll,
  findById,
  create,
  update,
  deleteById,
  VALID_STATUSES,
  VALID_PRIORITIES,
};
