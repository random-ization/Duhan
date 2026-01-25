export type DictionarySearchResultLike = {
  entries?: Array<{
    word?: string;
    senses?: Array<{
      order?: number;
      definition?: string;
      translation?: { definition?: string; word?: string };
    }>;
  }>;
};

export function cleanDictionaryText(value: string): string {
  return value.replace(/<!\[CDATA\[|\]\]>/g, '').trim();
}

export function normalizeLookupWord(value: string): string {
  return value.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '').trim();
}

function pickMeaningFromSense(sense: {
  definition?: string;
  translation?: { definition?: string; word?: string };
}): string {
  const raw =
    sense.translation?.word || sense.translation?.definition || sense.definition || '';
  return cleanDictionaryText(raw);
}

export function extractBestMeaning(
  result: DictionarySearchResultLike | null | undefined,
  query: string,
  fallbackMeaning: string
): string {
  const normalizedQuery = normalizeLookupWord(query);
  const entries = result?.entries ?? [];
  if (entries.length === 0) return fallbackMeaning;

  const scored = entries
    .map(entry => {
      const entryWord = normalizeLookupWord(entry.word ?? '');
      const exact = entryWord && normalizedQuery && entryWord === normalizedQuery;
      const startsWith = entryWord && normalizedQuery && entryWord.startsWith(normalizedQuery);

      const senses = (entry.senses ?? []).slice().sort((a, b) => {
        const ao = typeof a.order === 'number' ? a.order : Number.POSITIVE_INFINITY;
        const bo = typeof b.order === 'number' ? b.order : Number.POSITIVE_INFINITY;
        return ao - bo;
      });

      const meaning = senses.map(pickMeaningFromSense).find(Boolean) ?? '';

      const score = (exact ? 100 : 0) + (startsWith ? 10 : 0) + (meaning ? 1 : 0);
      return { entry, meaning, score };
    })
    .sort((a, b) => b.score - a.score);

  const best = scored[0];
  return best?.meaning || fallbackMeaning;
}

