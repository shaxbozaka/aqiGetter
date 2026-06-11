import Fastify from 'fastify';
import cors from '@fastify/cors';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import fastifyStatic from '@fastify/static';
import path from 'path';
import fs from 'fs';
import aqiRoutes from './routes/aqi.routes';
import adminRoutes from './routes/admin.routes';
import dataService from './services/data.service';
import { buildOgTags, injectOgTags, renderOgImage, rowToOgData, OgData } from './services/og.service';
import { EventEmitter } from 'events';

// Global event emitter for SSE
export const aqiEvents = new EventEmitter();
aqiEvents.setMaxListeners(100); // Allow many concurrent clients

export async function buildApp() {
  const app = Fastify({
    logger: {
      level: process.env.LOG_LEVEL || 'info',
      transport: {
        target: 'pino-pretty',
        options: {
          translateTime: 'HH:MM:ss Z',
          ignore: 'pid,hostname',
        },
      },
    },
  });

  // Register CORS
  await app.register(cors, {
    origin: true,
  });

  // Register static files
  await app.register(fastifyStatic, {
    root: path.join(__dirname, '../public'),
    prefix: '/',
  });

  // Register Swagger
  await app.register(swagger, {
    openapi: {
      info: {
        title: 'AQI Data API',
        description: 'Air Quality Index data from IQAir for Tashkent',
        version: '1.0.0',
      },
      servers: [
        {
          url: 'http://localhost:3000',
          description: 'Development server',
        },
      ],
    },
  });

  await app.register(swaggerUi, {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: false,
    },
  });

  // Health check
  app.get('/health', async () => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  });

  const dashboardTemplate = fs.readFileSync(
    path.join(__dirname, '../public/dashboard.html'),
    'utf-8'
  );

  const resolveBaseUrl = (request: { headers: Record<string, unknown>; protocol: string }): string => {
    if (process.env.PUBLIC_BASE_URL) return process.env.PUBLIC_BASE_URL;
    const proto = (request.headers['x-forwarded-proto'] as string) || request.protocol;
    const host = request.headers.host as string;
    return `${proto}://${host}`;
  };

  const getCurrentOgData = async (): Promise<OgData | null> => {
    const rows = await dataService.getLatestData('Tashkent', 1);
    return rows.length > 0 ? rowToOgData(rows[0]) : null;
  };

  // Dashboard route with live Open Graph tags for link previews (Telegram, etc.)
  app.get('/', async (request, reply) => {
    reply.header('Cache-Control', 'public, max-age=300');
    reply.type('text/html');

    try {
      const ogData = await getCurrentOgData();
      if (ogData) {
        const tags = buildOgTags(ogData, resolveBaseUrl(request));
        return reply.send(injectOgTags(dashboardTemplate, tags));
      }
    } catch (error) {
      app.log.error(error, 'Failed to build OG tags, serving plain dashboard');
    }
    return reply.send(dashboardTemplate);
  });

  // Open Graph preview image (1200x630 PNG with current AQI)
  app.get('/og-image.png', async (request, reply) => {
    try {
      const ogData = await getCurrentOgData();
      if (!ogData) {
        return reply.status(404).send({ success: false, error: 'No data found' });
      }
      reply.header('Cache-Control', 'public, max-age=300');
      reply.type('image/png');
      return reply.send(renderOgImage(ogData));
    } catch (error) {
      app.log.error(error, 'Failed to render OG image');
      return reply.status(500).send({ success: false, error: 'Failed to render image' });
    }
  });

  // Admin panel route
  app.get('/admin', async (request, reply) => {
    return reply.sendFile('admin.html');
  });

  // Register routes
  await app.register(aqiRoutes, { prefix: '/api' });
  await app.register(adminRoutes, { prefix: '/api/admin' });

  // SSE endpoint for real-time updates
  app.get('/api/aqi/stream', async (request, reply) => {
    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    });

    // Send initial heartbeat
    reply.raw.write('event: connected\ndata: {"status":"connected"}\n\n');

    // Listen for new data events
    const onNewData = (data: any) => {
      reply.raw.write(`event: update\ndata: ${JSON.stringify(data)}\n\n`);
    };

    aqiEvents.on('newData', onNewData);

    // Keep connection alive with heartbeat every 30 seconds
    const heartbeat = setInterval(() => {
      reply.raw.write('event: heartbeat\ndata: {"time":"' + new Date().toISOString() + '"}\n\n');
    }, 30000);

    // Clean up on disconnect
    request.raw.on('close', () => {
      aqiEvents.off('newData', onNewData);
      clearInterval(heartbeat);
    });
  });

  return app;
}
