import db from '../database/db-sqlite';
import { IQAirResponse } from '../types/iqair';

class DataService {
  saveAirQualityData(data: IQAirResponse): void {
    try {
      const { current, location, city, state, country } = data.data;
      const { weather, pollution } = current;

      const stmt = db.prepare(`
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
          ?, ?, ?,
          ?, ?,
          ?, ?, ?,
          ?, ?,
          ?, ?,
          ?, ?,
          ?, ?,
          ?, ?,
          ?
        )
        ON CONFLICT(timestamp, city) DO UPDATE SET
          aqi_us = excluded.aqi_us,
          main_pollutant_us = excluded.main_pollutant_us,
          temperature_celsius = excluded.temperature_celsius,
          humidity = excluded.humidity,
          pressure_hpa = excluded.pressure_hpa,
          wind_speed_ms = excluded.wind_speed_ms,
          wind_direction = excluded.wind_direction,
          pm25_concentration = excluded.pm25_concentration,
          pm10_concentration = excluded.pm10_concentration,
          no2_concentration = excluded.no2_concentration,
          so2_concentration = excluded.so2_concentration,
          o3_concentration = excluded.o3_concentration,
          co_concentration = excluded.co_concentration,
          raw_response = excluded.raw_response
      `);

      stmt.run(
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
      );

      console.log(`✓ Air quality data saved successfully for ${city} at ${new Date().toISOString()}`);
    } catch (error) {
      console.error('Error saving air quality data:', error);
      throw error;
    }
  }

  getLatestData(city: string, limit: number = 10) {
    const stmt = db.prepare(`
      SELECT * FROM air_quality_data
      WHERE city = ?
      ORDER BY timestamp DESC
      LIMIT ?
    `);

    return stmt.all(city, limit);
  }

  getDataByDateRange(city: string, startDate: Date, endDate: Date) {
    const stmt = db.prepare(`
      SELECT * FROM air_quality_data
      WHERE city = ?
        AND timestamp BETWEEN ? AND ?
      ORDER BY timestamp DESC
    `);

    return stmt.all(city, startDate.toISOString(), endDate.toISOString());
  }

  getAverageAQI(city: string, hours: number = 24) {
    const hoursAgo = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

    const stmt = db.prepare(`
      SELECT
        AVG(aqi_us) as avg_aqi,
        MAX(aqi_us) as max_aqi,
        MIN(aqi_us) as min_aqi,
        COUNT(*) as data_points
      FROM air_quality_data
      WHERE city = ?
        AND timestamp >= ?
    `);

    return stmt.get(city, hoursAgo);
  }
}

export default new DataService();
