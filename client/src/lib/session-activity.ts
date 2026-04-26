// In-memory session activity log, persisted to sessionStorage so a browser
// refresh keeps the strip populated but logout / tab close clears it.

export type ActivityKind = 'advisory' | 'disease' | 'soil' | 'chat';

export type ActivityEntry = {
  id: string;
  kind: ActivityKind;
  summary: string;
  ts: number;
};

const KEY = 'agrismart.session_activity';
const LIMIT = 30;

function read(): ActivityEntry[] {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as ActivityEntry[]) : [];
  } catch {
    return [];
  }
}

function write(entries: ActivityEntry[]) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(entries.slice(0, LIMIT)));
  } catch {
    // ignore quota
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('agrismart:session-activity'));
  }
}

export function logActivity(kind: ActivityKind, summary: string) {
  const entry: ActivityEntry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    kind,
    summary,
    ts: Date.now(),
  };
  write([entry, ...read()]);
}

export function getActivity(): ActivityEntry[] {
  return read();
}

export function clearActivity() {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    // ignore
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('agrismart:session-activity'));
  }
}

export function activityCounts(entries = read()): Record<ActivityKind, number> {
  const out: Record<ActivityKind, number> = {
    advisory: 0,
    disease: 0,
    soil: 0,
    chat: 0,
  };
  for (const e of entries) out[e.kind] += 1;
  return out;
}
