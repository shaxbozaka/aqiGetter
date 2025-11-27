import dotenv from 'dotenv';
import cron from 'node-cron';
import { buildApp } from './app';
import { fetchAndSaveAirQuality } from './jobs/aqiFetcher';
import pool from './database/db';

dotenv.config();

async function initializeDatabase(): Promise<void> {
  try {
    await pool.query('SELECT NOW()');
    console.log('✓ Database connected successfully');
  } catch (error) {
    console.error('✗ Database connection failed:', error);
    throw error;
  }
}

async function startServer() {
  try {
    // Initialize database
    await initializeDatabase();

    // Build Fastify app
    const app = await buildApp();

    // Start server
    const port = parseInt(process.env.PORT || '3000');
    const host = process.env.HOST || '0.0.0.0';

    await app.listen({ port, host });

    console.log('=================================');
    console.log('   AQI Data Fetcher Started');
    console.log('=================================');
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`API Server: http://${host}:${port}`);
    console.log(`API Docs: http://localhost:${port}/docs`);
    console.log(`Target City: Tashkent, Uzbekistan`);
    console.log('=================================\n');

    // Run initial data fetch
    console.log('Running initial data fetch...');
    await fetchAndSaveAirQuality();

    // Schedule cron job (every 12 minutes = 5 times per hour)
    const cronSchedule = '*/12 * * * *';
    console.log(`\nScheduling cron job: ${cronSchedule}`);
    console.log('This will run 5 times per hour (every 12 minutes)\n');

    cron.schedule(cronSchedule, async () => {
      await fetchAndSaveAirQuality();
    });

    console.log('✓ Cron job scheduled successfully');
    console.log('Service is now running. Press Ctrl+C to stop.\n');

    // Graceful shutdown
    const signals = ['SIGINT', 'SIGTERM'];
    signals.forEach((signal) => {
      process.on(signal, async () => {
        console.log(`\n${signal} received, shutting down gracefully...`);
        await app.close();
        await pool.end();
        console.log('✓ Server and database connections closed');
        process.exit(0);
      });
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
