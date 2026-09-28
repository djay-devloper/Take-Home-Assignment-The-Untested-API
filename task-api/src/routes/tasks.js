// express and router setup
const express = require('express');
const router = express.Router();

// importing task service which has the in-memory array
const taskService = require('../services/taskService');

// validator functions
const { validateCreateTask, validateUpdateTask } = require('../utils/validators');

// GET /tasks/stats - get summary counts of tasks and overdue tasks
router.get('/stats', (req, res) => {
  const stats = taskService.getStats();
  res.json(stats);
});

// GET /tasks - get all tasks with optional status filter or pagination
router.get('/', (req, res) => {
  const { status, page, limit } = req.query;

  // if status query parameter is passed
  if (status) {
    const tasks = taskService.getByStatus(status);
    return res.json(tasks);
  }

  // if page or limit is passed
  if (page !== undefined || limit !== undefined) {
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 10;
    const tasks = taskService.getPaginated(pageNum, limitNum);
    return res.json(tasks);
  }

  // otherwise return all tasks
  const tasks = taskService.getAll();
  res.json(tasks);
});

// POST /tasks - create a new task
router.post('/', (req, res) => {
  // validate the request body first
  const error = validateCreateTask(req.body);
  if (error) {
    return res.status(400).json({ error });
  }

  const task = taskService.create(req.body);
  res.status(201).json(task);
});

// PUT /tasks/:id - update an existing task
router.put('/:id', (req, res) => {
  // check if update fields are valid
  const error = validateUpdateTask(req.body);
  if (error) {
    return res.status(400).json({ error });
  }

  const task = taskService.update(req.params.id, req.body);
  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }

  res.json(task);
});

// DELETE /tasks/:id - remove a task by id
router.delete('/:id', (req, res) => {
  const deleted = taskService.remove(req.params.id);
  if (!deleted) {
    return res.status(404).json({ error: 'Task not found' });
  }

  // 204 means successful deletion with no content in body
  res.status(204).send();
});

// PATCH /tasks/:id/complete - mark a task as completed
router.patch('/:id/complete', (req, res) => {
  const task = taskService.completeTask(req.params.id);
  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }

  res.json(task);
});

module.exports = router;
