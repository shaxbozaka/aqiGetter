# AQI Data Fetcher

A production-ready Fastify API service that automatically fetches air quality data from IQAir API for Tashkent, Uzbekistan and stores it in a PostgreSQL database. The service runs a cron job that fetches data 5 times per hour (every 12 minutes) and provides REST API endpoints for querying the data.

## Features

- **Fastify REST API** with Swagger documentation
- **Automated Data Collection** - Fetches real-time air quality data every 12 minutes
- **PostgreSQL Storage** with proper indexing and constraints
- **Docker Support** - Full containerization with Docker Compose
- **TypeScript** - Full type safety and modern ES2020 features
- **Production Ready** - Health checks, graceful shutdown, structured logging
- **API Endpoints** - Query current AQI, statistics, historical data, and more

## Quick Start with Docker (Recommended)

The easiest way to get started is using Docker:

```bash
# Start all services (PostgreSQL + API)
docker-compose up -d

# View logs
docker-compose logs -f app

# Stop services
docker-compose down
```

That's it! The API will be available at http://localhost:3000 and Swagger docs at http://localhost:3000/docs

## Prerequisites

1. Clone the repository:
```bash
cd /Users/shaxbozaka/projects/aqiGetter
```

2. Install dependencies:
```bash
npm install
```

3. Set up PostgreSQL database:
```bash
# Create database
createdb aqi_db

# Initialize schema
psql -U postgres -d aqi_db -f src/database/schema.sql
```

4. Configure environment variables:
```bash
cp .env.example .env
# Edit .env with your database credentials
```

The `.env` file is already configured with your IQAir API key.

## Database Schema

The application creates a table `air_quality_data` with the following fields:

- Air Quality Index (US EPA standard)
- Weather data (temperature, humidity, pressure, wind)
- Pollutant concentrations (PM2.5, PM10, NO2, SO2, O3, CO)
- Location coordinates
- Raw API response (JSONB)
- Timestamp with timezone

## Usage

### Development Mode
Run the service in development mode with auto-reload:
```bash
npm run dev
```

### Production Mode
Build and run the compiled version:
```bash
npm run build
npm start
```

### Other Commands
```bash
npm run clean      # Remove build files
npm run rebuild    # Clean and rebuild
```

## How It Works

1. **Startup**: The service connects to the database and runs an initial data fetch
2. **Cron Schedule**: Sets up a cron job with pattern `*/12 * * * *` (every 12 minutes)
3. **Data Fetch**: Calls IQAir API to get current air quality data for Tashkent
4. **Data Storage**: Saves the data to PostgreSQL with conflict handling
5. **Logging**: Outputs status information and AQI values to console

## Data Structure

The service fetches and stores:
- **AQI Value**: Air Quality Index (US EPA standard)
- **Main Pollutant**: Primary pollutant affecting air quality
- **Weather**: Temperature, humidity, pressure, wind speed/direction
- **Pollutants**: PM2.5, PM10, NO2, SO2, O3, CO concentrations
- **Location**: Latitude and longitude
- **Timestamp**: When the data was collected

## API Endpoints

This is a background service and doesn't expose any HTTP endpoints. To query the data, you can:

1. Connect directly to the PostgreSQL database
2. Use the DataService methods in your own application
3. Query examples:

```sql
-- Get latest 10 readings
SELECT * FROM air_quality_data
WHERE city = 'Tashkent'
ORDER BY timestamp DESC
LIMIT 10;

-- Get average AQI for last 24 hours
SELECT AVG(aqi_us) as avg_aqi,
       MAX(aqi_us) as max_aqi,
       MIN(aqi_us) as min_aqi
FROM air_quality_data
WHERE city = 'Tashkent'
  AND timestamp >= NOW() - INTERVAL '24 hours';
```

## Data Service Methods

The application includes helper methods in `DataService`:

- `getLatestData(city, limit)` - Get recent readings
- `getDataByDateRange(city, startDate, endDate)` - Get data for date range
- `getAverageAQI(city, hours)` - Calculate average AQI

## Error Handling

- Database connection failures will cause the service to exit
- API call failures are logged but don't stop the service
- Duplicate data is handled with conflict resolution
- Graceful shutdown on SIGINT/SIGTERM

## Project Structure

```
aqiGetter/
├── src/
│   ├── database/
│   │   ├── db.ts              # Database connection
│   │   └── schema.sql         # Database schema
│   ├── jobs/
│   │   └── aqiFetcher.ts      # Data fetching job
│   ├── services/
│   │   ├── iqair.service.ts   # IQAir API client
│   │   └── data.service.ts    # Database operations
│   ├── types/
│   │   └── iqair.ts           # TypeScript types
│   └── index.ts               # Main application
├── .env                       # Environment variables
├── .env.example              # Environment template
├── package.json
├── tsconfig.json
└── README.md
```

## Environment Variables

- `IQAIR_API_KEY` - Your IQAir API key (pre-configured)
- `DB_HOST` - PostgreSQL host (default: localhost)
- `DB_PORT` - PostgreSQL port (default: 5432)
- `DB_NAME` - Database name (default: aqi_db)
- `DB_USER` - Database user (default: postgres)
- `DB_PASSWORD` - Database password
- `NODE_ENV` - Environment (development/production)

## License

ISC

## Resources

- [IQAir API Documentation](https://api-docs.iqair.com/)
- [IQAir Knowledge Base](https://www.iqair.com/support/knowledge-base/KA-04891-INTL)
