-- Air Quality Data Table for Tashkent
CREATE TABLE IF NOT EXISTS air_quality_data (
    id SERIAL PRIMARY KEY,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100),
    country VARCHAR(100) NOT NULL,

    -- Air Quality Index
    aqi_us INTEGER,
    main_pollutant_us VARCHAR(10),

    -- Weather data
    temperature_celsius DECIMAL(5,2),
    humidity INTEGER,
    pressure_hpa INTEGER,
    wind_speed_ms DECIMAL(5,2),
    wind_direction INTEGER,

    -- Pollution data
    pm25_concentration DECIMAL(10,2),
    pm10_concentration DECIMAL(10,2),
    no2_concentration DECIMAL(10,2),
    so2_concentration DECIMAL(10,2),
    o3_concentration DECIMAL(10,2),
    co_concentration DECIMAL(10,2),

    -- Metadata
    latitude DECIMAL(10,7),
    longitude DECIMAL(10,7),
    raw_response JSONB,

    -- Indexes for better query performance
    CONSTRAINT unique_timestamp_city UNIQUE(timestamp, city)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_timestamp ON air_quality_data(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_city ON air_quality_data(city);
CREATE INDEX IF NOT EXISTS idx_aqi ON air_quality_data(aqi_us);
CREATE INDEX IF NOT EXISTS idx_timestamp_city ON air_quality_data(timestamp, city);

-- Add comments
COMMENT ON TABLE air_quality_data IS 'Stores air quality data from IQAir API';
COMMENT ON COLUMN air_quality_data.aqi_us IS 'US EPA AQI standard';
COMMENT ON COLUMN air_quality_data.main_pollutant_us IS 'Main pollutant (p1=PM2.5, p2=PM10, o3=Ozone, etc)';
