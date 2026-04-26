const PREFIX = 'agrismart.';

export const storageKeys = {
  lang: `${PREFIX}lang`,
  session: `${PREFIX}session`,
  profile: `${PREFIX}profile`,
  history: `${PREFIX}history`,
  chat: `${PREFIX}chat`,
  soilScores: `${PREFIX}soilScores`,
  weatherSaved: `${PREFIX}weather.saved`,
  settings: `${PREFIX}settings`,
} as const;

export function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function writeJson<T>(key: string, value: T) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore quota errors — app still works without persistence
  }
}

export function removeKey(key: string) {
  try {
    localStorage.removeItem(key);
  } catch {
    // ignore
  }
}
