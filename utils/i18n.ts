import { Language } from '../types';
import enTranslations from '../locales/en.json';
import zhTranslations from '../locales/zh.json';
import viTranslations from '../locales/vi.json';
import mnTranslations from '../locales/mn.json';

// Type for translation object
type TranslationObject = {
  [key: string]: string | TranslationObject;
};

// Load translations from JSON files
export const translations: Record<Language, TranslationObject> = {
  en: enTranslations,
  zh: zhTranslations,
  vi: viTranslations,
  mn: mnTranslations,
};

export const getLabels = (language: Language) => {
  return translations[language] || translations.en;
};

export default translations;
