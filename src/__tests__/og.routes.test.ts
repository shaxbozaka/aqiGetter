import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import type { FastifyInstance } from 'fastify';

vi.mock('../services/data.service', () => ({
  default: {
    getLatestData: vi.fn().mockResolvedValue([
      {
        aqi_us: 34,
        temperature_celsius: 31,
        humidity: 22,
        wind_speed_ms: 1.94,
        city: 'Tashkent',
        country: 'Uzbekistan',
      },
    ]),
  },
}));

import { buildApp } from '../app';
import dataService from '../services/data.service';

describe('OG preview routes', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /', () => {
    it('serves the dashboard with injected OG tags', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/',
        headers: { host: 'aqi.shaxbozaka.cc', 'x-forwarded-proto': 'https' },
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers['content-type']).toContain('text/html');
      expect(response.body).toContain('og:title');
      expect(response.body).toContain('Tashkent AQI: 34 — Good');
      expect(response.body).toContain('https://aqi.shaxbozaka.cc/og-image.png?aqi=34');
      expect(response.body).toContain('summary_large_image');
      // Dashboard itself still intact
      expect(response.body).toContain('What should you do?');
    });

    it('serves the plain dashboard if data fetch fails', async () => {
      vi.mocked(dataService.getLatestData).mockRejectedValueOnce(new Error('db down'));

      const response = await app.inject({ method: 'GET', url: '/' });

      expect(response.statusCode).toBe(200);
      expect(response.body).toContain('What should you do?');
      expect(response.body).not.toContain('og:title');
    });
  });

  describe('GET /og-image.png', () => {
    it('returns a PNG image', async () => {
      const response = await app.inject({ method: 'GET', url: '/og-image.png' });

      expect(response.statusCode).toBe(200);
      expect(response.headers['content-type']).toBe('image/png');
      expect(response.rawPayload.subarray(0, 8)).toEqual(
        Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
      );
    });

    it('returns 404 when no data exists', async () => {
      vi.mocked(dataService.getLatestData).mockResolvedValueOnce([]);

      const response = await app.inject({ method: 'GET', url: '/og-image.png' });

      expect(response.statusCode).toBe(404);
    });
  });
});
