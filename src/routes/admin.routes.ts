import { FastifyInstance } from 'fastify';
import settingsService from '../services/settings.service';
import dataService from '../services/data.service';
import { aqiEvents } from '../app';

// Simple auth using environment variables
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'changeme123';

function checkAuth(request: any, reply: any): boolean {
  const authHeader = request.headers['x-admin-auth'];

  if (!authHeader) {
    reply.status(401).send({ error: 'Unauthorized', message: 'Missing authentication' });
    return false;
  }

  try {
    const credentials = Buffer.from(authHeader, 'base64').toString('utf-8');
    const [username, password] = credentials.split(':');

    if (username !== ADMIN_USERNAME || password !== ADMIN_PASSWORD) {
      reply.status(401).send({ error: 'Unauthorized', message: 'Invalid credentials' });
      return false;
    }

    return true;
  } catch {
    reply.status(401).send({ error: 'Unauthorized', message: 'Invalid auth format' });
    return false;
  }
}

const adminRoutes = async (fastify: FastifyInstance) => {
  // Login endpoint - validates credentials
  fastify.post('/login', async (request, reply) => {
    const body = request.body as { username?: string; password?: string };

    if (!body.username || !body.password) {
      return reply.status(400).send({ success: false, error: 'Username and password required' });
    }

    if (body.username === ADMIN_USERNAME && body.password === ADMIN_PASSWORD) {
      // Return base64 encoded credentials for future requests
      const token = Buffer.from(`${body.username}:${body.password}`).toString('base64');
      return reply.send({ success: true, token });
    }

    return reply.status(401).send({ success: false, error: 'Invalid credentials' });
  });

  // Get current override settings
  fastify.get('/settings', async (request, reply) => {
    if (!checkAuth(request, reply)) return;
    return reply.send({ success: true, data: settingsService.getOverrides() });
  });

  // Update override settings
  fastify.post('/settings', async (request, reply) => {
    if (!checkAuth(request, reply)) return;

    const body = request.body as any;
    settingsService.setOverrides(body);

    // Emit SSE event with updated data so menubar app updates instantly
    try {
      const latestData = await dataService.getLatestData('Tashkent', 1);
      if (latestData.length > 0) {
        const updatedData = settingsService.applyOverrides(latestData[0]);
        aqiEvents.emit('newData', updatedData);
      }
    } catch (err) {
      // Ignore errors, SSE update is optional
    }

    return reply.send({ success: true, data: settingsService.getOverrides() });
  });

  // Clear all overrides
  fastify.delete('/settings', async (request, reply) => {
    if (!checkAuth(request, reply)) return;

    settingsService.clearOverrides();

    // Emit SSE event with real data (no overrides)
    try {
      const latestData = await dataService.getLatestData('Tashkent', 1);
      if (latestData.length > 0) {
        aqiEvents.emit('newData', latestData[0]);
      }
    } catch (err) {
      // Ignore errors
    }

    return reply.send({ success: true, message: 'Overrides cleared' });
  });
};

export default adminRoutes;
