// supertest lets us test HTTP requests without manually running the server
const request = require('supertest');
const app = require('../../src/app');
const taskService = require('../../src/services/taskService');

describe('Tasks API Integration Tests', () => {
  // reset tasks array before each test so each test runs independently
  beforeEach(() => {
    taskService._reset();
  });

  // ==========================================
  // 1. GET /tasks endpoint
  // ==========================================
  describe('GET /tasks', () => {
    // happy path: when empty
    test('returns empty array [] when there are no tasks', async () => {
      const res = await request(app).get('/tasks');
      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    // happy path: returns all tasks
    test('returns list of all created tasks', async () => {
      taskService.create({ title: 'Task 1' });
      taskService.create({ title: 'Task 2' });

      const res = await request(app).get('/tasks');
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
      expect(res.body[0].title).toBe('Task 1');
      expect(res.body[1].title).toBe('Task 2');
    });

    // happy path: filter by status
    test('filters tasks by status query parameter', async () => {
      taskService.create({ title: 'Task 1', status: 'todo' });
      taskService.create({ title: 'Task 2', status: 'done' });

      const res = await request(app).get('/tasks?status=todo');
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].status).toBe('todo');
    });

    // edge case 1: pagination query params
    test('handles pagination params page and limit', async () => {
      taskService.create({ title: 'Task 1' });
      taskService.create({ title: 'Task 2' });
      taskService.create({ title: 'Task 3' });

      const res = await request(app).get('/tasks?page=1&limit=2');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      // NOTE FOR DAY 2: Page 1 offset bug skips items due to offset = page * limit.
    });

    // edge case 2: invalid pagination values
    test('handles non-numeric pagination params safely', async () => {
      taskService.create({ title: 'Task 1' });

      const res = await request(app).get('/tasks?page=hello&limit=world');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  // ==========================================
  // 2. GET /tasks/stats endpoint
  // ==========================================
  describe('GET /tasks/stats', () => {
    // happy path: calculates stats
    test('returns accurate counts for statuses and overdue tasks', async () => {
      const pastDate = new Date(Date.now() - 3600000).toISOString();
      const futureDate = new Date(Date.now() + 3600000).toISOString();

      taskService.create({ title: 'Task 1', status: 'todo', dueDate: pastDate }); // overdue
      taskService.create({ title: 'Task 2', status: 'in_progress', dueDate: futureDate });
      taskService.create({ title: 'Task 3', status: 'done', dueDate: pastDate }); // completed task is not overdue

      const res = await request(app).get('/tasks/stats');
      expect(res.status).toBe(200);
      expect(res.body.todo).toBe(1);
      expect(res.body.in_progress).toBe(1);
      expect(res.body.done).toBe(1);
      expect(res.body.overdue).toBe(1);
    });

    // edge case: stats when database is empty
    test('returns zeroes when there are no tasks', async () => {
      const res = await request(app).get('/tasks/stats');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        todo: 0,
        in_progress: 0,
        done: 0,
        overdue: 0,
      });
    });
  });

  // ==========================================
  // 3. POST /tasks endpoint
  // ==========================================
  describe('POST /tasks', () => {
    // happy path: create task with just title
    test('creates a task with 201 status code and default fields', async () => {
      const res = await request(app)
        .post('/tasks')
        .send({ title: 'New Test Task' });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body.title).toBe('New Test Task');
      expect(res.body.status).toBe('todo');
      expect(res.body.priority).toBe('medium');
    });

    // happy path: create task with full payload
    test('creates a task with custom fields provided', async () => {
      const payload = {
        title: 'Project Assignment',
        description: 'Writing tests for day 1',
        status: 'in_progress',
        priority: 'high',
        dueDate: '2026-10-20T12:00:00.000Z',
      };

      const res = await request(app).post('/tasks').send(payload);
      expect(res.status).toBe(201);
      expect(res.body.title).toBe(payload.title);
      expect(res.body.description).toBe(payload.description);
      expect(res.body.status).toBe(payload.status);
      expect(res.body.priority).toBe(payload.priority);
      expect(res.body.dueDate).toBe(payload.dueDate);
    });

    // edge case 1: missing title
    test('fails with 400 when title is missing', async () => {
      const res = await request(app).post('/tasks').send({});
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('title is required and must be a non-empty string');
    });

    // edge case 2: title is empty string
    test('fails with 400 when title is empty string or spaces', async () => {
      const res = await request(app).post('/tasks').send({ title: '   ' });
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('title is required and must be a non-empty string');
    });

    // edge case 3: invalid status
    test('fails with 400 when status is invalid', async () => {
      const res = await request(app).post('/tasks').send({ title: 'Task', status: 'wrong' });
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('status must be one of');
    });

    // edge case 4: invalid priority
    test('fails with 400 when priority is invalid', async () => {
      const res = await request(app).post('/tasks').send({ title: 'Task', priority: 'mega-high' });
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('priority must be one of');
    });

    // edge case 5: invalid dueDate format
    test('fails with 400 when dueDate is not a valid date', async () => {
      const res = await request(app).post('/tasks').send({ title: 'Task', dueDate: 'invalid-date' });
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('dueDate must be a valid ISO date string');
    });
  });

  // ==========================================
  // 4. PUT /tasks/:id endpoint
  // ==========================================
  describe('PUT /tasks/:id', () => {
    // happy path: updating existing task
    test('updates task and returns 200 status code', async () => {
      const created = taskService.create({ title: 'Old Title', priority: 'low' });

      const res = await request(app)
        .put(`/tasks/${created.id}`)
        .send({ title: 'New Updated Title', priority: 'high' });

      expect(res.status).toBe(200);
      expect(res.body.title).toBe('New Updated Title');
      expect(res.body.priority).toBe('high');
    });

    // edge case 1: task id does not exist -> should be 404
    test('returns 404 when task id is not found', async () => {
      const res = await request(app)
        .put('/tasks/non-existent-uuid')
        .send({ title: 'Some Title' });

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Task not found');
    });

    // edge case 2: updating with empty title
    test('returns 400 when updating with empty title', async () => {
      const created = taskService.create({ title: 'Good Title' });

      const res = await request(app)
        .put(`/tasks/${created.id}`)
        .send({ title: '' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('title must be a non-empty string');
    });

    // edge case 3: updating with invalid status
    test('returns 400 when updating with invalid status', async () => {
      const created = taskService.create({ title: 'Good Title' });

      const res = await request(app)
        .put(`/tasks/${created.id}`)
        .send({ status: 'invalid_status' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('status must be one of');
    });
  });

  // ==========================================
  // 5. DELETE /tasks/:id endpoint
  // ==========================================
  describe('DELETE /tasks/:id', () => {
    // happy path: delete existing task
    test('deletes task and returns 204 No Content', async () => {
      const created = taskService.create({ title: 'Delete me' });

      const res = await request(app).delete(`/tasks/${created.id}`);
      expect(res.status).toBe(204);
      expect(res.body).toEqual({}); // 204 has no body

      // confirm it is deleted
      expect(taskService.findById(created.id)).toBeUndefined();
    });

    // edge case: deleting task that does not exist
    test('returns 404 when deleting non-existent task', async () => {
      const res = await request(app).delete('/tasks/fake-id-1234');
      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Task not found');
    });
  });

  // ==========================================
  // 6. PATCH /tasks/:id/complete endpoint
  // ==========================================
  describe('PATCH /tasks/:id/complete', () => {
    // happy path: mark complete
    test('marks task as done with completedAt timestamp', async () => {
      const created = taskService.create({ title: 'Complete me', status: 'todo' });

      const res = await request(app).patch(`/tasks/${created.id}/complete`);
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('done');
      expect(res.body.completedAt).toBeDefined();
      // NOTE FOR DAY 2: In completeTask, priority gets hardcoded to 'medium'.
    });

    // edge case: completing non-existent task
    test('returns 404 when completing non-existent task', async () => {
      const res = await request(app).patch('/tasks/non-existent-id/complete');
      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Task not found');
    });
  });
});
