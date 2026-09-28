// uuid package to generate unique task IDs
const { v4: uuidv4 } = require('uuid');

// in-memory array to store all our tasks
let tasks = [];

// function to get all tasks (returns a copy so original array isn't mutated)
const getAll = () => [...tasks];

// find single task by its id
const findById = (id) => tasks.find((t) => t.id === id);

// filter tasks by status - fixed bug: using exact equality === instead of .includes()
const getByStatus = (status) => tasks.filter((t) => t.status === status);

// pagination function - fixed bug: offset is now (page - 1) * limit so page 1 is not skipped!
const getPaginated = (page, limit) => {
  const pageNum = Math.max(1, parseInt(page) || 1);
  const limitNum = Math.max(1, parseInt(limit) || 10);
  const offset = (pageNum - 1) * limitNum;
  return tasks.slice(offset, offset + limitNum);
};

// calculate status counts and count how many tasks are overdue
const getStats = () => {
  const now = new Date();
  const counts = { todo: 0, in_progress: 0, done: 0 };
  let overdue = 0;

  tasks.forEach((t) => {
    if (counts[t.status] !== undefined) counts[t.status]++;
    // overdue: task has a due date, is not completed, and due date has passed
    if (t.dueDate && t.status !== 'done' && new Date(t.dueDate) < now) {
      overdue++;
    }
  });

  return { ...counts, overdue };
};

// create a new task with default values (assignee defaults to null)
const create = ({ title, description = '', status = 'todo', priority = 'medium', dueDate = null, assignee = null }) => {
  const task = {
    id: uuidv4(),
    title,
    description,
    status,
    priority,
    dueDate,
    completedAt: null,
    createdAt: new Date().toISOString(),
    assignee,
  };
  tasks.push(task);
  return task;
};

// update task - don't allow modifying id or createdAt
const update = (id, fields) => {
  const index = tasks.findIndex((t) => t.id === id);
  if (index === -1) return null;

  // protect id and createdAt from being overwritten
  const { id: _ignoredId, createdAt: _ignoredCreatedAt, ...allowedFields } = fields;
  const updated = { ...tasks[index], ...allowedFields };
  tasks[index] = updated;
  return updated;
};

// delete a task by id
const remove = (id) => {
  const index = tasks.findIndex((t) => t.id === id);
  if (index === -1) return false;

  tasks.splice(index, 1);
  return true;
};

// complete task - fixed bug: removed hardcoded priority: 'medium' so it keeps its original priority!
const completeTask = (id) => {
  const task = findById(id);
  if (!task) return null;

  const updated = {
    ...task,
    status: 'done',
    completedAt: new Date().toISOString(),
  };

  const index = tasks.findIndex((t) => t.id === id);
  tasks[index] = updated;
  return updated;
};

// DAY 2 NEW FEATURE: assign a task to a user
const assignTask = (id, assignee) => {
  const index = tasks.findIndex((t) => t.id === id);
  if (index === -1) return null;

  const updated = {
    ...tasks[index],
    assignee,
  };

  tasks[index] = updated;
  return updated;
};

// reset helper for testing
const _reset = () => {
  tasks = [];
};

module.exports = {
  getAll,
  findById,
  getByStatus,
  getPaginated,
  getStats,
  create,
  update,
  remove,
  completeTask,
  assignTask,
  _reset,
};
