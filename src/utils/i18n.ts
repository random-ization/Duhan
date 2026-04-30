import { Language } from '../types';

import i18n from './i18next-config';

export interface Labels {
  [key: string]: any;
}
// Deprecated: translations are now managed by i18next
// We export an empty object or proxy to satisfy legacy imports if any
export const translations: Record<Language, Labels> = {
  en: '' as unknown as Labels,
  zh: '' as unknown as Labels,
  vi: '' as unknown as Labels,
  mn: '' as unknown as Labels,
};

export const getLabels = (language: Language): Labels => {
  const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === 'object' && value !== null && !Array.isArray(value);

  const deepMerge = (base: Record<string, unknown>, override: Record<string, unknown>): Record<string, unknown> => {
    const result: Record<string, unknown> = { ...base };
    for (const [key, overrideValue] of Object.entries(override)) {
      const baseValue = result[key];
      if (isRecord(baseValue) && isRecord(overrideValue)) {
        result[key] = deepMerge(baseValue, overrideValue);
        continue;
      }
      result[key] = overrideValue;
    }
    return result;
  };

  const mergeNamespaces = (lang: Language): Record<string, unknown> => {
    const publicBundle = i18n.getResourceBundle(lang, 'public');
    const appBundle = i18n.getResourceBundle(lang, 'app');
    const publicRecord = isRecord(publicBundle) ? publicBundle : {};
    const appRecord = isRecord(appBundle) ? appBundle : {};
    return deepMerge(publicRecord, appRecord);
  };

  const target = mergeNamespaces(language);
  const basis = mergeNamespaces('en');

  if (language === 'en')
    return (Object.keys(basis).length > 0 ? basis : target) as unknown as Labels;

  return deepMerge(basis, target) as unknown as Labels;
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
