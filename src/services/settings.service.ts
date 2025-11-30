// Admin settings service - stores override values for display
// All values are strings to allow custom text like "N/A", "Error", etc.
interface OverrideSettings {
  enabled: boolean;
  aqi?: string | number;
  temperature?: string | number;
  humidity?: string | number;
  windSpeed?: string | number;
}

class SettingsService {
  private overrides: OverrideSettings = {
    enabled: false,
  };

  getOverrides(): OverrideSettings {
    return { ...this.overrides };
  }

  setOverrides(settings: Partial<OverrideSettings>): void {
    this.overrides = {
      ...this.overrides,
      ...settings,
    };
  }

  clearOverrides(): void {
    this.overrides = { enabled: false };
  }

  applyOverrides(data: any): any {
    if (!this.overrides.enabled) {
      return data;
    }

    const result = { ...data };

    if (this.overrides.aqi !== undefined) {
      result.aqi_us = this.overrides.aqi;
    }
    if (this.overrides.temperature !== undefined) {
      result.temperature_celsius = this.overrides.temperature;
    }
    if (this.overrides.humidity !== undefined) {
      result.humidity = this.overrides.humidity;
    }
    if (this.overrides.windSpeed !== undefined) {
      result.wind_speed_ms = this.overrides.windSpeed;
    }

    return result;
  }
}

export default new SettingsService();
