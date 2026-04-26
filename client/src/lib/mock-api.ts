import advisoryData from '../data/advisory.json';
import diseaseData from '../data/diseases.json';
import chatReplies from '../data/chatbot-replies.json';
import { hashString, wait, randomDelay } from './utils';
import { analyseSoil, type SoilInput, type SoilResult } from './soil-engine';
import { detectIntent, type Intent } from './intent';
import { fetchCurrentWeather, fetchForecast } from './weather-client';
import { fallbackCurrent, fallbackForecast } from './weather-fallback';
import type { Lang } from '../i18n';

export type SoilType = 'loam' | 'clay' | 'sandy';
export type Season = 'kharif' | 'rabi' | 'zaid';

export type CropRec = {
  id: string;
  name: string;
  emoji: string;
  confidence: number;
  yieldRange: string;
  waterNeed: string;
  rationale: string[];
  companions: string[];
  risks: string[];
};

export type AdvisoryResult = {
  crops: CropRec[];
  meta: { soilType: SoilType; season: Season; location: string };
};

export async function getAdvisory(input: {
  location: string;
  soilType: SoilType;
  season: Season;
}): Promise<AdvisoryResult> {
  await wait(randomDelay(400, 900));
  const key = `${input.soilType}-${input.season}` as keyof typeof advisoryData;
  const crops =
    (advisoryData[key] as CropRec[] | undefined) ??
    (advisoryData['balanced' as keyof typeof advisoryData] as CropRec[]);
  return {
    crops: crops.slice(0, 3),
    meta: input,
  };
}

export type DiseaseReport = {
  id: string;
  name: string;
  scientificName: string;
  severity: 'mild' | 'moderate' | 'severe';
  cause: string;
  symptoms: string[];
  chemicalTreatment: string[];
  organicTreatment: string[];
  prevention: string[];
};

export async function analyseLeaf(file: File): Promise<DiseaseReport> {
  await wait(randomDelay(1300, 1800));
  const seed = hashString(`${file.name}-${file.size}`);
  const index = seed % diseaseData.length;
  return diseaseData[index] as DiseaseReport;
}

export async function runSoilAnalysis(input: SoilInput): Promise<SoilResult> {
  await wait(randomDelay(500, 900));
  return analyseSoil(input);
}

/**
 * Ask the chatbot. If the intent is weather-related and we have coordinates,
 * hit the backend proxy to inject real numbers so the assistant feels
 * genuinely informed instead of scripted.
 */
export async function askAssistant(
  message: string,
  lang: Lang,
  opts?: { coords?: { lat: number; lon: number; name?: string } },
): Promise<{ reply: string; intent: Intent }> {
  await wait(randomDelay(700, 1400));
  const intent = detectIntent(message);
  const langReplies =
    (chatReplies as Record<Lang, Record<Intent, string[]>>)[lang] ??
    (chatReplies as Record<Lang, Record<Intent, string[]>>).en;

  if (intent === 'weather' && opts?.coords) {
    try {
      const [current, forecast] = await Promise.all([
        fetchCurrentWeather(opts.coords.lat, opts.coords.lon, lang),
        fetchForecast(opts.coords.lat, opts.coords.lon, lang),
      ]);
      const tomorrow = forecast.days[1] ?? forecast.days[0];
      const locName = opts.coords.name ?? current.location.name;
      const reply = `Right now in ${locName}: ${current.current.temp_c}°C, ${current.current.condition.description}, humidity ${current.current.humidity_pct}%. Tomorrow's range: ${tomorrow.temp_min_c}°–${tomorrow.temp_max_c}°C${tomorrow.precipitation_mm > 0 ? `, ~${tomorrow.precipitation_mm}mm rain expected` : ''}.`;
      return { reply, intent };
    } catch {
      // fall through to scripted reply if the proxy is unreachable
    }
  }

  const bank = langReplies[intent];
  const reply = bank[Math.floor(Math.random() * bank.length)];
  return { reply, intent };
}

/**
 * Back-compat helper kept only so existing callers that haven't yet migrated
 * to the real weather-client still work. Uses the offline fallback seed.
 * New code should import from `./weather-client` directly.
 */
export async function getWeather(location: string) {
  await wait(randomDelay(200, 400));
  const current = fallbackCurrent(location);
  const forecast = fallbackForecast(location);
  return {
    location: current.location.name,
    current: {
      temp: current.current.temp_c,
      feelsLike: current.current.feels_like_c,
      humidity: current.current.humidity_pct,
      wind: Math.round(current.current.wind_speed_ms * 3.6),
      condition: current.current.condition.label.toLowerCase(),
    },
    forecast: forecast.days.map((d, i) => ({
      date: `Day ${i + 1}`,
      hi: d.temp_max_c,
      lo: d.temp_min_c,
      condition: d.condition.label.toLowerCase(),
      rain: d.precipitation_mm,
      label: d.condition.description,
    })),
    alerts: [] as { id: string; level: 'info' | 'warning' | 'danger'; title: string; body: string; action: string }[],
  };
}
