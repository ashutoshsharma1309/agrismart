import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from './en.json';
import hi from './hi.json';
import kn from './kn.json';
import ta from './ta.json';
import te from './te.json';
import mr from './mr.json';

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
  resources: {
    en: { translation: en },
    hi: { translation: hi },
    kn: { translation: kn },
    ta: { translation: ta },
    te: { translation: te },
    mr: { translation: mr },
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

export function setLanguage(code: Lang) {
  void i18n.changeLanguage(code);
  applyHtmlLang(code);
  try {
    localStorage.setItem(storageKeys.lang, code);
  } catch {
    // ignore
  }
}

export default i18n;
