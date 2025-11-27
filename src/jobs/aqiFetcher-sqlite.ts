import iqairService from '../services/iqair.service';
import dataService from '../services/data.service-sqlite';

export async function fetchAndSaveAirQuality(): Promise<void> {
  console.log(`[${new Date().toISOString()}] Starting air quality data fetch...`);

  try {
    const data = await iqairService.getTashkentData();
    dataService.saveAirQualityData(data);

    const { current } = data.data;
    console.log(`[${new Date().toISOString()}] AQI: ${current.pollution.aqius}, Temp: ${current.weather.tp}°C, PM2.5: ${current.pollution.p2?.conc || 'N/A'}`);
  } catch (error) {
    if (error instanceof Error) {
      console.error(`[${new Date().toISOString()}] Error fetching air quality data:`, error.message);
    } else {
      console.error(`[${new Date().toISOString()}] Unknown error occurred`);
    }
  }
}
