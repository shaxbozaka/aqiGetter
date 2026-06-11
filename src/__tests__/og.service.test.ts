import { describe, it, expect } from 'vitest';
import {
  getAqiLevel,
  buildOgTags,
  injectOgTags,
  renderOgSvg,
  renderOgImage,
  rowToOgData,
  OgData,
} from '../services/og.service';

const sampleData: OgData = {
  aqi: 34,
  temperatureC: 31,
  humidity: 22,
  windKmh: 7.0,
  city: 'Tashkent',
  country: 'Uzbekistan',
};

describe('getAqiLevel', () => {
  it('returns Good for AQI <= 50', () => {
    expect(getAqiLevel(34).label).toBe('Good');
    expect(getAqiLevel(50).label).toBe('Good');
  });

  it('returns Moderate for AQI 51-100', () => {
    expect(getAqiLevel(51).label).toBe('Moderate');
    expect(getAqiLevel(100).label).toBe('Moderate');
  });

  it('returns Unhealthy for Sensitive Groups for AQI 101-150', () => {
    expect(getAqiLevel(120).label).toBe('Unhealthy for Sensitive Groups');
  });

  it('returns Unhealthy for AQI 151-200', () => {
    expect(getAqiLevel(180).label).toBe('Unhealthy');
  });

  it('returns Very Unhealthy for AQI 201-300', () => {
    expect(getAqiLevel(250).label).toBe('Very Unhealthy');
  });

  it('returns Hazardous for AQI above 300, including beyond 500', () => {
    expect(getAqiLevel(400).label).toBe('Hazardous');
    expect(getAqiLevel(999).label).toBe('Hazardous');
  });
});

describe('buildOgTags', () => {
  it('includes title with AQI value and level', () => {
    const tags = buildOgTags(sampleData, 'https://aqi.example.com');
    expect(tags).toContain('Tashkent AQI: 34 — Good');
  });

  it('includes recommendation and weather details in description', () => {
    const tags = buildOgTags(sampleData, 'https://aqi.example.com');
    expect(tags).toContain('Air quality is great!');
    expect(tags).toContain('31°C');
    expect(tags).toContain('22% humidity');
    expect(tags).toContain('wind 7.0 km/h');
  });

  it('points og:image at the base URL with cache-busting AQI param', () => {
    const tags = buildOgTags(sampleData, 'https://aqi.example.com');
    expect(tags).toContain('https://aqi.example.com/og-image.png?aqi=34');
  });

  it('includes twitter summary_large_image card', () => {
    const tags = buildOgTags(sampleData, 'https://aqi.example.com');
    expect(tags).toContain('summary_large_image');
  });

  it('omits missing weather details', () => {
    const tags = buildOgTags(
      { ...sampleData, temperatureC: null, humidity: null, windKmh: null },
      'https://aqi.example.com'
    );
    expect(tags).not.toContain('°C');
    expect(tags).not.toContain('humidity');
    expect(tags).not.toContain('wind');
  });
});

describe('injectOgTags', () => {
  it('inserts tags after the title element', () => {
    const html = '<html><head><title>Test</title></head><body></body></html>';
    const result = injectOgTags(html, '<meta property="og:title" content="x">');
    expect(result).toContain('</title>\n    <meta property="og:title" content="x">');
  });
});

describe('renderOgSvg', () => {
  it('renders AQI number, label, location, and stats', () => {
    const svg = renderOgSvg(sampleData);
    expect(svg).toContain('>34<');
    expect(svg).toContain('Good');
    expect(svg).toContain('Tashkent, Uzbekistan');
    expect(svg).toContain('31°C');
    expect(svg).toContain('22%');
    expect(svg).toContain('7.0 km/h');
  });

  it('uses the level color as background', () => {
    expect(renderOgSvg(sampleData)).toContain('#22c55e');
    expect(renderOgSvg({ ...sampleData, aqi: 180 })).toContain('#ef4444');
  });

  it('skips stats that are missing', () => {
    const svg = renderOgSvg({ ...sampleData, humidity: null, windKmh: null });
    expect(svg).toContain('Temperature');
    expect(svg).not.toContain('Humidity');
    expect(svg).not.toContain('Wind');
  });
});

describe('renderOgImage', () => {
  it('produces a 1200x630 PNG buffer', () => {
    const png = renderOgImage(sampleData);
    // PNG magic bytes
    expect(png.subarray(0, 8)).toEqual(
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
    );
    // IHDR width/height are big-endian uint32 at offsets 16 and 20
    expect(png.readUInt32BE(16)).toBe(1200);
    expect(png.readUInt32BE(20)).toBe(630);
  });
});

describe('rowToOgData', () => {
  it('converts a DB row with numeric values', () => {
    const data = rowToOgData({
      aqi_us: 34,
      temperature_celsius: 31.2,
      humidity: 22,
      wind_speed_ms: 1.94,
      city: 'Tashkent',
      country: 'Uzbekistan',
    });
    expect(data).not.toBeNull();
    expect(data!.aqi).toBe(34);
    expect(data!.windKmh).toBeCloseTo(6.98, 1);
  });

  it('converts string values from DB', () => {
    const data = rowToOgData({
      aqi_us: '72',
      temperature_celsius: '28.5',
      humidity: '40',
      wind_speed_ms: '2.5',
    });
    expect(data!.aqi).toBe(72);
    expect(data!.temperatureC).toBe(28.5);
    expect(data!.city).toBe('Tashkent');
  });

  it('returns null when AQI is missing', () => {
    expect(
      rowToOgData({ aqi_us: null, temperature_celsius: 20, humidity: 30, wind_speed_ms: 1 })
    ).toBeNull();
  });

  it('handles missing weather fields', () => {
    const data = rowToOgData({
      aqi_us: 50,
      temperature_celsius: null,
      humidity: null,
      wind_speed_ms: null,
    });
    expect(data!.temperatureC).toBeNull();
    expect(data!.humidity).toBeNull();
    expect(data!.windKmh).toBeNull();
  });
});
