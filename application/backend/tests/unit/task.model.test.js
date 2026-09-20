const { validate, VALID_STATUSES, VALID_PRIORITIES } = require('../../src/models/task');

describe('Task Model — Validation', () => {
  describe('validate() for creation (isUpdate=false)', () => {
    test('should return error when title is missing', () => {
      const errors = validate({});
      expect(errors).toContain('title is required and must be a non-empty string');
    });

    test('should return error when title is empty string', () => {
      const errors = validate({ title: '  ' });
      expect(errors).toContain('title is required and must be a non-empty string');
    });

    test('should return error when title exceeds 255 characters', () => {
      const errors = validate({ title: 'a'.repeat(256) });
      expect(errors).toContain('title must be 255 characters or fewer');
    });

    test('should return error for invalid status', () => {
      const errors = validate({ title: 'Test', status: 'invalid' });
      expect(errors.length).toBe(1);
      expect(errors[0]).toContain('status must be one of');
    });

    test('should return error for invalid priority', () => {
      const errors = validate({ title: 'Test', priority: 'urgent' });
      expect(errors.length).toBe(1);
      expect(errors[0]).toContain('priority must be one of');
    });

    test('should return no errors for valid task data', () => {
      const errors = validate({
        title: 'Deploy to staging',
        description: 'Run helm upgrade',
        status: 'todo',
        priority: 'high',
      });
      expect(errors).toHaveLength(0);
    });

    test('should return no errors when only title is provided', () => {
      const errors = validate({ title: 'Minimal task' });
      expect(errors).toHaveLength(0);
    });

    test('should return multiple errors at once', () => {
      const errors = validate({ status: 'bad', priority: 'bad' });
      expect(errors.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('validate() for update (isUpdate=true)', () => {
    test('should not require title on update', () => {
      const errors = validate({ status: 'done' }, true);
      expect(errors).toHaveLength(0);
    });

    test('should still validate status on update', () => {
      const errors = validate({ status: 'invalid' }, true);
      expect(errors.length).toBe(1);
    });

    test('should still validate priority on update', () => {
      const errors = validate({ priority: 'critical' }, true);
      expect(errors.length).toBe(1);
    });

    test('should allow empty update body', () => {
      const errors = validate({}, true);
      expect(errors).toHaveLength(0);
    });
  });

  describe('Constants', () => {
    test('VALID_STATUSES should contain expected values', () => {
      expect(VALID_STATUSES).toEqual(['todo', 'in-progress', 'done']);
    });

    test('VALID_PRIORITIES should contain expected values', () => {
      expect(VALID_PRIORITIES).toEqual(['low', 'medium', 'high']);
    });
  });
});
