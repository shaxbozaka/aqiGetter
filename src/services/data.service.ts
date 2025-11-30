import pool from '../database/db';
import { IQAirResponse } from '../types/iqair';

class DataService {
  async saveAirQualityData(data: IQAirResponse): Promise<void> {
    const client = await pool.connect();

    try {
      const { current, location, city, state, country } = data.data;
      const { weather, pollution } = current;

      const query = `
        INSERT INTO air_quality_data (
          city, state, country,
          aqi_us, main_pollutant_us,
          temperature_celsius, humidity, pressure_hpa,
          wind_speed_ms, wind_direction,
          pm25_concentration, pm10_concentration,
          no2_concentration, so2_concentration,
          o3_concentration, co_concentration,
          latitude, longitude,
          raw_response
        ) VALUES (
          $1, $2, $3,
          $4, $5,
          $6, $7, $8,
          $9, $10,
          $11, $12,
          $13, $14,
          $15, $16,
          $17, $18,
          $19
        )
        ON CONFLICT (timestamp, city) DO UPDATE SET
          aqi_us = EXCLUDED.aqi_us,
          main_pollutant_us = EXCLUDED.main_pollutant_us,
          temperature_celsius = EXCLUDED.temperature_celsius,
          humidity = EXCLUDED.humidity,
          pressure_hpa = EXCLUDED.pressure_hpa,
          wind_speed_ms = EXCLUDED.wind_speed_ms,
          wind_direction = EXCLUDED.wind_direction,
          pm25_concentration = EXCLUDED.pm25_concentration,
          pm10_concentration = EXCLUDED.pm10_concentration,
          no2_concentration = EXCLUDED.no2_concentration,
          so2_concentration = EXCLUDED.so2_concentration,
          o3_concentration = EXCLUDED.o3_concentration,
          co_concentration = EXCLUDED.co_concentration,
          raw_response = EXCLUDED.raw_response
      `;

      const values = [
        city,
        state,
        country,
        pollution.aqius,
        pollution.mainus,
        weather.tp,
        weather.hu,
        weather.pr,
        weather.ws,
        weather.wd,
        pollution.p2?.conc || null,
        pollution.p1?.conc || null,
        pollution.n2?.conc || null,
        pollution.s2?.conc || null,
        pollution.o3?.conc || null,
        pollution.co?.conc || null,
        location.coordinates[1], // latitude
        location.coordinates[0], // longitude
        JSON.stringify(data),
      ];

      await client.query(query, values);
      console.log(`✓ Air quality data saved successfully for ${city} at ${new Date().toISOString()}`);
    } catch (error) {
      console.error('Error saving air quality data:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async getLatestData(city: string, limit: number = 10) {
    const query = `
      SELECT * FROM air_quality_data
      WHERE city = $1
      ORDER BY timestamp DESC
      LIMIT $2
    `;

    const result = await pool.query(query, [city, limit]);
    return result.rows;
  }

  async getDataByDateRange(city: string, startDate: Date, endDate: Date) {
    const query = `
      SELECT * FROM air_quality_data
      WHERE city = $1
        AND timestamp BETWEEN $2 AND $3
      ORDER BY timestamp DESC
    `;

    const result = await pool.query(query, [city, startDate, endDate]);
    return result.rows;
  }

  async getAverageAQI(city: string, hours: number = 24) {
    const query = `
      SELECT
        AVG(aqi_us) as avg_aqi,
        MAX(aqi_us) as max_aqi,
        MIN(aqi_us) as min_aqi,
        COUNT(*) as data_points
      FROM air_quality_data
      WHERE city = $1
        AND timestamp >= NOW() - INTERVAL '${hours} hours'
    `;

    const result = await pool.query(query, [city]);
    return result.rows[0];
  }

  async getAggregatedData(city: string, period: 'week' | 'month' | 'year', granularity: 'hour' | 'day' | 'week') {
    let interval: string;
    let truncate: string;

    switch (period) {
      case 'week':
        interval = '7 days';
        break;
      case 'month':
        interval = '30 days';
        break;
      case 'year':
        interval = '365 days';
        break;
    }

    switch (granularity) {
      case 'hour':
        truncate = 'hour';
        break;
      case 'day':
        truncate = 'day';
        break;
      case 'week':
        truncate = 'week';
        break;
    }

    const query = `
      SELECT
        DATE_TRUNC('${truncate}', timestamp) as time_bucket,
        ROUND(AVG(aqi_us)) as avg_aqi,
        MAX(aqi_us) as max_aqi,
        MIN(aqi_us) as min_aqi,
        ROUND(AVG(temperature_celsius)) as avg_temp,
        ROUND(AVG(humidity)) as avg_humidity,
        COUNT(*) as data_points
      FROM air_quality_data
      WHERE city = $1
        AND timestamp >= NOW() - INTERVAL '${interval}'
      GROUP BY time_bucket
      ORDER BY time_bucket ASC
    `;

    const result = await pool.query(query, [city]);
    return result.rows;
  }

  async getComparisonStats(city: string) {
    const query = `
      WITH periods AS (
        SELECT
          'today' as period,
          ROUND(AVG(aqi_us)) as avg_aqi,
          MAX(aqi_us) as max_aqi,
          MIN(aqi_us) as min_aqi
        FROM air_quality_data
        WHERE city = $1 AND timestamp >= CURRENT_DATE

        UNION ALL

        SELECT
          'yesterday' as period,
          ROUND(AVG(aqi_us)) as avg_aqi,
          MAX(aqi_us) as max_aqi,
          MIN(aqi_us) as min_aqi
        FROM air_quality_data
        WHERE city = $1 AND timestamp >= CURRENT_DATE - INTERVAL '1 day' AND timestamp < CURRENT_DATE

        UNION ALL

        SELECT
          'this_week' as period,
          ROUND(AVG(aqi_us)) as avg_aqi,
          MAX(aqi_us) as max_aqi,
          MIN(aqi_us) as min_aqi
        FROM air_quality_data
        WHERE city = $1 AND timestamp >= DATE_TRUNC('week', CURRENT_DATE)

        UNION ALL

        SELECT
          'last_week' as period,
          ROUND(AVG(aqi_us)) as avg_aqi,
          MAX(aqi_us) as max_aqi,
          MIN(aqi_us) as min_aqi
        FROM air_quality_data
        WHERE city = $1
          AND timestamp >= DATE_TRUNC('week', CURRENT_DATE) - INTERVAL '7 days'
          AND timestamp < DATE_TRUNC('week', CURRENT_DATE)

        UNION ALL

        SELECT
          'this_month' as period,
          ROUND(AVG(aqi_us)) as avg_aqi,
          MAX(aqi_us) as max_aqi,
          MIN(aqi_us) as min_aqi
        FROM air_quality_data
        WHERE city = $1 AND timestamp >= DATE_TRUNC('month', CURRENT_DATE)

        UNION ALL

        SELECT
          'last_month' as period,
          ROUND(AVG(aqi_us)) as avg_aqi,
          MAX(aqi_us) as max_aqi,
          MIN(aqi_us) as min_aqi
        FROM air_quality_data
        WHERE city = $1
          AND timestamp >= DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '1 month'
          AND timestamp < DATE_TRUNC('month', CURRENT_DATE)
      )
      SELECT * FROM periods
    `;

    const result = await pool.query(query, [city]);

    // Convert to object for easier access
    const stats: Record<string, any> = {};
    result.rows.forEach(row => {
      stats[row.period] = {
        avg_aqi: row.avg_aqi,
        max_aqi: row.max_aqi,
        min_aqi: row.min_aqi
      };
    });

    return stats;
  }
}

export default new DataService();
