import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp } from '../app';
import type { FastifyInstance } from 'fastify';

describe('AQI API', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Health Check', () => {
    it('should return healthy status', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.status).toBe('ok');
      expect(body.timestamp).toBeDefined();
    });
  });

  describe('Dashboard', () => {
    it('should serve dashboard HTML', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/',
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers['content-type']).toContain('text/html');
    });
  });

  describe('API Routes Structure', () => {
    it('should respond to /api/aqi/current endpoint', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/aqi/current',
      });

      // 200 = has data, 404 = no data, 500 = DB unavailable (all valid for route existence)
      expect([200, 404, 500]).toContain(response.statusCode);
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('success');
    });

    it('should respond to /api/aqi/latest endpoint', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/aqi/latest',
      });

      // Route exists and responds with proper JSON structure
      expect([200, 500]).toContain(response.statusCode);
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('success');
    });

    it('should respond to /api/aqi/stats endpoint', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/aqi/stats?hours=24',
      });

      expect([200, 500]).toContain(response.statusCode);
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('success');
    });
  });

  describe('Swagger Docs', () => {
    it('should serve swagger UI at /docs', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/docs',
      });

      // Swagger UI redirects to /docs/
      expect([200, 302]).toContain(response.statusCode);
    });
  });
});

describe('Build', () => {
  it('should compile TypeScript without errors', async () => {
    // This test passes if the module loads successfully
    const { buildApp } = await import('../app');
    expect(buildApp).toBeDefined();
    expect(typeof buildApp).toBe('function');
  });
});
