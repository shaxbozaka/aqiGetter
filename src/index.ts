import cron from 'node-cron';
import dotenv from 'dotenv';
import { fetchAndSaveAirQuality } from './jobs/aqiFetcher';
import pool from './database/db';

dotenv.config();

async function initializeDatabase(): Promise<void> {
  console.log('Checking database connection...');
  try {
    await pool.query('SELECT NOW()');
    console.log('✓ Database connected successfully');
  } catch (error) {
    console.error('✗ Database connection failed:', error);
    process.exit(1);
  }
}

async function main(): Promise<void> {
  console.log('=================================');
  console.log('   AQI Data Fetcher Started');
  console.log('=================================');
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Target City: Tashkent, Uzbekistan`);
  console.log('=================================\n');

  await initializeDatabase();

  // Run immediately on startup
  console.log('Running initial data fetch...');
  await fetchAndSaveAirQuality();

  // Schedule to run every 12 minutes (5 times per hour)
  // Cron expression: */12 * * * * means "every 12 minutes"
  const cronSchedule = '*/12 * * * *';

  console.log(`\nScheduling cron job: ${cronSchedule}`);
  console.log('This will run 5 times per hour (every 12 minutes)\n');

  cron.schedule(cronSchedule, async () => {
    await fetchAndSaveAirQuality();
  });

  console.log('✓ Cron job scheduled successfully');
  console.log('Service is now running. Press Ctrl+C to stop.\n');
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n\nShutting down gracefully...');
  await pool.end();
  console.log('✓ Database connections closed');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n\nShutting down gracefully...');
  await pool.end();
  console.log('✓ Database connections closed');
  process.exit(0);
});

// Start the application
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
