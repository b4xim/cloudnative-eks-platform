const request = require('supertest');

// Mock pg
jest.mock('pg', () => {
  const mockPool = {
    query: jest.fn(async (text) => {
      if (text.trim() === 'SELECT 1') {
        return { rows: [{ '?column?': 1 }] };
      }
      if (text.includes('CREATE TABLE')) {
        return { rows: [] };
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

const app = require('../../src/app');

describe('Health & Readiness Endpoints', () => {
  // -------------------------------------------------------------------------
  // GET /health — Liveness probe
  // -------------------------------------------------------------------------
  describe('GET /health', () => {
    test('should return 200 with status ok', async () => {
      const res = await request(app).get('/health');

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
      expect(res.body.timestamp).toBeDefined();
    });

    test('should always return 200 regardless of dependencies', async () => {
      // Liveness should always succeed if the process is running
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
    });
  });

  // -------------------------------------------------------------------------
  // GET /ready — Readiness probe
  // -------------------------------------------------------------------------
  describe('GET /ready', () => {
    test('should return 200 when PostgreSQL is available', async () => {
      const res = await request(app).get('/ready');

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ready');
      expect(res.body.checks).toBeDefined();
      expect(res.body.checks.postgres).toBe(true);
      expect(res.body.timestamp).toBeDefined();
    });

    test('should include redis check status', async () => {
      const res = await request(app).get('/ready');

      expect(res.body.checks).toHaveProperty('redis');
    });

    test('should return 503 when PostgreSQL is down', async () => {
      // Override the mock to simulate PostgreSQL failure
      const { Pool } = require('pg');
      const mockInstance = Pool.mock.results[0].value;
      const originalQuery = mockInstance.query;

      mockInstance.query.mockImplementationOnce(async (text) => {
        if (text.trim() === 'SELECT 1') {
          throw new Error('Connection refused');
        }
        return originalQuery(text);
      });

      const res = await request(app).get('/ready');

      expect(res.status).toBe(503);
      expect(res.body.status).toBe('not_ready');
      expect(res.body.checks.postgres).toBe(false);
    });
  });
});
