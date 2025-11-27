import Database from 'better-sqlite3';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const dbPath = process.env.DB_PATH || path.join(process.cwd(), 'aqi_data.db');
const db = new Database(dbPath);

// Enable WAL mode for better concurrency
db.pragma('journal_mode = WAL');

// Initialize schema
db.exec(`
  CREATE TABLE IF NOT EXISTS air_quality_data (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    city TEXT NOT NULL,
    state TEXT,
    country TEXT NOT NULL,

    -- Air Quality Index
    aqi_us INTEGER,
    main_pollutant_us TEXT,

    -- Weather data
    temperature_celsius REAL,
    humidity INTEGER,
    pressure_hpa INTEGER,
    wind_speed_ms REAL,
    wind_direction INTEGER,

    -- Pollution data
    pm25_concentration REAL,
    pm10_concentration REAL,
    no2_concentration REAL,
    so2_concentration REAL,
    o3_concentration REAL,
    co_concentration REAL,

    -- Metadata
    latitude REAL,
    longitude REAL,
    raw_response TEXT,

    -- Unique constraint
    UNIQUE(timestamp, city)
  );

  -- Create indexes
  CREATE INDEX IF NOT EXISTS idx_timestamp ON air_quality_data(timestamp DESC);
  CREATE INDEX IF NOT EXISTS idx_city ON air_quality_data(city);
  CREATE INDEX IF NOT EXISTS idx_aqi ON air_quality_data(aqi_us);
  CREATE INDEX IF NOT EXISTS idx_timestamp_city ON air_quality_data(timestamp, city);
`);

console.log(`✓ SQLite database initialized at: ${dbPath}`);

export default db;
