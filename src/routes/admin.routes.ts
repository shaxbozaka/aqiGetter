import { FastifyInstance } from 'fastify';
import settingsService from '../services/settings.service';

// Simple auth middleware using environment variables
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'changeme123';

function checkAuth(request: any, reply: any): boolean {
  const authHeader = request.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Basic ')) {
    reply.status(401).header('WWW-Authenticate', 'Basic realm="Admin"').send({ error: 'Unauthorized' });
    return false;
  }

  const base64Credentials = authHeader.split(' ')[1];
  const credentials = Buffer.from(base64Credentials, 'base64').toString('utf-8');
  const [username, password] = credentials.split(':');

  if (username !== ADMIN_USERNAME || password !== ADMIN_PASSWORD) {
    reply.status(401).header('WWW-Authenticate', 'Basic realm="Admin"').send({ error: 'Invalid credentials' });
    return false;
  }

  return true;
}

const adminRoutes = async (fastify: FastifyInstance) => {
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
    return reply.send({ success: true, data: settingsService.getOverrides() });
  });

  // Clear all overrides
  fastify.delete('/settings', async (request, reply) => {
    if (!checkAuth(request, reply)) return;

    settingsService.clearOverrides();
    return reply.send({ success: true, message: 'Overrides cleared' });
  });
};

export default adminRoutes;
