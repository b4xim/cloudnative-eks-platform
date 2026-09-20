const { Router } = require('express');
const Task = require('../models/task');
const logger = require('../lib/logger');

const router = Router();

/**
 * GET /api/tasks
 * Query params: ?status=todo&priority=high
 */
router.get('/', async (req, res, next) => {
  try {
    const filters = {
      status: req.query.status,
      priority: req.query.priority,
    };
    const tasks = await Task.findAll(filters);
    res.status(200).json({ data: tasks, count: tasks.length });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/tasks/:id
 */
router.get('/:id', async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({
        error: { message: 'Task not found', status: 404 },
      });
    }
    res.status(200).json({ data: task });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/tasks
 */
router.post('/', async (req, res, next) => {
  try {
    const errors = Task.validate(req.body);
    if (errors.length > 0) {
      return res.status(400).json({
        error: { message: 'Validation failed', details: errors, status: 400 },
      });
    }

    const task = await Task.create(req.body);
    logger.info({ taskId: task.id }, 'Task created');
    res.status(201).json({ data: task });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/tasks/:id
 */
router.put('/:id', async (req, res, next) => {
  try {
    const errors = Task.validate(req.body, true);
    if (errors.length > 0) {
      return res.status(400).json({
        error: { message: 'Validation failed', details: errors, status: 400 },
      });
    }

    const task = await Task.update(req.params.id, req.body);
    if (!task) {
      return res.status(404).json({
        error: { message: 'Task not found', status: 404 },
      });
    }

    logger.info({ taskId: task.id }, 'Task updated');
    res.status(200).json({ data: task });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/tasks/:id
 */
router.delete('/:id', async (req, res, next) => {
  try {
    const deleted = await Task.deleteById(req.params.id);
    if (!deleted) {
      return res.status(404).json({
        error: { message: 'Task not found', status: 404 },
      });
    }

    logger.info({ taskId: req.params.id }, 'Task deleted');
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

module.exports = router;
