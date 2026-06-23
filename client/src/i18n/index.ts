import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from './en.json';

import { storageKeys } from '../lib/storage';

export type Lang = 'en' | 'hi' | 'kn' | 'ta' | 'te' | 'mr';

export const languages: { code: Lang; name: string; nativeName: string }[] = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' },
  { code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ' },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்' },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు' },
  { code: 'mr', name: 'Marathi', nativeName: 'मराठी' },
];

// Only English is bundled eagerly (it's the fallback + English critical path).
// The other dictionaries (~40-48KB each) are loaded on demand. Each is loaded
// at most once and registered via addResourceBundle.
const dictionaryLoaders: Record<Exclude<Lang, 'en'>, () => Promise<{ default: object }>> = {
  hi: () => import('./hi.json'),
  kn: () => import('./kn.json'),
  ta: () => import('./ta.json'),
  te: () => import('./te.json'),
  mr: () => import('./mr.json'),
};

const loadedDictionaries = new Set<Lang>(['en']);

async function ensureDictionary(code: Lang) {
  if (loadedDictionaries.has(code)) return;
  loadedDictionaries.add(code);
  try {
    const loader = dictionaryLoaders[code as Exclude<Lang, 'en'>];
    const mod = await loader();
    i18n.addResourceBundle(code, 'translation', mod.default, true, true);
  } catch {
    // On failure, allow a future retry and fall back to English.
    loadedDictionaries.delete(code);
  }
}

// Non-Latin script fonts are lazy-loaded only when a matching language is
// selected, keeping them off the English critical path. Each is imported once.
// Import the package CSS entry directly so it matches Vite's ambient `*.css`
// module declaration (these fontsource packages ship no type declarations).
const fontLoaders: Partial<Record<Lang, () => Promise<unknown>>> = {
  hi: () => import('@fontsource/noto-sans-devanagari/index.css'),
  mr: () => import('@fontsource/noto-sans-devanagari/index.css'),
  ta: () => import('@fontsource/noto-sans-tamil/index.css'),
  te: () => import('@fontsource/noto-sans-telugu/index.css'),
  kn: () => import('@fontsource/noto-sans-kannada/index.css'),
};

const loadedFonts = new Set<string>();

function ensureFont(code: Lang) {
  const loader = fontLoaders[code];
  if (!loader) return; // Latin (en) needs no extra font.
  if (loadedFonts.has(code)) return;
  loadedFonts.add(code);
  void loader().catch(() => {
    loadedFonts.delete(code);
  });
}

function detectInitialLang(): Lang {
  try {
    const stored = localStorage.getItem(storageKeys.lang);
    if (stored && languages.some((l) => l.code === stored)) {
      return stored as Lang;
    }
  } catch {
    // ignore
  }
  return 'en';
}

const initialLang = detectInitialLang();

void i18n.use(initReactI18next).init({
  // Start with English only; other dictionaries are added on demand below.
  resources: {
    en: { translation: en },
  },
  lng: initialLang,
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
  returnNull: false,
});

function applyHtmlLang(code: Lang) {
  if (typeof document !== 'undefined') {
    document.documentElement.lang = code;
  }
}

applyHtmlLang(initialLang);

// If a returning user persisted a non-English language, load its dictionary and
// font now (it shows English briefly until the bundle resolves, then re-renders).
if (initialLang !== 'en') {
  ensureFont(initialLang);
  void ensureDictionary(initialLang).then(() => {
    // Re-trigger so react-i18next picks up the newly registered bundle.
    void i18n.changeLanguage(initialLang);
  });
}

export function setLanguage(code: Lang) {
  ensureFont(code);
  void ensureDictionary(code).then(() => {
    void i18n.changeLanguage(code);
  });
  applyHtmlLang(code);
  try {
    localStorage.setItem(storageKeys.lang, code);
  } catch {
    // ignore
  }
}

export default i18n;
