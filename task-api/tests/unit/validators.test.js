// importing the validator functions to test them directly
const { validateCreateTask, validateUpdateTask } = require('../../src/utils/validators');

describe('Validators Unit Tests', () => {
  // 1. testing validateCreateTask
  describe('validateCreateTask', () => {
    // happy path test: simple task with just title
    test('passes when valid title is provided', () => {
      const error = validateCreateTask({ title: 'Finish homework' });
      expect(error).toBeNull(); // should have no error
    });

    // happy path test: task with all fields filled correctly
    test('passes when all fields are valid', () => {
      const error = validateCreateTask({
        title: 'Study for interview',
        description: 'Read JavaScript concepts and practice coding',
        status: 'in_progress',
        priority: 'high',
        dueDate: '2026-10-15T10:00:00.000Z',
      });
      expect(error).toBeNull();
    });

    // edge case 1: title is missing completely
    test('fails when title is not provided in body', () => {
      const error = validateCreateTask({});
      expect(error).toBe('title is required and must be a non-empty string');
    });

    // edge case 2: title is empty string or only whitespace
    test('fails when title is empty string or spaces', () => {
      const errorEmpty = validateCreateTask({ title: '' });
      expect(errorEmpty).toBe('title is required and must be a non-empty string');

      const errorSpaces = validateCreateTask({ title: '   ' });
      expect(errorSpaces).toBe('title is required and must be a non-empty string');
    });

    // edge case 3: title is a number instead of string
    test('fails when title is not a string', () => {
      const error = validateCreateTask({ title: 12345 });
      expect(error).toBe('title is required and must be a non-empty string');
    });

    // edge case 4: invalid status
    test('fails when status is not todo, in_progress, or done', () => {
      const error = validateCreateTask({ title: 'My Task', status: 'not_valid' });
      expect(error).toBe('status must be one of: todo, in_progress, done');
    });

    // edge case 5: invalid priority
    test('fails when priority is not low, medium, or high', () => {
      const error = validateCreateTask({ title: 'My Task', priority: 'super_urgent' });
      expect(error).toBe('priority must be one of: low, medium, high');
    });

    // edge case 6: invalid due date
    test('fails when dueDate is not a valid date string', () => {
      const error = validateCreateTask({ title: 'My Task', dueDate: 'yesterday' });
      expect(error).toBe('dueDate must be a valid ISO date string');
    });
  });

  // 2. testing validateUpdateTask
  describe('validateUpdateTask', () => {
    // happy path: updating with empty body is allowed (no fields to change)
    test('passes when update body is empty object', () => {
      const error = validateUpdateTask({});
      expect(error).toBeNull();
    });

    // happy path: valid update
    test('passes when updating valid title and status', () => {
      const error = validateUpdateTask({ title: 'Updated name', status: 'done' });
      expect(error).toBeNull();
    });

    // edge case 1: title provided but it is empty
    test('fails when title is empty string or spaces', () => {
      expect(validateUpdateTask({ title: '' })).toBe('title must be a non-empty string');
      expect(validateUpdateTask({ title: '   ' })).toBe('title must be a non-empty string');
    });

    // edge case 2: invalid status on update
    test('fails when status is invalid', () => {
      const error = validateUpdateTask({ status: 'completed' }); // completed is wrong, should be 'done'
      expect(error).toBe('status must be one of: todo, in_progress, done');
    });

    // edge case 3: invalid priority on update
    test('fails when priority is invalid', () => {
      const error = validateUpdateTask({ priority: 'highest' });
      expect(error).toBe('priority must be one of: low, medium, high');
    });

    // edge case 4: invalid date format on update
    test('fails when dueDate is not a valid date', () => {
      const error = validateUpdateTask({ dueDate: '2026-99-99' });
      expect(error).toBe('dueDate must be a valid ISO date string');
    });
  });
});
