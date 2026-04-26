import { readJson, storageKeys, writeJson } from './storage';

export type HistoryItem =
  | {
      id: string;
      type: 'advisory';
      createdAt: string;
      title: string;
      summary: string;
      meta: Record<string, string>;
    }
  | {
      id: string;
      type: 'disease';
      createdAt: string;
      title: string;
      summary: string;
      severity: 'mild' | 'moderate' | 'severe';
    }
  | {
      id: string;
      type: 'soil';
      createdAt: string;
      title: string;
      summary: string;
      score: number;
    };

export function getHistory(): HistoryItem[] {
  return readJson<HistoryItem[]>(storageKeys.history, []);
}

export function addHistory(item: HistoryItem) {
  const current = getHistory();
  const next = [item, ...current].slice(0, 50);
  writeJson(storageKeys.history, next);
}

export function clearHistory() {
  writeJson<HistoryItem[]>(storageKeys.history, []);
}

export function getSoilScores(): { date: string; score: number }[] {
  return readJson<{ date: string; score: number }[]>(storageKeys.soilScores, []);
}

export function pushSoilScore(score: number) {
  const current = getSoilScores();
  const entry = { date: new Date().toISOString(), score };
  writeJson(storageKeys.soilScores, [...current, entry].slice(-8));
}
