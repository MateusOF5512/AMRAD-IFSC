import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import pt from './locales/pt.json';
import en from './locales/en.json';

export const SUPPORTED_LANGUAGES = {
  pt: 'Português',
  en: 'Inglês',
} as const;

export type SupportedLocale = keyof typeof SUPPORTED_LANGUAGES;

/** Map user profile language string → locale code */
export function mapLanguageToLocale(language: string | null | undefined): SupportedLocale {
  if (!language) return 'pt';
  const lower = language.toLowerCase();
  if (lower === 'inglês' || lower === 'english' || lower === 'en') return 'en';
  return 'pt';
}

i18n
  .use(initReactI18next)
  .init({
    resources: {
      pt: { translation: pt },
      en: { translation: en },
    },
    lng: 'pt',
    fallbackLng: 'pt',
    interpolation: {
      escapeValue: false, // React already escapes
    },
  });

export default i18n;
