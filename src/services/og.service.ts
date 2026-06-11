import { Resvg } from '@resvg/resvg-js';
import path from 'path';

export interface AqiLevel {
  max: number;
  label: string;
  recommendation: string;
  color: string;
  colorDark: string;
}

export interface OgData {
  aqi: number;
  temperatureC: number | null;
  humidity: number | null;
  windKmh: number | null;
  city: string;
  country: string;
}

// Mirrors the aqiLevels table in public/dashboard.html — keep both in sync
const AQI_LEVELS: AqiLevel[] = [
  { max: 50, label: 'Good', recommendation: 'Air quality is great! Perfect day for outdoor activities.', color: '#22c55e', colorDark: '#15803d' },
  { max: 100, label: 'Moderate', recommendation: 'Air is acceptable. Unusually sensitive people should limit prolonged outdoor exertion.', color: '#eab308', colorDark: '#a16207' },
  { max: 150, label: 'Unhealthy for Sensitive Groups', recommendation: 'Sensitive groups should reduce outdoor activities. Others can be outside but take it easier.', color: '#f97316', colorDark: '#c2410c' },
  { max: 200, label: 'Unhealthy', recommendation: 'Everyone should reduce prolonged outdoor exertion. Consider wearing a mask outside.', color: '#ef4444', colorDark: '#b91c1c' },
  { max: 300, label: 'Very Unhealthy', recommendation: 'Avoid outdoor activities. Keep windows closed. Use air purifier if available.', color: '#a855f7', colorDark: '#7e22ce' },
  { max: 500, label: 'Hazardous', recommendation: 'Stay indoors! Avoid all outdoor activities. Serious health risk for everyone.', color: '#881337', colorDark: '#4c0519' },
];

const FONT_DIR = path.join(__dirname, '../../assets/fonts');
const IMAGE_WIDTH = 1200;
const IMAGE_HEIGHT = 630;

export function getAqiLevel(aqi: number): AqiLevel {
  return AQI_LEVELS.find((level) => aqi <= level.max) ?? AQI_LEVELS[AQI_LEVELS.length - 1];
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeAttr(value: string): string {
  return escapeXml(value).replace(/'/g, '&#39;');
}

interface StatItem {
  value: string;
  label: string;
}

function buildStats(data: OgData): StatItem[] {
  const stats: StatItem[] = [];
  if (data.temperatureC !== null) {
    stats.push({ value: `${Math.round(data.temperatureC)}°C`, label: 'Temperature' });
  }
  if (data.humidity !== null) {
    stats.push({ value: `${Math.round(data.humidity)}%`, label: 'Humidity' });
  }
  if (data.windKmh !== null) {
    stats.push({ value: `${data.windKmh.toFixed(1)} km/h`, label: 'Wind' });
  }
  return stats;
}

export function renderOgSvg(data: OgData): string {
  const level = getAqiLevel(data.aqi);
  const stats = buildStats(data);

  const statsWidth = 320;
  const statsStartX = IMAGE_WIDTH / 2 - ((stats.length - 1) * statsWidth) / 2;
  const statsSvg = stats
    .map((stat, i) => {
      const x = statsStartX + i * statsWidth;
      return `
    <text x="${x}" y="520" font-family="Inter Display" font-weight="700" font-size="44" fill="#ffffff" text-anchor="middle">${escapeXml(stat.value)}</text>
    <text x="${x}" y="562" font-family="Inter Display" font-weight="400" font-size="26" fill="rgba(255,255,255,0.75)" text-anchor="middle">${escapeXml(stat.label)}</text>`;
    })
    .join('');

  return `<svg width="${IMAGE_WIDTH}" height="${IMAGE_HEIGHT}" viewBox="0 0 ${IMAGE_WIDTH} ${IMAGE_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${level.color}"/>
      <stop offset="100%" stop-color="${level.colorDark}"/>
    </linearGradient>
  </defs>
  <rect width="${IMAGE_WIDTH}" height="${IMAGE_HEIGHT}" fill="url(#bg)"/>
  <circle cx="1080" cy="80" r="280" fill="rgba(255,255,255,0.06)"/>
  <circle cx="120" cy="580" r="220" fill="rgba(255,255,255,0.05)"/>
  <text x="600" y="96" font-family="Inter Display" font-weight="600" font-size="36" fill="rgba(255,255,255,0.9)" text-anchor="middle">${escapeXml(data.city)}, ${escapeXml(data.country)}</text>
  <text x="600" y="312" font-family="Inter Display" font-weight="700" font-size="240" fill="#ffffff" text-anchor="middle">${data.aqi}</text>
  <text x="600" y="404" font-family="Inter Display" font-weight="600" font-size="54" fill="#ffffff" text-anchor="middle">${escapeXml(level.label)}</text>
  ${statsSvg}
  <text x="600" y="614" font-family="Inter Display" font-weight="400" font-size="22" fill="rgba(255,255,255,0.55)" text-anchor="middle">Live air quality · US AQI</text>
</svg>`;
}

export function renderOgImage(data: OgData): Buffer {
  const svg = renderOgSvg(data);
  const resvg = new Resvg(svg, {
    font: {
      fontFiles: [
        path.join(FONT_DIR, 'InterDisplay-Regular.ttf'),
        path.join(FONT_DIR, 'InterDisplay-SemiBold.ttf'),
        path.join(FONT_DIR, 'InterDisplay-Bold.ttf'),
      ],
      loadSystemFonts: false,
      defaultFontFamily: 'Inter Display',
    },
  });
  return resvg.render().asPng();
}

export function buildOgTags(data: OgData, baseUrl: string): string {
  const level = getAqiLevel(data.aqi);
  const title = `${data.city} AQI: ${data.aqi} — ${level.label}`;
  const detailParts: string[] = [];
  if (data.temperatureC !== null) detailParts.push(`${Math.round(data.temperatureC)}°C`);
  if (data.humidity !== null) detailParts.push(`${Math.round(data.humidity)}% humidity`);
  if (data.windKmh !== null) detailParts.push(`wind ${data.windKmh.toFixed(1)} km/h`);
  const description = [level.recommendation, detailParts.join(' · ')].filter(Boolean).join(' ');
  // Cache-busting param so Telegram refetches the image when the reading changes
  const imageUrl = `${baseUrl}/og-image.png?aqi=${data.aqi}`;

  return [
    `<meta property="og:type" content="website">`,
    `<meta property="og:site_name" content="${escapeAttr(`${data.city} Air Quality`)}">`,
    `<meta property="og:title" content="${escapeAttr(title)}">`,
    `<meta property="og:description" content="${escapeAttr(description)}">`,
    `<meta property="og:url" content="${escapeAttr(baseUrl)}/">`,
    `<meta property="og:image" content="${escapeAttr(imageUrl)}">`,
    `<meta property="og:image:width" content="${IMAGE_WIDTH}">`,
    `<meta property="og:image:height" content="${IMAGE_HEIGHT}">`,
    `<meta name="twitter:card" content="summary_large_image">`,
    `<meta name="twitter:title" content="${escapeAttr(title)}">`,
    `<meta name="twitter:description" content="${escapeAttr(description)}">`,
    `<meta name="twitter:image" content="${escapeAttr(imageUrl)}">`,
    `<meta name="description" content="${escapeAttr(description)}">`,
  ].join('\n    ');
}

export function injectOgTags(html: string, tags: string): string {
  return html.replace('</title>', `</title>\n    ${tags}`);
}

interface AqiRow {
  aqi_us: number | string | null;
  temperature_celsius: number | string | null;
  humidity: number | string | null;
  wind_speed_ms: number | string | null;
  city?: string;
  country?: string;
}

function toNumberOrNull(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined || value === '') return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

export function rowToOgData(row: AqiRow): OgData | null {
  const aqi = toNumberOrNull(row.aqi_us);
  if (aqi === null) return null;

  const windMs = toNumberOrNull(row.wind_speed_ms);
  return {
    aqi: Math.round(aqi),
    temperatureC: toNumberOrNull(row.temperature_celsius),
    humidity: toNumberOrNull(row.humidity),
    windKmh: windMs === null ? null : windMs * 3.6,
    city: row.city || 'Tashkent',
    country: row.country || 'Uzbekistan',
  };
}
