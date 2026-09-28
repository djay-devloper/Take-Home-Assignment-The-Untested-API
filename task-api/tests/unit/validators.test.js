const { validateCreateTask, validateUpdateTask, validateAssignTask } = require('../../src/utils/validators');

describe('Validators Unit Tests', () => {
  describe('validateCreateTask', () => {
    test('passes for valid minimal input', () => {
      const error = validateCreateTask({ title: 'Write tests' });
      expect(error).toBeNull();
    });

    test('passes for valid input with all fields', () => {
      const error = validateCreateTask({
        title: 'Complete project',
        description: 'Detailed description',
        status: 'in_progress',
        priority: 'high',
        dueDate: '2026-10-01T00:00:00.000Z',
      });
      expect(error).toBeNull();
    });

    test('fails when title is missing', () => {
      const error = validateCreateTask({});
      expect(error).toBe('title is required and must be a non-empty string');
    });

    test('fails when title is not a string', () => {
      const error = validateCreateTask({ title: 12345 });
      expect(error).toBe('title is required and must be a non-empty string');
    });

    test('fails when title is an empty string or whitespace only', () => {
      const errorEmpty = validateCreateTask({ title: '' });
      expect(errorEmpty).toBe('title is required and must be a non-empty string');

      const errorWhitespace = validateCreateTask({ title: '   ' });
      expect(errorWhitespace).toBe('title is required and must be a non-empty string');
    });

    test('fails when status is invalid or empty string', () => {
      expect(validateCreateTask({ title: 'Task', status: 'invalid_status' }))
        .toBe('status must be one of: todo, in_progress, done');
      expect(validateCreateTask({ title: 'Task', status: '' }))
        .toBe('status must be one of: todo, in_progress, done');
    });

    test('fails when priority is invalid or empty string', () => {
      expect(validateCreateTask({ title: 'Task', priority: 'urgent' }))
        .toBe('priority must be one of: low, medium, high');
      expect(validateCreateTask({ title: 'Task', priority: '' }))
        .toBe('priority must be one of: low, medium, high');
    });

    test('fails when dueDate is not a valid date string', () => {
      const error = validateCreateTask({ title: 'Task', dueDate: 'not-a-valid-date' });
      expect(error).toBe('dueDate must be a valid ISO date string');
    });

    test('handles edge case: body is null or undefined or not an object gracefully', () => {
      expect(validateCreateTask(null)).toBe('request body must be an object');
      expect(validateCreateTask(undefined)).toBe('request body must be an object');
      expect(validateCreateTask('not an object')).toBe('request body must be an object');
    });
  });

  describe('validateUpdateTask', () => {
    test('passes for empty update object', () => {
      const error = validateUpdateTask({});
      expect(error).toBeNull();
    });

    test('passes for valid title update', () => {
      const error = validateUpdateTask({ title: 'Updated title' });
      expect(error).toBeNull();
    });

    test('passes for valid status, priority, and dueDate update', () => {
      const error = validateUpdateTask({
        status: 'done',
        priority: 'low',
        dueDate: '2026-12-31T23:59:59.999Z',
      });
      expect(error).toBeNull();
    });

    test('fails when title is non-string or empty', () => {
      expect(validateUpdateTask({ title: '' })).toBe('title must be a non-empty string');
      expect(validateUpdateTask({ title: '   ' })).toBe('title must be a non-empty string');
      expect(validateUpdateTask({ title: 999 })).toBe('title must be a non-empty string');
    });

    test('fails when status is invalid or empty string', () => {
      expect(validateUpdateTask({ status: 'completed' }))
        .toBe('status must be one of: todo, in_progress, done');
      expect(validateUpdateTask({ status: '' }))
        .toBe('status must be one of: todo, in_progress, done');
    });

    test('fails when priority is invalid or empty string', () => {
      expect(validateUpdateTask({ priority: 'critical' }))
        .toBe('priority must be one of: low, medium, high');
      expect(validateUpdateTask({ priority: '' }))
        .toBe('priority must be one of: low, medium, high');
    });

    test('fails when dueDate is an invalid date string', () => {
      const error = validateUpdateTask({ dueDate: '2026-13-45' });
      expect(error).toBe('dueDate must be a valid ISO date string');
    });

    test('handles edge case: body is null or undefined or not an object', () => {
      expect(validateUpdateTask(null)).toBe('request body must be an object');
      expect(validateUpdateTask(undefined)).toBe('request body must be an object');
    });
  });

  describe('validateAssignTask', () => {
    test('passes when valid assignee name is provided', () => {
      expect(validateAssignTask({ assignee: 'Alex Doe' })).toBeNull();
    });

    test('fails when assignee is missing', () => {
      expect(validateAssignTask({})).toBe('assignee is required and must be a non-empty string');
    });

    test('fails when assignee is empty string or only whitespace', () => {
      expect(validateAssignTask({ assignee: '' })).toBe('assignee is required and must be a non-empty string');
      expect(validateAssignTask({ assignee: '   ' })).toBe('assignee is required and must be a non-empty string');
    });

    test('fails when assignee is not a string', () => {
      expect(validateAssignTask({ assignee: 123 })).toBe('assignee is required and must be a non-empty string');
      expect(validateAssignTask({ assignee: true })).toBe('assignee is required and must be a non-empty string');
      expect(validateAssignTask({ assignee: {} })).toBe('assignee is required and must be a non-empty string');
      expect(validateAssignTask({ assignee: [] })).toBe('assignee is required and must be a non-empty string');
    });

    test('handles null or undefined body gracefully', () => {
      expect(validateAssignTask(null)).toBe('request body must be an object');
      expect(validateAssignTask(undefined)).toBe('request body must be an object');
    });
  });
});

