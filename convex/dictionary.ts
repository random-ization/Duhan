'use node';
import { ActionCtx, action } from './_generated/server';
import { makeFunctionReference, type FunctionReference } from 'convex/server';
import { v } from 'convex/values';
import { toErrorMessage } from './errors';
import { tokenizeWithCache } from './kiwi';
import { buildAffixCandidateSet, inferLemma, scoreGrammarMatch } from './grammarMapping';
import type { TokenInfo } from 'kiwi-nlp';
import { GrammarMatch } from './dictionaryQueries';

// ... (rest of imports)

const KRDICT_API_URL = 'https://krdict.korean.go.kr/api/search';
const KRDICT_VIEW_URL = 'https://krdict.korean.go.kr/api/view';

// Translation language codes
// 1: 영어(English), 2: 일본어(Japanese), 3: 프랑스어(French), 4: 스페인어(Spanish)
// 5: 아랍어(Arabic), 6: 몽골어(Mongolian), 7: 베트남어(Vietnamese), 8: 태국어(Thai)
// 9: 인도네시아어(Indonesian), 10: 러시아어(Russian), 11: 중국어(Chinese)
const TRANS_LANG_MAP: Record<string, string> = {
  en: '1',
  ja: '2',
  fr: '3',
  es: '4',
  ar: '5',
  mn: '6',
  vi: '7',
  th: '8',
  id: '9',
  ru: '10',
  zh: '11',
};

const POSTPOSITION_SUFFIXES = [
  '에서부터',
  '으로부터',
  '로부터',
  '에게서',
  '께서',
  '까지',
  '부터',
  '에서',
  '으로',
  '로',
  '에게',
  '한테',
  '께',
  '와',
  '과',
  '도',
  '만',
  '은',
  '는',
  '이',
  '가',
  '을',
  '를',
  '에',
  '의',
];

function normalizeLookupWord(value: string): string {
  return value.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '').trim();
}

function stripPostposition(value: string): string {
  const trimmed = normalizeLookupWord(value);
  for (const suffix of POSTPOSITION_SUFFIXES) {
    if (trimmed.endsWith(suffix) && trimmed.length > suffix.length) {
      return trimmed.slice(0, -suffix.length);
    }
  }
  return trimmed;
}

export interface DictionaryEntry {
  targetCode: string;
  word: string;
  pronunciation?: string;
  wordGrade?: string; // 초급, 중급, 고급
  pos?: string; // 품사 (part of speech)
  link?: string;
  senses: Array<{
    order: number;
    definition: string;
    translation?: {
      lang: string;
      word: string;
      definition: string;
    };
  }>;
}

export interface SearchResult {
  total: number;
  start: number;
  num: number;
  entries: DictionaryEntry[];
}

/**
 * Parse XML response from KRDICT API
 */
function parseSearchXML(xmlText: string): SearchResult {
  // Simple XML parsing without external dependencies
  const getTagContent = (xml: string, tag: string): string => {
    const regex = new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, 'i');
    const match = xml.match(regex);
    return match ? match[1].trim() : '';
  };

  const getAllTagContents = (xml: string, tag: string): string[] => {
    const regex = new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, 'gi');
    const matches = [];
    let match;
    while ((match = regex.exec(xml)) !== null) {
      matches.push(match[1].trim());
    }
    return matches;
  };

  const total = parseInt(getTagContent(xmlText, 'total')) || 0;
  const start = parseInt(getTagContent(xmlText, 'start')) || 1;
  const num = parseInt(getTagContent(xmlText, 'num')) || 10;

  const items = getAllTagContents(xmlText, 'item');
  const entries: DictionaryEntry[] = items.map(item => {
    const senses = getAllTagContents(item, 'sense');

    return {
      targetCode: getTagContent(item, 'target_code'),
      word: getTagContent(item, 'word'),
      pronunciation: getTagContent(item, 'pronunciation') || undefined,
      wordGrade: getTagContent(item, 'word_grade') || undefined,
      pos: getTagContent(item, 'pos') || undefined,
      link: getTagContent(item, 'link') || undefined,
      senses: senses.map((sense, index) => {
        const translations = getAllTagContents(sense, 'translation');
        const firstTranslation = translations[0] || '';

        return {
          order: parseInt(getTagContent(sense, 'sense_order')) || index + 1,
          definition: getTagContent(sense, 'definition'),
          translation: firstTranslation
            ? {
              lang: getTagContent(firstTranslation, 'trans_lang'),
              word: getTagContent(firstTranslation, 'trans_word'),
              definition: getTagContent(firstTranslation, 'trans_dfn'),
            }
            : undefined,
        };
      }),
    };
  });

  return { total, start, num, entries };
}

async function fetchKrdictSearch(args: {
  query: string;
  translationLang?: string;
  start?: number;
  num?: number;
  part?: string;
  sort?: string;
}): Promise<SearchResult | null> {
  const apiKey = process.env.KRDICT_API_KEY;
  if (!apiKey) return null;

  const params = new URLSearchParams({
    key: apiKey,
    q: args.query,
    start: String(args.start || 1),
    num: String(Math.max(10, Math.min(args.num || 10, 100))),
  });

  if (args.part) params.set('part', args.part);
  if (args.sort) params.set('sort', args.sort);

  if (args.translationLang) {
    const transLangCode = TRANS_LANG_MAP[args.translationLang];
    if (transLangCode) {
      params.set('translated', 'y');
      params.set('trans_lang', transLangCode);
    }
  }

  const url = `${KRDICT_API_URL}?${params.toString()}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`KRDICT API error: ${response.status}`);
  }

  const xmlText = await response.text();
  if (xmlText.includes('<error>')) {
    const errorCode = xmlText.match(/<error_code>(\d+)<\/error_code>/)?.[1];
    const errorMsg = xmlText.match(/<message>([^<]+)<\/message>/)?.[1];
    throw new Error(`KRDICT Error ${errorCode}: ${errorMsg}`);
  }
  return parseSearchXML(xmlText);
}

const getWordByLemmaQueryRef = makeFunctionReference<
  'query',
  { lemma: string },
  {
    word: string;
    meaning: string;
    partOfSpeech: string;
    pronunciation?: string;
    hanja?: string;
    audioUrl?: string;
  } | null
>('dictionaryQueries:getWordByLemmaQuery') as unknown as FunctionReference<
  'query',
  'internal',
  { lemma: string },
  {
    word: string;
    meaning: string;
    partOfSpeech: string;
    pronunciation?: string;
    hanja?: string;
    audioUrl?: string;
  } | null
>;

const getGrammarPointsForMatchingQueryRef = makeFunctionReference<
  'query',
  Record<string, never>,
  Array<GrammarMatch & { searchPatterns: string[] }>
>('dictionaryQueries:getGrammarPointsForMatchingQuery') as unknown as FunctionReference<
  'query',
  'internal',
  Record<string, never>,
  Array<GrammarMatch & { searchPatterns: string[] }>
>;


let cachedGrammarPoints:
  | Array<GrammarMatch & { searchPatterns: string[] }>
  | null = null;
let cachedGrammarPointsAt = 0;

async function getGrammarPointsForMatching(
  ctx: ActionCtx
): Promise<Array<GrammarMatch & { searchPatterns: string[] }>> {
  const now = Date.now();
  if (cachedGrammarPoints && now - cachedGrammarPointsAt < 5 * 60_000) return cachedGrammarPoints;
  const all = await ctx.runQuery(getGrammarPointsForMatchingQueryRef, {});
  cachedGrammarPoints = all;
  cachedGrammarPointsAt = now;
  return all;
}

function pickWordTokens(tokens: TokenInfo[], text: string, charIndex?: number, surfaceHint?: string) {
  let anchor: TokenInfo | undefined;
  if (charIndex !== undefined) {
    anchor = tokens.find(t => charIndex >= t.position && charIndex < t.position + t.length);
  }
  if (!anchor && surfaceHint) {
    anchor = tokens.find(t => t.str === surfaceHint);
  }
  if (!anchor) return null;

  const group = tokens.filter(
    t =>
      t.wordPosition === anchor!.wordPosition &&
      t.sentPosition === anchor!.sentPosition &&
      t.lineNumber === anchor!.lineNumber
  );

  const begin = Math.min(...group.map(t => t.position));
  const end = Math.max(...group.map(t => t.position + t.length));
  const surface = begin >= 0 && end <= text.length ? text.slice(begin, end) : surfaceHint || anchor.str;
  return { group, begin, end, surface };
}

export const lookupWithMorphology = action({
  args: {
    surface: v.string(),
    contextText: v.optional(v.string()),
    charIndexInContext: v.optional(v.number()),
    translationLang: v.optional(v.string()),
    num: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const text = args.contextText || args.surface;
    let tokenGroup: ReturnType<typeof pickWordTokens> | null = null;
    let tokens: TokenInfo[] = [];
    try {
      // Add a timeout for kiwi tokenization to avoid hanging requests
      const tokenizationPromise = tokenizeWithCache(text);
      const timeoutPromise = new Promise<TokenInfo[]>((_, reject) =>
        setTimeout(() => reject(new Error('Kiwi tokenization timed out')), 5000)
      );

      tokens = await Promise.race([tokenizationPromise, timeoutPromise]);
      tokenGroup = pickWordTokens(tokens, text, args.charIndexInContext, args.surface);
    } catch (error: unknown) {
      console.error('[Dictionary] Kiwi tokenization failed:', toErrorMessage(error));
      tokenGroup = null;
    }

    const morphemes = tokenGroup?.group ?? [];
    const { lemma, pos } = inferLemma(morphemes, args.surface);
    const surfaceFromContext = tokenGroup?.surface ?? args.surface;

    const affixForms = morphemes
      .filter(t => t.tag.startsWith('E') || t.tag.startsWith('J'))
      .map(t => t.str);
    const affixCandidates = buildAffixCandidateSet(affixForms);

    let grammarMatches: GrammarMatch[] = [];
    try {
      if (affixCandidates.size > 0) {
        const grammarPoints = await getGrammarPointsForMatching(ctx);
        const scored = grammarPoints
          .map(g => ({
            ...g,
            score: scoreGrammarMatch(g.searchPatterns, affixCandidates),
          }))
          .filter(g => g.score > 0)
          .sort((a, b) => b.score - a.score)
          .slice(0, 5)
          .map(g => ({ id: g.id, title: g.title, summary: g.summary, type: g.type, level: g.level }));
        grammarMatches = scored;
      }
    } catch {
      grammarMatches = [];
    }

    const wordFromDb = await ctx.runQuery(getWordByLemmaQueryRef, { lemma });

    let krdict: SearchResult | null = null;
    let krdictError: string | null = null;
    const queryCandidates = [
      normalizeLookupWord(lemma),
      normalizeLookupWord(surfaceFromContext),
      normalizeLookupWord(args.surface),
      stripPostposition(lemma),
      stripPostposition(surfaceFromContext),
      stripPostposition(args.surface),
    ]
      .map(value => value.trim())
      .filter(Boolean);
    const seen = new Set<string>();
    const uniqueCandidates = queryCandidates.filter(value => {
      if (seen.has(value)) return false;
      seen.add(value);
      return true;
    });
    try {
      for (const query of uniqueCandidates) {
        const res = await fetchKrdictSearch({
          query,
          translationLang: args.translationLang,
          num: args.num ?? 10,
          part: 'word',
          sort: 'dict',
        });
        krdict = res;
        if (res?.entries?.length) break;
      }
    } catch (error: unknown) {
      krdictError = toErrorMessage(error);
    }

    return {
      token: tokenGroup
        ? { surface: surfaceFromContext, lemma, pos: pos ?? null, begin: tokenGroup.begin, len: tokenGroup.end - tokenGroup.begin }
        : { surface: args.surface, lemma, pos: pos ?? null, begin: null, len: null },
      morphemes: morphemes.map(t => ({
        form: t.str,
        tag: t.tag,
        begin: t.position,
        len: t.length,
      })),
      wordFromDb: wordFromDb
        ? {
          word: wordFromDb.word,
          meaning: wordFromDb.meaning,
          partOfSpeech: wordFromDb.partOfSpeech,
          pronunciation: wordFromDb.pronunciation,
          hanja: wordFromDb.hanja,
          audioUrl: wordFromDb.audioUrl,
        }
        : null,
      grammarMatches,
      krdict,
      krdictError,
    };
  },
});

/**
 * Search Korean dictionary
 */
export const searchDictionary = action({
  args: {
    query: v.string(),
    translationLang: v.optional(v.string()), // en, zh, vi, mn, ja, etc.
    start: v.optional(v.number()), // Starting index (default 1)
    num: v.optional(v.number()), // Number of results (default 10, max 100)
    part: v.optional(v.string()), // word, dfn, exam (search in word, definition, or example)
    sort: v.optional(v.string()), // dict (dictionary order), popular (by popularity)
  },
  handler: async (_ctx, args) => {
    const apiKey = process.env.KRDICT_API_KEY;
    if (!apiKey) {
      throw new Error('Missing KRDICT_API_KEY environment variable');
    }

    const params = new URLSearchParams({
      key: apiKey,
      q: args.query,
      start: String(args.start || 1),
      num: String(Math.max(10, Math.min(args.num || 10, 100))),
    });

    // Add optional parameters
    if (args.part) {
      params.set('part', args.part);
    }
    if (args.sort) {
      params.set('sort', args.sort);
    }

    // Add translation if requested
    if (args.translationLang) {
      const transLangCode = TRANS_LANG_MAP[args.translationLang];
      if (transLangCode) {
        params.set('translated', 'y');
        params.set('trans_lang', transLangCode);
      }
    }

    const url = `${KRDICT_API_URL}?${params.toString()}`;
    console.log('[KRDICT] Searching:', args.query);

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`KRDICT API error: ${response.status}`);
      }

      const xmlText = await response.text();

      // Check for error response
      if (xmlText.includes('<error>')) {
        const errorCode = xmlText.match(/<error_code>(\d+)<\/error_code>/)?.[1];
        const errorMsg = xmlText.match(/<message>([^<]+)<\/message>/)?.[1];
        throw new Error(`KRDICT Error ${errorCode}: ${errorMsg}`);
      }

      const result = parseSearchXML(xmlText);
      console.log(`[KRDICT] Found ${result.total} results for "${args.query}"`);

      return result;
    } catch (error: unknown) {
      console.error('[KRDICT] Error:', toErrorMessage(error));
      throw error;
    }
  },
});

/**
 * Get detailed word information by target code
 */
export const getWordDetail = action({
  args: {
    targetCode: v.string(),
    translationLang: v.optional(v.string()),
  },
  handler: async (_ctx, args) => {
    const apiKey = process.env.KRDICT_API_KEY;
    if (!apiKey) {
      throw new Error('Missing KRDICT_API_KEY environment variable');
    }

    const params = new URLSearchParams({
      key: apiKey,
      q: args.targetCode,
      method: 'target_code',
    });

    // Add translation if requested
    if (args.translationLang) {
      const transLangCode = TRANS_LANG_MAP[args.translationLang];
      if (transLangCode) {
        params.set('translated', 'y');
        params.set('trans_lang', transLangCode);
      }
    }

    const url = `${KRDICT_VIEW_URL}?${params.toString()}`;
    console.log('[KRDICT] Getting detail for:', args.targetCode);

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`KRDICT API error: ${response.status}`);
      }

      const xmlText = await response.text();

      // Check for error response
      if (xmlText.includes('<error>')) {
        const errorCode = xmlText.match(/<error_code>(\d+)<\/error_code>/)?.[1];
        const errorMsg = xmlText.match(/<message>([^<]+)<\/message>/)?.[1];
        throw new Error(`KRDICT Error ${errorCode}: ${errorMsg}`);
      }

      const result = parseSearchXML(xmlText);
      return result.entries[0] || null;
    } catch (error: unknown) {
      console.error('[KRDICT] Error:', toErrorMessage(error));
      throw error;
    }
  },
});
