const request = require('supertest');

// ---------------------------------------------------------------------------
// Mock PostgreSQL and Redis before requiring the app
// ---------------------------------------------------------------------------

// In-memory task store for testing — prefixed with 'mock' per Jest convention
let mockTaskStore = [];
let mockIdCounter = 0;

function mockMakeId() {
  mockIdCounter += 1;
  return `test-uuid-${mockIdCounter}`;
}

// Mock pg
jest.mock('pg', () => {
  const mockPool = {
    query: jest.fn(async (text, values) => {
      // CREATE TABLE
      if (text.includes('CREATE TABLE')) {
        return { rows: [] };
      }

      // SELECT 1 (health check)
      if (text.trim() === 'SELECT 1') {
        return { rows: [{ '?column?': 1 }] };
      }

      // INSERT
      if (text.includes('INSERT INTO tasks')) {
        const task = {
          id: mockMakeId(),
          title: values[0],
          description: values[1],
          status: values[2] || 'todo',
          priority: values[3] || 'medium',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        mockTaskStore.push(task);
        return { rows: [task] };
      }

      // SELECT * FROM tasks WHERE id = $1
      if (text.includes('WHERE id = $1') && !text.includes('UPDATE') && !text.includes('DELETE')) {
        const task = mockTaskStore.find((t) => t.id === values[0]);
        return { rows: task ? [task] : [] };
      }

      // DELETE FROM tasks WHERE id = $1
      if (text.includes('DELETE FROM tasks WHERE id = $1')) {
        const idx = mockTaskStore.findIndex((t) => t.id === values[0]);
        if (idx >= 0) {
          const deleted = mockTaskStore.splice(idx, 1)[0];
          return { rows: [{ id: deleted.id }] };
        }
        return { rows: [] };
      }

      // UPDATE tasks
      if (text.includes('UPDATE tasks SET')) {
        const id = values[values.length - 1];
        const task = mockTaskStore.find((t) => t.id === id);
        if (!task) return { rows: [] };

        // Parse the set fields from the query — simplified for testing
        // We look at the values array; the last value is the id.
        const setValues = values.slice(0, -1);
        const setClauses = text.match(/SET\s+(.*?)\s+WHERE/s)[1];
        const fieldNames = setClauses.split(',').map((c) => c.trim().split(/\s*=\s*/)[0]);
        
        fieldNames.forEach((field, i) => {
          if (field === 'updated_at') return;
          if (i < setValues.length) {
            task[field] = setValues[i];
          }
        });
        task.updated_at = new Date().toISOString();

        return { rows: [task] };
      }

      // SELECT * FROM tasks (with optional WHERE)
      if (text.includes('SELECT * FROM tasks')) {
        let results = [...mockTaskStore];

        // Apply filters
        if (values && values.length > 0) {
          if (text.includes('status = $')) {
            results = results.filter((t) => t.status === values[0]);
          }
          if (text.includes('priority = $')) {
            const priorityIdx = values.length - 1;
            results = results.filter((t) => t.priority === values[priorityIdx]);
          }
        }

        return { rows: results };
      }

      return { rows: [] };
    }),
    connect: jest.fn(async () => ({
      query: jest.fn(async () => ({ rows: [] })),
      release: jest.fn(),
    })),
    end: jest.fn(),
    on: jest.fn(),
  };

  return { Pool: jest.fn(() => mockPool) };
});

// Mock redis
jest.mock('redis', () => ({
  createClient: jest.fn(() => ({
    connect: jest.fn(),
    quit: jest.fn(),
    get: jest.fn(async () => null),
    set: jest.fn(),
    del: jest.fn(),
    keys: jest.fn(async () => []),
    ping: jest.fn(async () => 'PONG'),
    on: jest.fn(),
  })),
}));

// Now require the app
const app = require('../../src/app');

describe('Task API — Integration Tests', () => {
  beforeEach(() => {
    mockTaskStore = [];
    mockIdCounter = 0;
  });

  // -------------------------------------------------------------------------
  // POST /api/tasks
  // -------------------------------------------------------------------------
  describe('POST /api/tasks', () => {
    test('should create a task with valid data', async () => {
      const res = await request(app)
        .post('/api/tasks')
        .send({ title: 'Deploy app', description: 'To production', status: 'todo', priority: 'high' });

      expect(res.status).toBe(201);
      expect(res.body.data).toHaveProperty('id');
      expect(res.body.data.title).toBe('Deploy app');
      expect(res.body.data.status).toBe('todo');
      expect(res.body.data.priority).toBe('high');
    });

    test('should create a task with defaults', async () => {
      const res = await request(app)
        .post('/api/tasks')
        .send({ title: 'Minimal task' });

      expect(res.status).toBe(201);
      expect(res.body.data.status).toBe('todo');
      expect(res.body.data.priority).toBe('medium');
    });

    test('should return 400 when title is missing', async () => {
      const res = await request(app)
        .post('/api/tasks')
        .send({ description: 'No title' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
      expect(res.body.error.details).toBeDefined();
    });

    test('should return 400 for invalid status', async () => {
      const res = await request(app)
        .post('/api/tasks')
        .send({ title: 'Test', status: 'invalid' });

      expect(res.status).toBe(400);
    });

    test('should return 400 for invalid priority', async () => {
      const res = await request(app)
        .post('/api/tasks')
        .send({ title: 'Test', priority: 'urgent' });

      expect(res.status).toBe(400);
    });
  });

  // -------------------------------------------------------------------------
  // GET /api/tasks
  // -------------------------------------------------------------------------
  describe('GET /api/tasks', () => {
    test('should return empty list initially', async () => {
      const res = await request(app).get('/api/tasks');

      expect(res.status).toBe(200);
      expect(res.body.data).toEqual([]);
      expect(res.body.count).toBe(0);
    });

    test('should return created tasks', async () => {
      await request(app).post('/api/tasks').send({ title: 'Task 1' });
      await request(app).post('/api/tasks').send({ title: 'Task 2' });

      const res = await request(app).get('/api/tasks');

      expect(res.status).toBe(200);
      expect(res.body.count).toBe(2);
    });

    test('should filter by status', async () => {
      await request(app).post('/api/tasks').send({ title: 'T1', status: 'todo' });
      await request(app).post('/api/tasks').send({ title: 'T2', status: 'done' });

      const res = await request(app).get('/api/tasks?status=done');

      expect(res.status).toBe(200);
      expect(res.body.data.every((t) => t.status === 'done')).toBe(true);
    });

    test('should filter by priority', async () => {
      await request(app).post('/api/tasks').send({ title: 'T1', priority: 'low' });
      await request(app).post('/api/tasks').send({ title: 'T2', priority: 'high' });

      const res = await request(app).get('/api/tasks?priority=high');

      expect(res.status).toBe(200);
      expect(res.body.data.every((t) => t.priority === 'high')).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // GET /api/tasks/:id
  // -------------------------------------------------------------------------
  describe('GET /api/tasks/:id', () => {
    test('should return a task by id', async () => {
      const created = await request(app)
        .post('/api/tasks')
        .send({ title: 'Find me' });

      const res = await request(app).get(`/api/tasks/${created.body.data.id}`);

      expect(res.status).toBe(200);
      expect(res.body.data.title).toBe('Find me');
    });

    test('should return 404 for non-existent task', async () => {
      const res = await request(app).get('/api/tasks/non-existent-id');

      expect(res.status).toBe(404);
    });
  });

  // -------------------------------------------------------------------------
  // PUT /api/tasks/:id
  // -------------------------------------------------------------------------
  describe('PUT /api/tasks/:id', () => {
    test('should update a task', async () => {
      const created = await request(app)
        .post('/api/tasks')
        .send({ title: 'Old title', status: 'todo' });

      const res = await request(app)
        .put(`/api/tasks/${created.body.data.id}`)
        .send({ title: 'New title', status: 'done' });

      expect(res.status).toBe(200);
      expect(res.body.data.title).toBe('New title');
      expect(res.body.data.status).toBe('done');
    });

    test('should return 404 for non-existent task', async () => {
      const res = await request(app)
        .put('/api/tasks/non-existent-id')
        .send({ title: 'Nope' });

      expect(res.status).toBe(404);
    });

    test('should return 400 for invalid status', async () => {
      const created = await request(app)
        .post('/api/tasks')
        .send({ title: 'Test' });

      const res = await request(app)
        .put(`/api/tasks/${created.body.data.id}`)
        .send({ status: 'invalid' });

      expect(res.status).toBe(400);
    });
  });

  // -------------------------------------------------------------------------
  // DELETE /api/tasks/:id
  // -------------------------------------------------------------------------
  describe('DELETE /api/tasks/:id', () => {
    test('should delete a task', async () => {
      const created = await request(app)
        .post('/api/tasks')
        .send({ title: 'Delete me' });

      const res = await request(app).delete(`/api/tasks/${created.body.data.id}`);

      expect(res.status).toBe(204);
    });

    test('should return 404 for non-existent task', async () => {
      const res = await request(app).delete('/api/tasks/non-existent-id');

      expect(res.status).toBe(404);
    });
  });

  // -------------------------------------------------------------------------
  // 404 route
  // -------------------------------------------------------------------------
  describe('Unknown routes', () => {
    test('should return 404 for unknown paths', async () => {
      const res = await request(app).get('/api/unknown');

      expect(res.status).toBe(404);
      expect(res.body.error).toBeDefined();
    });
  });
});
