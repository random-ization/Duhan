/**
 * AI language and text processing utilities
 */

export type SupportedTranslationLanguage = 
  | 'zh' | 'en' | 'vi' | 'mn' | 'ja' | 'es' | 'fr' | 'de' | 'ru' | 'ar';

export function resolveAiOutputLanguage(lang?: string): string {
  if (!lang) return 'zh';
  
  const normalized = lang.toLowerCase().split('-')[0];
  const supported: Record<string, string> = {
    zh: 'zh',
    en: 'en',
    vi: 'vi',
    mn: 'mn',
    ja: 'ja',
    es: 'es',
    fr: 'fr',
    de: 'de',
    ru: 'ru',
    ar: 'ar',
  };
  
  return supported[normalized] || 'zh';
}

export function resolveReadingResponseLanguage(lang?: string): string {
  // For reading analysis, we default to Chinese unless explicitly English
  if (!lang) return 'zh';
  
  const normalized = lang.toLowerCase().split('-')[0];
  if (normalized === 'en') return 'en';
  
  return 'zh';
}

export function normalizeTargetLanguage(lang?: string): SupportedTranslationLanguage | '' {
  if (!lang) return '';
  
  const normalized = lang.toLowerCase().split('-')[0];
  const supported: Record<string, SupportedTranslationLanguage> = {
    zh: 'zh',
    en: 'en',
    vi: 'vi',
    mn: 'mn',
    ja: 'ja',
    es: 'es',
    fr: 'fr',
    de: 'de',
    ru: 'ru',
    ar: 'ar',
  };
  
  return supported[normalized] || '';
}

export function hashText(value: string): string {
  // Simple hash function for caching
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    const char = value.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return hash.toString(36);
}

export function buildAiCacheKey(
  provider: string,
  model: string,
  input: string,
  options?: Record<string, unknown>
): string {
  const optionsHash = options ? hashText(JSON.stringify(options)) : '';
  return `${provider}:${model}:${hashText(input)}:${optionsHash}`;
}

export function normalizeReadingAnalysisPayload(payload: unknown): {
  summary: string;
  vocabulary: Array<{ term: string; meaning: string; level: string }>;
  grammar: Array<{ pattern: string; explanation: string; example: string }>;
} | null {
  if (!payload || typeof payload !== 'object') return null;
  
  const p = payload as Record<string, unknown>;
  
  // Validate and normalize summary
  const summary = typeof p.summary === 'string' ? p.summary.trim() : '';
  if (!summary) return null;
  
  // Validate and normalize vocabulary
  const vocabulary = Array.isArray(p.vocabulary) 
    ? p.vocabulary
        .filter((item): item is { term: string; meaning: string; level: string } => {
          if (!item || typeof item !== 'object') return false;
          const v = item as Record<string, unknown>;
          return typeof v.term === 'string' && 
                 typeof v.meaning === 'string' && 
                 typeof v.level === 'string';
        })
        .map(item => ({
          term: item.term.trim(),
          meaning: item.meaning.trim(),
          level: item.level.trim(),
        }))
        .filter(item => item.term && item.meaning)
    : [];
  
  // Validate and normalize grammar
  const grammar = Array.isArray(p.grammar)
    ? p.grammar
        .filter((item): item is { pattern: string; explanation: string; example: string } => {
          if (!item || typeof item !== 'object') return false;
          const g = item as Record<string, unknown>;
          return typeof g.pattern === 'string' && 
                 typeof g.explanation === 'string' && 
                 typeof g.example === 'string';
        })
        .map(item => ({
          pattern: item.pattern.trim(),
          explanation: item.explanation.trim(),
          example: item.example.trim(),
        }))
        .filter(item => item.pattern && item.explanation)
    : [];
  
  return { summary, vocabulary, grammar };
}

export function normalizeInlineWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

export function splitSentences(value: string): string[] {
  // Split by common sentence delimiters
  return value
    .split(/[.!?。！？]+/)
    .map(s => s.trim())
    .filter(s => s.length > 0);
}

export function clampSummaryText(summary: string, maxChars: number): string {
  if (summary.length <= maxChars) return summary;
  
  // Try to end at a sentence boundary
  const truncated = summary.substring(0, maxChars);
  const lastSentenceEnd = Math.max(
    truncated.lastIndexOf('.'),
    truncated.lastIndexOf('!'),
    truncated.lastIndexOf('?'),
    truncated.lastIndexOf('。'),
    truncated.lastIndexOf('！'),
    truncated.lastIndexOf('？')
  );
  
  if (lastSentenceEnd > maxChars * 0.6) {
    return truncated.substring(0, lastSentenceEnd + 1);
  }
  
  // Fallback to word boundary
  const lastSpace = truncated.lastIndexOf(' ');
  if (lastSpace > maxChars * 0.8) {
    return truncated.substring(0, lastSpace) + '...';
  }
  
  return truncated + '...';
}

export function sanitizeReadingSummary(
  summary: string,
  maxLength: number = 500
): string {
  // Remove excessive whitespace
  let sanitized = normalizeInlineWhitespace(summary);
  
  // Remove common AI artifacts
  sanitized = sanitized
    .replace(/^(Here is|This is|The following is|Below is)\s+/i, '')
    .replace(/\b(the|this|following|above|below)\s+(summary|analysis|text|content|passage)\s+/gi, '')
    .replace(/\b(in summary|to summarize|in conclusion)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
  
  // Clamp length
  return clampSummaryText(sanitized, maxLength);
}

export function normalizeReadingTranslationPayload(payload: unknown): {
  translations: string[];
} | null {
  if (!payload || typeof payload !== 'object') return null;
  
  const p = payload as Record<string, unknown>;
  
  if (!Array.isArray(p.translations)) return null;
  
  const translations = p.translations
    .filter((t): t is string => typeof t === 'string')
    .map(t => t.trim())
    .filter(t => t.length > 0);
  
  return translations.length > 0 ? { translations } : null;
}

export function compactComparableText(value: string): string {
  return value
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s가-힣]/g, '') // Keep alphanumerics, spaces, and Hangul
    .trim();
}

export function countHangulCharacters(value: string): number {
  return (value.match(/[\uAC00-\uD7AF]/g) || []).length;
}

export function isSuspiciousUntranslatedLine(
  line: string,
  threshold: number = 0.3
): boolean {
  const hangulCount = countHangulCharacters(line);
  const totalLength = line.replace(/\s/g, '').length;
  
  if (totalLength === 0) return false;
  
  const hangulRatio = hangulCount / totalLength;
  return hangulRatio < threshold;
}
