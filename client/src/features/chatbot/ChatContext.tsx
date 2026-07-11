/* eslint-disable react-refresh/only-export-components --
   Context module: intentionally co-exports the ChatProvider component and the
   useChat hook. */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useTranslation } from 'react-i18next';
import { readJson, storageKeys, writeJson } from '../../lib/storage';
import { askAssistant } from '../../lib/mock-api';
import { sendChat, type AiErrorReason, type ChatProfile } from '../../lib/ai-client';
import { logActivity } from '../../lib/session-activity';
import type { Lang } from '../../i18n';

function readProfileForChat(): ChatProfile | undefined {
  const raw = readJson<{
    name?: string;
    state?: string;
    district?: string;
    farmSize?: string;
    crops?: string[];
  } | null>(storageKeys.profile, null);
  if (!raw) return undefined;
  const farmAcres = raw.farmSize ? Number(raw.farmSize) : undefined;
  const out: ChatProfile = {};
  if (raw.name) out.name = raw.name;
  if (raw.state) out.state = raw.state;
  if (raw.district) out.district = raw.district;
  if (farmAcres && Number.isFinite(farmAcres)) out.farm_size_acres = farmAcres;
  if (raw.crops?.length) out.primary_crops = raw.crops;
  return Object.keys(out).length ? out : undefined;
}

export type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  at: string;
  /** true when the message came from the offline mock, not the live AI */
  fallback?: boolean;
};

type Persisted = Record<string, ChatMessage[]>;

type ChatContextShape = {
  messages: ChatMessage[];
  typing: boolean;
  send: (text: string) => Promise<void>;
  reset: () => void;
  open: boolean;
  setOpen: (o: boolean) => void;
  lastError: AiErrorReason | null;
};

const ChatContext = createContext<ChatContextShape | null>(null);

function randomId() {
  return Math.random().toString(36).slice(2, 10);
}

type SavedLocation = { name: string; lat: number; lon: number };

function firstSavedCoords(): SavedLocation | undefined {
  const raw = readJson<unknown[]>(storageKeys.weatherSaved, []);
  if (!Array.isArray(raw)) return undefined;
  return raw.find(
    (x): x is SavedLocation =>
      typeof x === 'object' &&
      x !== null &&
      typeof (x as SavedLocation).lat === 'number' &&
      typeof (x as SavedLocation).lon === 'number',
  );
}

function getOrCreateConversationId(): string {
  const KEY = 'agrismart.chat.cid';
  try {
    const existing = localStorage.getItem(KEY);
    if (existing) return existing;
    const fresh = `c_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
    localStorage.setItem(KEY, fresh);
    return fresh;
  } catch {
    return `c_${Math.random().toString(36).slice(2, 10)}`;
  }
}

export function ChatProvider({ children }: { children: ReactNode }) {
  const { i18n, t } = useTranslation();
  const lang = i18n.language as Lang;
  const [persisted, setPersisted] = useState<Persisted>(() =>
    readJson<Persisted>(storageKeys.chat, {}),
  );
  const [typing, setTyping] = useState(false);
  const [open, setOpen] = useState(false);
  const [lastError, setLastError] = useState<AiErrorReason | null>(null);
  const conversationIdRef = useRef<string>(getOrCreateConversationId());

  useEffect(() => {
    writeJson(storageKeys.chat, persisted);
  }, [persisted]);

  // Memoised so the `?? []` fallback doesn't create a new array reference every
  // render, which would destabilise the context value's dependency list below.
  const messages = useMemo(() => persisted[lang] ?? [], [persisted, lang]);

  const bootstrap = useCallback(() => {
    const greeting: ChatMessage = {
      id: randomId(),
      role: 'assistant',
      text: t('chat.subtitle'),
      at: new Date().toISOString(),
    };
    setPersisted((p) => ({ ...p, [lang]: [greeting] }));
  }, [lang, t]);

  useEffect(() => {
    // Seed the greeting whenever the user switches to a language that has no
    // transcript yet. This must react to `lang` changes (not just mount), so a
    // lazy initializer can't cover it; the synchronous seed is intentional.
    if (!persisted[lang] || persisted[lang].length === 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      bootstrap();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang]);

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      const userMsg: ChatMessage = {
        id: randomId(),
        role: 'user',
        text: trimmed,
        at: new Date().toISOString(),
      };
      setPersisted((p) => ({ ...p, [lang]: [...(p[lang] ?? []), userMsg] }));
      setTyping(true);
      setLastError(null);

      try {
        const res = await sendChat({
          conversation_id: conversationIdRef.current,
          message: trimmed,
          lang,
          profile: readProfileForChat(),
        });

        let reply: string;
        let fallback = false;

        if (res.ok && res.data) {
          reply = res.data.reply;
          fallback = !!res.data.fallback_used;
        } else if (!res.ok) {
          // Fall back to the offline mock so the user still gets an answer.
          setLastError(res.reason);
          const coords = firstSavedCoords();
          const { reply: mockReply } = await askAssistant(
            trimmed,
            lang,
            coords ? { coords } : undefined,
          );
          reply = mockReply;
          fallback = true;
        } else {
          reply = '';
        }

        const botMsg: ChatMessage = {
          id: randomId(),
          role: 'assistant',
          text: reply,
          at: new Date().toISOString(),
          fallback,
        };
        setPersisted((p) => ({ ...p, [lang]: [...(p[lang] ?? []), botMsg] }));
        logActivity('chat', trimmed.slice(0, 60));
      } finally {
        setTyping(false);
      }
    },
    [lang],
  );

  const reset = useCallback(() => {
    setPersisted((p) => ({ ...p, [lang]: [] }));
    try {
      localStorage.removeItem('agrismart.chat.cid');
    } catch {
      // ignore
    }
    conversationIdRef.current = getOrCreateConversationId();
    setTimeout(bootstrap, 30);
  }, [lang, bootstrap]);

  const value = useMemo(
    () => ({ messages, typing, send, reset, open, setOpen, lastError }),
    [messages, typing, send, reset, open, lastError],
  );
  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useChat() {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error('useChat must be used inside ChatProvider');
  return ctx;
}
