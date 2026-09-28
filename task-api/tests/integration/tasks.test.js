const request = require('supertest');
const app = require('../../src/app');
const taskService = require('../../src/services/taskService');

describe('Tasks API Integration Tests', () => {
  beforeEach(() => {
    taskService._reset();
  });

  describe('GET /tasks', () => {
    test('returns empty array when no tasks exist', async () => {
      const res = await request(app).get('/tasks');
      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    test('returns list of tasks', async () => {
      taskService.create({ title: 'Task 1' });
      taskService.create({ title: 'Task 2' });

      const res = await request(app).get('/tasks');
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
      expect(res.body[0].title).toBe('Task 1');
      expect(res.body[1].title).toBe('Task 2');
    });

    test('filters tasks by status', async () => {
      taskService.create({ title: 'Task 1', status: 'todo' });
      taskService.create({ title: 'Task 2', status: 'in_progress' });
      taskService.create({ title: 'Task 3', status: 'done' });

      const res = await request(app).get('/tasks?status=todo');
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].status).toBe('todo');
    });

    test('paginates tasks correctly', async () => {
      taskService.create({ title: 'Task 1' });
      taskService.create({ title: 'Task 2' });
      taskService.create({ title: 'Task 3' });

      const res = await request(app).get('/tasks?page=1&limit=2');
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
      expect(res.body[0].title).toBe('Task 1');
      expect(res.body[1].title).toBe('Task 2');

      const resPage2 = await request(app).get('/tasks?page=2&limit=2');
      expect(resPage2.status).toBe(200);
      expect(resPage2.body).toHaveLength(1);
      expect(resPage2.body[0].title).toBe('Task 3');
    });

    test('edge case: invalid pagination params fall back to defaults or safe bounds', async () => {
      taskService.create({ title: 'Task 1' });

      const res = await request(app).get('/tasks?page=abc&limit=xyz');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe('GET /tasks/stats', () => {
    test('returns correct counts for tasks and overdue status', async () => {
      const pastDate = new Date(Date.now() - 3600000).toISOString();
      const futureDate = new Date(Date.now() + 3600000).toISOString();

      taskService.create({ title: 'Overdue Task', status: 'todo', dueDate: pastDate });
      taskService.create({ title: 'Active Task', status: 'in_progress', dueDate: futureDate });
      taskService.create({ title: 'Done Task', status: 'done', dueDate: pastDate });

      const res = await request(app).get('/tasks/stats');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        todo: 1,
        in_progress: 1,
        done: 1,
        overdue: 1,
      });
    });

    test('returns zero stats when collection is empty', async () => {
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

  describe('POST /tasks', () => {
    test('creates a new task with minimal valid payload', async () => {
      const res = await request(app)
        .post('/tasks')
        .send({ title: 'New Task' });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body.title).toBe('New Task');
      expect(res.body.status).toBe('todo');
      expect(res.body.priority).toBe('medium');
    });

    test('creates a task with full valid payload', async () => {
      const payload = {
        title: 'Full Task',
        description: 'Complete with all properties',
        status: 'in_progress',
        priority: 'high',
        dueDate: '2026-11-15T12:00:00.000Z',
      };

      const res = await request(app)
        .post('/tasks')
        .send(payload);

      expect(res.status).toBe(201);
      expect(res.body.title).toBe(payload.title);
      expect(res.body.description).toBe(payload.description);
      expect(res.body.status).toBe(payload.status);
      expect(res.body.priority).toBe(payload.priority);
      expect(res.body.dueDate).toBe(payload.dueDate);
      expect(res.body.completedAt).toBeNull();
    });

    test('edge case: rejects creation when title is missing', async () => {
      const res = await request(app)
        .post('/tasks')
        .send({ description: 'No title provided' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('title is required');
    });

    test('edge case: rejects creation when title is empty or whitespace', async () => {
      const res = await request(app)
        .post('/tasks')
        .send({ title: '   ' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('title is required');
    });

    test('edge case: rejects creation with invalid status', async () => {
      const res = await request(app)
        .post('/tasks')
        .send({ title: 'Task', status: 'not_a_status' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('status must be one of');
    });

    test('edge case: rejects creation with invalid priority', async () => {
      const res = await request(app)
        .post('/tasks')
        .send({ title: 'Task', priority: 'ultra-high' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('priority must be one of');
    });

    test('edge case: rejects creation with invalid dueDate', async () => {
      const res = await request(app)
        .post('/tasks')
        .send({ title: 'Task', dueDate: 'invalid-iso-date' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('dueDate must be a valid ISO date string');
    });
  });

  describe('PUT /tasks/:id', () => {
    test('updates an existing task', async () => {
      const created = taskService.create({ title: 'Initial Title', priority: 'low' });

      const res = await request(app)
        .put(`/tasks/${created.id}`)
        .send({ title: 'Updated Title', priority: 'high' });

      expect(res.status).toBe(200);
      expect(res.body.title).toBe('Updated Title');
      expect(res.body.priority).toBe('high');
    });

    test('returns 404 when updating non-existent task id', async () => {
      const res = await request(app)
        .put('/tasks/non-existent-id')
        .send({ title: 'Does not exist' });

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Task not found');
    });

    test('edge case: rejects update with invalid fields', async () => {
      const created = taskService.create({ title: 'Test Task' });

      const res = await request(app)
        .put(`/tasks/${created.id}`)
        .send({ status: 'invalid_status' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('status must be one of');
    });

    test('edge case: rejects update with empty title', async () => {
      const created = taskService.create({ title: 'Test Task' });

      const res = await request(app)
        .put(`/tasks/${created.id}`)
        .send({ title: '  ' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('title must be a non-empty string');
    });
  });

  describe('DELETE /tasks/:id', () => {
    test('deletes an existing task and returns 204', async () => {
      const created = taskService.create({ title: 'Delete Me' });

      const res = await request(app).delete(`/tasks/${created.id}`);
      expect(res.status).toBe(204);
      expect(res.body).toEqual({});

      expect(taskService.findById(created.id)).toBeUndefined();
    });

    test('edge case: returns 404 when deleting non-existent task', async () => {
      const res = await request(app).delete('/tasks/00000000-0000-0000-0000-000000000000');
      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Task not found');
    });
  });

  describe('PATCH /tasks/:id/complete', () => {
    test('marks task as completed, setting status to done and preserving priority', async () => {
      const created = taskService.create({ title: 'Complete Me', priority: 'high', status: 'todo' });

      const res = await request(app).patch(`/tasks/${created.id}/complete`);
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('done');
      expect(res.body.completedAt).toBeDefined();
      expect(res.body.priority).toBe('high');
    });

    test('edge case: returns 404 when completing non-existent task', async () => {
      const res = await request(app).patch('/tasks/non-existent-id/complete');
      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Task not found');
    });
  });

  describe('PATCH /tasks/:id/assign', () => {
    test('assigns task to a user', async () => {
      const created = taskService.create({ title: 'Task to assign' });

      const res = await request(app)
        .patch(`/tasks/${created.id}/assign`)
        .send({ assignee: 'Jane Doe' });

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(created.id);
      expect(res.body.assignee).toBe('Jane Doe');
    });

    test('reassigns task when already assigned', async () => {
      const created = taskService.create({ title: 'Task already assigned', assignee: 'Old Assignee' });

      const res = await request(app)
        .patch(`/tasks/${created.id}/assign`)
        .send({ assignee: 'New Assignee' });

      expect(res.status).toBe(200);
      expect(res.body.assignee).toBe('New Assignee');
    });

    test('edge case: returns 404 when assigning non-existent task', async () => {
      const res = await request(app)
        .patch('/tasks/non-existent-id/assign')
        .send({ assignee: 'Jane Doe' });

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Task not found');
    });

    test('edge case: returns 400 when assignee is missing', async () => {
      const created = taskService.create({ title: 'Task' });

      const res = await request(app)
        .patch(`/tasks/${created.id}/assign`)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('assignee is required and must be a non-empty string');
    });

    test('edge case: returns 400 when assignee is empty or whitespace', async () => {
      const created = taskService.create({ title: 'Task' });

      const resEmpty = await request(app)
        .patch(`/tasks/${created.id}/assign`)
        .send({ assignee: '' });
      expect(resEmpty.status).toBe(400);
      expect(resEmpty.body.error).toBe('assignee is required and must be a non-empty string');

      const resWhitespace = await request(app)
        .patch(`/tasks/${created.id}/assign`)
        .send({ assignee: '   ' });
      expect(resWhitespace.status).toBe(400);
      expect(resWhitespace.body.error).toBe('assignee is required and must be a non-empty string');
    });

    test('edge case: returns 400 when assignee is not a string', async () => {
      const created = taskService.create({ title: 'Task' });

      const res = await request(app)
        .patch(`/tasks/${created.id}/assign`)
        .send({ assignee: 12345 });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('assignee is required and must be a non-empty string');
    });
  });

  describe('GET /tasks/:id', () => {
    test('returns task by id', async () => {
      const created = taskService.create({ title: 'Find Me' });

      const res = await request(app).get(`/tasks/${created.id}`);
      expect(res.status).toBe(200);
      expect(res.body.id).toBe(created.id);
      expect(res.body.title).toBe('Find Me');
    });

    test('returns 404 when task not found', async () => {
      const res = await request(app).get('/tasks/non-existent-id');
      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Task not found');
    });
  });

  describe('Combined status filter and pagination', () => {
    test('applies both status filtering and pagination simultaneously', async () => {
      taskService.create({ title: 'T1', status: 'todo' });
      taskService.create({ title: 'T2', status: 'todo' });
      taskService.create({ title: 'T3', status: 'in_progress' });
      taskService.create({ title: 'T4', status: 'todo' });

      const res = await request(app).get('/tasks?status=todo&page=1&limit=2');
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
      expect(res.body[0].title).toBe('T1');
      expect(res.body[1].title).toBe('T2');

      const resPage2 = await request(app).get('/tasks?status=todo&page=2&limit=2');
      expect(resPage2.status).toBe(200);
      expect(resPage2.body).toHaveLength(1);
      expect(resPage2.body[0].title).toBe('T4');
    });
  });

  describe('Health check and undefined routes', () => {
    test('GET /health returns 200 with status healthy and uptime', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('healthy');
      expect(res.body).toHaveProperty('timestamp');
      expect(res.body).toHaveProperty('uptime');
    });

    test('returns 404 for undefined routes', async () => {
      const res = await request(app).get('/non-existent-route');
      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Endpoint not found');
    });
  });

  describe('Internal Server Error middleware', () => {
    test('catches unhandled exceptions and returns 500 status', async () => {
      const getAllSpy = jest.spyOn(taskService, 'getAll').mockImplementationOnce(() => {
        throw new Error('Simulated unexpected failure');
      });
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      const res = await request(app).get('/tasks');
      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Internal server error');

      getAllSpy.mockRestore();
      consoleSpy.mockRestore();
    });
  });
});


