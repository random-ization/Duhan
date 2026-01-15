import { Language } from '../types';

import i18n from './i18next-config';

// Type for translation object - exported so components can use it
export type TranslationObject = Record<string, any>;

// Type for accessing labels - allows any string key access
export type Labels = Record<string, any>;

// Deprecated: translations are now managed by i18next
// We export an empty object or proxy to satisfy legacy imports if any
export const translations: Record<Language, TranslationObject> = {
  en: {},
  zh: {},
  vi: {},
  mn: {},
};

export const getLabels = (language: Language): Labels => {
  // Get raw resource bundle from i18next
  // Note: This requires the language to be loaded.
  const target = i18n.getResourceBundle(language, 'translation') || {};
  const basis = i18n.getResourceBundle('en', 'translation') || {};

  if (language === 'en') return Object.keys(basis).length > 0 ? basis : target;

  // Simple shallow merge approach to ensure missing keys fall back to English
  return { ...basis, ...target };
};

export default translations;
