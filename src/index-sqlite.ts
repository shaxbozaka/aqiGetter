import cron from 'node-cron';
import dotenv from 'dotenv';
import { fetchAndSaveAirQuality } from './jobs/aqiFetcher-sqlite';

dotenv.config();

async function main(): Promise<void> {
  console.log('=================================');
  console.log('   AQI Data Fetcher Started');
  console.log('=================================');
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Target City: Tashkent, Uzbekistan`);
  console.log(`Database: SQLite`);
  console.log('=================================\n');

  // Run immediately on startup
  console.log('Running initial data fetch...');
  await fetchAndSaveAirQuality();

  // Schedule to run every 12 minutes (5 times per hour)
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
process.on('SIGINT', () => {
  console.log('\n\nShutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n\nShutting down gracefully...');
  process.exit(0);
});

// Start the application
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
