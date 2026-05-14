export const SENTENCE_EXPLAINER_SOURCE = 'sentence_explainer';
export const SENTENCE_EXPLANATION_VERSION = 'v1';

export type SupportedSentenceLanguage = 'zh' | 'en' | 'vi' | 'mn';

export type SentenceToken = {
  surface: string;
  lemma?: string;
  partOfSpeech?: string;
  start?: number;
  end?: number;
  length?: number;
  wordPosition?: number;
  sentencePosition?: number;
};

export type SentenceVocabularyItem = {
  surface: string;
  lemma?: string;
  partOfSpeech?: string;
  meaning?: string;
  difficultyLevel?: string;
  difficultyScore?: number;
};

export type SentenceGrammarItem = {
  pattern: string;
  explanation?: string;
  reason?: string;
  start?: number;
  end?: number;
};

export type SentenceExplanationPayload = {
  sentence: string;
  normalizedText?: string;
  summary?: string;
  overallMeaning?: string;
  naturalTranslation?: string;
  tokens?: SentenceToken[];
  vocabulary?: SentenceVocabularyItem[];
  grammar?: SentenceGrammarItem[];
  notes?: string[];
};

export function normalizeSentenceText(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

export function normalizeSentenceLanguage(value?: string): SupportedSentenceLanguage {
  const normalized = (value || '').trim().toLowerCase();
  if (normalized.startsWith('en')) return 'en';
  if (normalized.startsWith('vi') || normalized === 'vn') return 'vi';
  if (normalized.startsWith('mn')) return 'mn';
  return 'zh';
}

export function getSentenceLanguageLabels(language: SupportedSentenceLanguage) {
  const map: Record<SupportedSentenceLanguage, { native: string; english: string }> = {
    zh: { native: '简体中文', english: 'Simplified Chinese' },
    en: { native: 'English', english: 'English' },
    vi: { native: 'Tiếng Việt', english: 'Vietnamese' },
    mn: { native: 'Монгол хэл', english: 'Mongolian' },
  };
  return map[language];
}

export function dedupeByKey<T>(items: T[], getKey: (item: T) => string): T[] {
  const seen = new Set<string>();
  const output: T[] = [];
  for (const item of items) {
    const key = getKey(item);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    output.push(item);
  }
  return output;
}

export function pruneExplanationPayload(
  payload: SentenceExplanationPayload
): SentenceExplanationPayload {
  return {
    sentence: normalizeSentenceText(payload.sentence),
    normalizedText: payload.normalizedText
      ? normalizeSentenceText(payload.normalizedText)
      : undefined,
    summary: payload.summary?.trim() || undefined,
    overallMeaning: payload.overallMeaning?.trim() || undefined,
    naturalTranslation: payload.naturalTranslation?.trim() || undefined,
    tokens:
      payload.tokens
        ?.map(token => ({
          surface: token.surface.trim(),
          lemma: token.lemma?.trim() || undefined,
          partOfSpeech: token.partOfSpeech?.trim() || undefined,
          start: token.start,
          end: token.end,
          length: token.length,
          wordPosition: token.wordPosition,
          sentencePosition: token.sentencePosition,
        }))
        .filter(token => token.surface.length > 0) || [],
    vocabulary:
      payload.vocabulary
        ?.map(item => ({
          surface: item.surface.trim(),
          lemma: item.lemma?.trim() || undefined,
          partOfSpeech: item.partOfSpeech?.trim() || undefined,
          meaning: item.meaning?.trim() || undefined,
          difficultyLevel: item.difficultyLevel?.trim() || undefined,
          difficultyScore: item.difficultyScore,
        }))
        .filter(item => item.surface.length > 0)
        .slice(0, 12) || [],
    grammar:
      payload.grammar
        ?.map(item => ({
          pattern: item.pattern.trim(),
          explanation: item.explanation?.trim() || undefined,
          reason: item.reason?.trim() || undefined,
          start: item.start,
          end: item.end,
        }))
        .filter(item => item.pattern.length > 0)
        .slice(0, 8) || [],
    notes:
      payload.notes
        ?.map(note => note.trim())
        .filter(Boolean)
        .slice(0, 6) || [],
  };
}

export function resolveLocalizedMeaning(
  word: {
    meaning: string;
    meaningEn?: string;
    meaningVi?: string;
    meaningMn?: string;
  },
  language: SupportedSentenceLanguage
): string {
  const candidates =
    language === 'en'
      ? [word.meaningEn, word.meaning, word.meaningVi, word.meaningMn]
      : language === 'vi'
        ? [word.meaningVi, word.meaningEn, word.meaning, word.meaningMn]
        : language === 'mn'
          ? [word.meaningMn, word.meaningEn, word.meaning, word.meaningVi]
          : [word.meaning, word.meaningEn, word.meaningVi, word.meaningMn];
  return (
    candidates.find(candidate => typeof candidate === 'string' && candidate.trim().length > 0) || ''
  );
}
