import { Language } from '../types';

import i18n from './i18next-config';

export type Labels = string & { [key: string]: Labels };
export type TranslationObject = Labels;

// Deprecated: translations are now managed by i18next
// We export an empty object or proxy to satisfy legacy imports if any
export const translations: Record<Language, TranslationObject> = {
  en: '' as unknown as TranslationObject,
  zh: '' as unknown as TranslationObject,
  vi: '' as unknown as TranslationObject,
  mn: '' as unknown as TranslationObject,
};

export const getLabels = (language: Language): Labels => {
  // Get raw resource bundle from i18next
  // Note: This requires the language to be loaded.
  const target = i18n.getResourceBundle(language, 'translation') || {};
  const basis = i18n.getResourceBundle('en', 'translation') || {};

  if (language === 'en')
    return (Object.keys(basis).length > 0 ? basis : target) as unknown as Labels;

  // Simple shallow merge approach to ensure missing keys fall back to English
  return { ...basis, ...target } as unknown as Labels;
};

export const getLabel = (labels: Labels, path: readonly string[]): string | undefined => {
  let current: unknown = labels;
  for (const key of path) {
    if (typeof current !== 'object' || current === null) return undefined;
    const record = current as Record<string, unknown>;
    if (!(key in record)) return undefined;
    current = record[key];
  }
  return typeof current === 'string' ? current : undefined;
};

export default translations;
