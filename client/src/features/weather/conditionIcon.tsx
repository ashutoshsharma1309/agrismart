import { createElement, type ComponentType, type ReactElement } from 'react';
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

// The 5-day forecast endpoint groups several 3-hour slices, so we only have the
// OWM "main" label (e.g. "Rain") rather than a precise code. Map it back to a
// representative code so the same picker can be reused.
export function iconForLabel(label: string, description = ''): ComponentType<LucideProps> {
  const l = label.toLowerCase();
  if (l.includes('thunder')) return iconForCode(200, description);
  if (l.includes('drizzle')) return iconForCode(300, description);
  if (l.includes('rain')) return iconForCode(500, description);
  if (l.includes('snow')) return iconForCode(600, description);
  if (l.includes('mist') || l.includes('fog') || l.includes('haze')) return iconForCode(741, description);
  if (l.includes('clear')) return iconForCode(800, description);
  if (l.includes('cloud')) return iconForCode(803, description);
  return iconForCode(0, description);
}

// Render helpers return a ready-to-use element via `createElement`. Callers get
// the icon without aliasing a resolved component to a capitalized local (which
// reads as "a component created during render" and, more importantly, keeps the
// dynamic lookup out of JSX where a stale reference could remount the subtree).
export function conditionIcon(code: number, props: LucideProps = {}, description = ''): ReactElement {
  return createElement(iconForCode(code, description), props);
}

export function conditionIconByLabel(label: string, props: LucideProps = {}, description = ''): ReactElement {
  return createElement(iconForLabel(label, description), props);
}
