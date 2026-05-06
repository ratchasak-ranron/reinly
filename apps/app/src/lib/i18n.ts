import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import th from '@/locales/th.json';
import en from '@/locales/en.json';
import { logger } from './logger';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      th: { translation: th },
      en: { translation: en },
    },
    fallbackLng: 'th',
    supportedLngs: ['th', 'en'],
    interpolation: { escapeValue: false },
    detection: {
      // Skip navigator detection so non-Thai browsers also boot in Thai by
      // default (clinic operators are Thai-first; English stays a manual
      // toggle persisted in localStorage).
      order: ['localStorage'],
      caches: ['localStorage'],
      lookupLocalStorage: 'reinly:lang',
    },
  })
  .catch((err: unknown) => {
    logger.error('i18n init failed', { err: err instanceof Error ? err.message : String(err) });
  });

export default i18n;
