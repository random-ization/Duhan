import { Language } from '../types';
import enTranslations from '../locales/en.json';
import zhTranslations from '../locales/zh.json';
import viTranslations from '../locales/vi.json';
import mnTranslations from '../locales/mn.json';

// Type for translation object - exported so components can use it
export type TranslationObject = Record<string, any>;

// Type for accessing labels - allows any string key access
export type Labels = Record<string, any>;

// Load translations from JSON files
export const translations: Record<Language, TranslationObject> = {
  en: enTranslations as any,
  zh: zhTranslations as any,
  vi: viTranslations as any,
  mn: mnTranslations as any,
};

// Helper to deep merge objects
const deepMerge = (target: any, source: any): any => {
  const result = { ...target };
  for (const key in source) {
    if (source[key] instanceof Object && key in target) {
      Object.assign(source[key], deepMerge(target[key], source[key]));
    }
  }
  Object.assign(result || {}, source);
  return result;
}

export const getLabels = (language: Language): Labels => {
  const target = translations[language];
  const basis = translations.en;

  if (language === 'en') return basis;

  // Simple shallow merge approach to ensure missing keys fall back to English
  // For deep objects (like tooltips or instructions), we might want a deeper merge if needed.
  // Currently most keys are top-level strings.
  return { ...basis, ...target };
};

export default translations;
