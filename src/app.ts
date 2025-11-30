import Fastify from 'fastify';
import cors from '@fastify/cors';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import fastifyStatic from '@fastify/static';
import path from 'path';
import aqiRoutes from './routes/aqi.routes';
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

  // Dashboard route
  app.get('/', async (request, reply) => {
    return reply.sendFile('dashboard.html');
  });

  // Register routes
  await app.register(aqiRoutes, { prefix: '/api' });

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
