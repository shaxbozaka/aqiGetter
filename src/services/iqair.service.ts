import axios, { AxiosInstance } from 'axios';
import dotenv from 'dotenv';
import { IQAirResponse } from '../types/iqair';

dotenv.config();

class IQAirService {
  private api: AxiosInstance;
  private apiKey: string;
  private baseURL: string = 'https://api.airvisual.com/v2';

  constructor() {
    this.apiKey = process.env.IQAIR_API_KEY || '';

    if (!this.apiKey) {
      throw new Error('IQAIR_API_KEY is not set in environment variables');
    }

    this.api = axios.create({
      baseURL: this.baseURL,
      timeout: 10000,
    });
  }

  async getCityData(city: string, state: string, country: string): Promise<IQAirResponse> {
    try {
      const response = await this.api.get<IQAirResponse>('/city', {
        params: {
          city,
          state,
          country,
          key: this.apiKey,
        },
      });

      if (response.data.status !== 'success') {
        throw new Error(`API returned status: ${response.data.status}`);
      }

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error('IQAir API Error:', error.response?.data || error.message);
        throw new Error(`Failed to fetch air quality data: ${error.message}`);
      }
      throw error;
    }
  }

  async getTashkentData(): Promise<IQAirResponse> {
    return this.getCityData('Tashkent', 'Toshkent Shahri', 'Uzbekistan');
  }
}

export default new IQAirService();
