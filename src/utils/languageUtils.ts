import { Language } from '../types';

/**
 * Resolves the localized content from a data object based on the current language.
 *
 * Strategy:
 * - 'en': Try field + 'En', fallback to field.
 * - 'vi': Try field + 'Vi', fallback to field.
 * - 'mn': Try field + 'Mn', fallback to field.
 * - 'zh': Use field (assuming Chinese is the default/primary field).
 * - Default: Use field.
 */
export function getLocalizedContent(
  data: unknown,
  field: string,
  language: Language = 'zh'
): string {
  if (typeof data !== 'object' || data === null) return '';
  const record = data as Record<string, unknown>;

  // Handle nested access (e.g. "examples[0].sentence") - simplisitic implementation for top level mainly
  // If field has dots, we might want a get implementation, but for now let's assume direct access
  // or standard suffix logic.

  let suffix = '';
  switch (language) {
    case 'en':
      suffix = 'En';
      break;
    case 'vi':
      suffix = 'Vi';
      break;
    case 'mn':
      suffix = 'Mn';
      break;
    case 'zh':
      suffix = 'Zh';
      break; // Default field usually
  }

  // Try specific language field
  const specificValue = record[`${field}${suffix}`];
  if (typeof specificValue === 'string' && specificValue.trim() !== '') {
    return specificValue;
  }

  // Fallback logic
  // If we wanted 'vi' but it's missing, maybe we accept 'en' or default?
  // For now, let's fallback to default (Chinese/Korean usually) if specific is missing
  const defaultValue = record[field];

  // If default is missing (rare), try English as a universal fallback if it exists and wasn't tried
  if (typeof defaultValue !== 'string' || defaultValue.trim() === '') {
    const enValue = record[`${field}En`];
    if (typeof enValue === 'string') return enValue;
  }

  return typeof defaultValue === 'string' ? defaultValue : '';
}

/**
 * Returns the localized label for a language code
 */
export function getLanguageLabel(lang: Language): string {
  switch (lang) {
    case 'zh':
      return '中文';
    case 'en':
      return 'English';
    case 'vi':
      return 'Tiếng Việt';
    case 'mn':
      return 'Монгол'; // Mongolian Cyrillic
    default:
      return lang;
  }
}
