import { readJson, storageKeys, writeJson } from './storage';

export type AppSettings = {
  notifyWeatherAlerts: boolean;
  notifyDailyTip: boolean;
  notifyDiseaseWarnings: boolean;
  useAiAdvisory: boolean;
  saveAiConversations: boolean;
};

export const defaultSettings: AppSettings = {
  notifyWeatherAlerts: true,
  notifyDailyTip: false,
  notifyDiseaseWarnings: true,
  useAiAdvisory: true,
  saveAiConversations: true,
};

export function getSettings(): AppSettings {
  return { ...defaultSettings, ...readJson<Partial<AppSettings>>(storageKeys.settings, {}) };
}

export function saveSettings(patch: Partial<AppSettings>) {
  const next = { ...getSettings(), ...patch };
  writeJson(storageKeys.settings, next);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('agrismart:settings'));
  }
  return next;
}
