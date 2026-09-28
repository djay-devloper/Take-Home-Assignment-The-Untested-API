const taskService = require('../../src/services/taskService');

describe('taskService Unit Tests', () => {
  beforeEach(() => {
    taskService._reset();
  });

  describe('create and getAll', () => {
    test('creates a task with default values', () => {
      const task = taskService.create({ title: 'Test Task' });

      expect(task).toBeDefined();
      expect(task.id).toBeDefined();
      expect(typeof task.id).toBe('string');
      expect(task.title).toBe('Test Task');
      expect(task.description).toBe('');
      expect(task.status).toBe('todo');
      expect(task.priority).toBe('medium');
      expect(task.dueDate).toBeNull();
      expect(task.completedAt).toBeNull();
      expect(task.createdAt).toBeDefined();
    });

    test('creates a task with custom fields', () => {
      const task = taskService.create({
        title: 'Detailed Task',
        description: 'Testing description',
        status: 'in_progress',
        priority: 'high',
        dueDate: '2026-12-31T23:59:59.000Z',
      });

      expect(task.title).toBe('Detailed Task');
      expect(task.description).toBe('Testing description');
      expect(task.status).toBe('in_progress');
      expect(task.priority).toBe('high');
      expect(task.dueDate).toBe('2026-12-31T23:59:59.000Z');
    });

    test('getAll returns all tasks', () => {
      expect(taskService.getAll()).toEqual([]);

      const t1 = taskService.create({ title: 'Task 1' });
      const t2 = taskService.create({ title: 'Task 2' });

      const all = taskService.getAll();
      expect(all).toHaveLength(2);
      expect(all).toEqual([t1, t2]);
    });

    test('getAll returns a copy of tasks array, avoiding direct mutation', () => {
      taskService.create({ title: 'Task 1' });
      const all = taskService.getAll();
      all.pop();
      expect(taskService.getAll()).toHaveLength(1);
    });
  });

  describe('findById', () => {
    test('returns task by id when it exists', () => {
      const created = taskService.create({ title: 'Target' });
      const found = taskService.findById(created.id);
      expect(found).toEqual(created);
    });

    test('returns undefined when task does not exist', () => {
      const found = taskService.findById('non-existent-id');
      expect(found).toBeUndefined();
    });
  });

  describe('getByStatus', () => {
    test('filters tasks by exact status', () => {
      const t1 = taskService.create({ title: 'Task 1', status: 'todo' });
      const t2 = taskService.create({ title: 'Task 2', status: 'in_progress' });
      const t3 = taskService.create({ title: 'Task 3', status: 'done' });

      const todos = taskService.getByStatus('todo');
      expect(todos.map((t) => t.id)).toEqual([t1.id]);

      const inProgress = taskService.getByStatus('in_progress');
      expect(inProgress.map((t) => t.id)).toEqual([t2.id]);

      const done = taskService.getByStatus('done');
      expect(done.map((t) => t.id)).toEqual([t3.id]);
    });

    test('does not return tasks on substring/partial matches', () => {
      taskService.create({ title: 'Task Todo', status: 'todo' });
      taskService.create({ title: 'Task Done', status: 'done' });

      // Substring 'do' should not return both 'todo' and 'done'
      const matchDo = taskService.getByStatus('do');
      expect(matchDo).toHaveLength(0);
    });
  });

  describe('getPaginated', () => {
    test('returns correct slice for page 1', () => {
      const t1 = taskService.create({ title: 'Task 1' });
      const t2 = taskService.create({ title: 'Task 2' });
      const t3 = taskService.create({ title: 'Task 3' });

      const page1 = taskService.getPaginated(1, 2);
      expect(page1).toHaveLength(2);
      expect(page1[0].id).toBe(t1.id);
      expect(page1[1].id).toBe(t2.id);
    });

    test('returns correct slice for page 2', () => {
      const t1 = taskService.create({ title: 'Task 1' });
      const t2 = taskService.create({ title: 'Task 2' });
      const t3 = taskService.create({ title: 'Task 3' });

      const page2 = taskService.getPaginated(2, 2);
      expect(page2).toHaveLength(1);
      expect(page2[0].id).toBe(t3.id);
    });

    test('returns empty array when page is out of bounds', () => {
      taskService.create({ title: 'Task 1' });
      const result = taskService.getPaginated(5, 10);
      expect(result).toEqual([]);
    });

    test('defaults to page 1 and limit 10 when invalid or missing params are passed', () => {
      taskService.create({ title: 'Task 1' });
      const result = taskService.getPaginated(undefined, undefined);
      expect(result).toHaveLength(1);
    });
  });

  describe('getStats', () => {
    test('calculates correct status counts and overdue counts', () => {
      const pastDate = new Date(Date.now() - 86400000).toISOString();
      const futureDate = new Date(Date.now() + 86400000).toISOString();

      taskService.create({ title: 'Task 1', status: 'todo', dueDate: pastDate }); // overdue
      taskService.create({ title: 'Task 2', status: 'in_progress', dueDate: futureDate }); // not overdue
      taskService.create({ title: 'Task 3', status: 'done', dueDate: pastDate }); // done is never overdue
      taskService.create({ title: 'Task 4', status: 'todo', dueDate: null }); // no dueDate
      // Edge case: task with custom or uncounted status
      taskService.create({ title: 'Task 5', status: 'custom_status' });

      const stats = taskService.getStats();
      expect(stats).toEqual({
        todo: 2,
        in_progress: 1,
        done: 1,
        overdue: 1,
      });
    });

    test('returns zeroes when no tasks exist', () => {
      const stats = taskService.getStats();
      expect(stats).toEqual({
        todo: 0,
        in_progress: 0,
        done: 0,
        overdue: 0,
      });
    });
  });


  describe('update', () => {
    test('updates existing task fields', () => {
      const task = taskService.create({ title: 'Old Title', priority: 'low' });
      const updated = taskService.update(task.id, { title: 'New Title', priority: 'high' });

      expect(updated.title).toBe('New Title');
      expect(updated.priority).toBe('high');
      expect(taskService.findById(task.id).title).toBe('New Title');
    });

    test('returns null when updating non-existent task', () => {
      const result = taskService.update('invalid-id', { title: 'New' });
      expect(result).toBeNull();
    });

    test('does not allow mutating id or createdAt', () => {
      const task = taskService.create({ title: 'Original' });
      const originalId = task.id;
      const originalCreatedAt = task.createdAt;

      taskService.update(task.id, { id: 'hacked-id', createdAt: '1999-01-01T00:00:00.000Z' });
      const current = taskService.findById(originalId);
      expect(current).toBeDefined();
      expect(current.id).toBe(originalId);
      expect(current.createdAt).toBe(originalCreatedAt);
    });
  });

  describe('remove', () => {
    test('removes existing task and returns true', () => {
      const task = taskService.create({ title: 'To Delete' });
      const deleted = taskService.remove(task.id);

      expect(deleted).toBe(true);
      expect(taskService.findById(task.id)).toBeUndefined();
      expect(taskService.getAll()).toHaveLength(0);
    });

    test('returns false when task does not exist', () => {
      const deleted = taskService.remove('non-existent-id');
      expect(deleted).toBe(false);
    });
  });

  describe('completeTask', () => {
    test('marks task as done with completedAt timestamp without altering priority', () => {
      const task = taskService.create({ title: 'Urgent Task', priority: 'high', status: 'todo' });
      const completed = taskService.completeTask(task.id);

      expect(completed).toBeDefined();
      expect(completed.status).toBe('done');
      expect(completed.completedAt).toBeDefined();
      expect(typeof completed.completedAt).toBe('string');
      // Priority should remain 'high'
      expect(completed.priority).toBe('high');
    });

    test('returns null when task does not exist', () => {
      const completed = taskService.completeTask('non-existent-id');
      expect(completed).toBeNull();
    });
  });

  describe('assignTask', () => {
    test('assigns an existing task to a user', () => {
      const task = taskService.create({ title: 'Design DB' });
      expect(task.assignee).toBeNull();

      const assigned = taskService.assignTask(task.id, 'Alice');
      expect(assigned).toBeDefined();
      expect(assigned.assignee).toBe('Alice');
      expect(taskService.findById(task.id).assignee).toBe('Alice');
    });

    test('reassigns a task to another user', () => {
      const task = taskService.create({ title: 'Review Code', assignee: 'Bob' });
      const reassigned = taskService.assignTask(task.id, 'Charlie');
      expect(reassigned.assignee).toBe('Charlie');
    });

    test('returns null when task does not exist', () => {
      const result = taskService.assignTask('non-existent-id', 'Alice');
      expect(result).toBeNull();
    });
  });
});

