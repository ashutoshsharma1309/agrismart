import type { ComponentType } from 'react';
import {
  Cloud,
  CloudDrizzle,
  CloudFog,
  CloudLightning,
  CloudMoon,
  CloudRain,
  CloudSnow,
  CloudSun,
  Cloudy,
  Moon,
  Sun,
  Wind,
  type LucideProps,
} from 'lucide-react';

// OpenWeatherMap condition codes: https://openweathermap.org/weather-conditions
// We keep the mapping on the frontend so we never load images from a third-party CDN.
export function iconForCode(code: number, description = ''): ComponentType<LucideProps> {
  if (code >= 200 && code < 300) return CloudLightning;
  if (code >= 300 && code < 400) return CloudDrizzle;
  if (code >= 500 && code < 600) return CloudRain;
  if (code >= 600 && code < 700) return CloudSnow;
  if (code === 701 || code === 741) return CloudFog;
  if (code >= 700 && code < 800) return Wind;
  if (code === 800) {
    return description.toLowerCase().includes('night') ? Moon : Sun;
  }
  if (code === 801) return CloudSun;
  if (code === 802) return CloudMoon;
  if (code === 803 || code === 804) return Cloudy;
  return Cloud;
}
