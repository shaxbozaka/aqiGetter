import iqairService from '../services/iqair.service';
import dataService from '../services/data.service';
import { aqiEvents } from '../app';

export async function fetchAndSaveAirQuality(): Promise<void> {
  console.log(`[${new Date().toISOString()}] Starting air quality data fetch...`);

  try {
    const data = await iqairService.getTashkentData();
    await dataService.saveAirQualityData(data);

    const { current } = data.data;
    console.log(`[${new Date().toISOString()}] AQI: ${current.pollution.aqius}, Temp: ${current.weather.tp}°C, PM2.5: ${current.pollution.p2?.conc || 'N/A'}`);

    // Emit event for real-time updates
    aqiEvents.emit('newData', {
      aqi_us: current.pollution.aqius,
      temperature_celsius: current.weather.tp,
      humidity: current.weather.hu,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    if (error instanceof Error) {
      console.error(`[${new Date().toISOString()}] Error fetching air quality data:`, error.message);
    } else {
      console.error(`[${new Date().toISOString()}] Unknown error occurred`);
    }
  }
}
