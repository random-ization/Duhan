'use node';
import { action, internalAction, type ActionCtx } from './_generated/server';
import { ConvexError, v } from 'convex/values';
import { api, internal } from './_generated/api';
import { makeFunctionReference } from 'convex/server';
import type { FunctionReference } from 'convex/server';
import OpenAI from 'openai';
import { createClient } from '@deepgram/sdk';
import { createHash } from 'node:crypto';
import { getAuthUserId } from '@convex-dev/auth/server';
import type { Doc, Id } from './_generated/dataModel';
import { createPresignedUploadUrl } from './storagePresign';
import { assertProductionRuntimeEnv } from './env';
import {
  fetchWithTimeout,
  isLikelyTransientError,
  isRetryableHttpStatus,
  parseJsonObjectFromModelContent,
  retryAsync,
} from './aiReliability';
import {
  isModelAccessError,
  resolveChatProviderConfigs,
  type ChatProviderConfig,
} from './aiProviders';
import { aiLogger } from './logger';

assertProductionRuntimeEnv();

const logAI = (msg: string) => aiLogger.info(msg);

const logUsageMutation = internal.aiUsageLogs.logUsage;
const logFailureMutation = internal.aiUsageLogs.logFailure;
const logInvocationMutation = internal.aiUsageLogs.logInvocation;
const getAiCacheByKeyQuery = internal.aiCache.getByKey;
const upsertAiCacheMutation = internal.aiCache.upsert;
const getViewerAccessInternalQuery = makeFunctionReference<
  'query',
  { userId: Id<'users'> },
  {
    plan: 'FREE' | 'PRO' | 'LIFETIME';
    remaining: { aiCreditsDaily: number | null };
  }
>('entitlements:getViewerAccessInternal') as unknown as FunctionReference<
  'query',
  'internal',
  { userId: Id<'users'> },
  {
    plan: 'FREE' | 'PRO' | 'LIFETIME';
    remaining: { aiCreditsDaily: number | null };
  }
>;
const consumeFeatureUsageInternalMutation = makeFunctionReference<
  'mutation',
  {
    userId: Id<'users'>;
    plan: 'FREE' | 'PRO' | 'LIFETIME';
    feature: 'ai_credits_daily';
    amount?: number;
    resourceKey?: string;
    dedupeByResource?: boolean;
    upgradeSource?: string;
  },
  { allowed: boolean; remaining: number | null; reason?: string; upgradeSource?: string | null }
>('entitlements:consumeFeatureUsageInternal') as unknown as FunctionReference<
  'mutation',
  'internal',
  {
    userId: Id<'users'>;
    plan: 'FREE' | 'PRO' | 'LIFETIME';
    feature: 'ai_credits_daily';
    amount?: number;
    resourceKey?: string;
    dedupeByResource?: boolean;
    upgradeSource?: string;
  },
  { allowed: boolean; remaining: number | null; reason?: string; upgradeSource?: string | null }
>;

const AI_CACHE_VERSION = 'v1';
const READING_ANALYSIS_PROMPT_VERSION = 'v2';
type SupportedTranslationLanguage = 'zh' | 'en' | 'vi' | 'mn';

// Minimal error formatter
function toErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

function resolveErrorHttpStatus(error: unknown): number | undefined {
  if (!error || typeof error !== 'object') return undefined;
  const candidate = error as Record<string, unknown>;
  if (typeof candidate.status === 'number') return candidate.status;
  if (
    candidate.response &&
    typeof candidate.response === 'object' &&
    typeof (candidate.response as Record<string, unknown>).status === 'number'
  ) {
    return (candidate.response as Record<string, unknown>).status as number;
  }
  return undefined;
}

function resolveErrorCode(error: unknown): string {
  if (!error || typeof error !== 'object') return 'UNKNOWN';
  const candidate = error as Record<string, unknown>;
  if (typeof candidate.code === 'string' && candidate.code.trim()) {
    return candidate.code.trim().toUpperCase();
  }
  const status = resolveErrorHttpStatus(error);
  if (status) return `HTTP_${status}`;
  const message = toErrorMessage(error).toLowerCase();
  if (message.includes('timeout') || message.includes('timed out')) return 'TIMEOUT';
  if (message.includes('rate limit') || message.includes('429')) return 'RATE_LIMIT';
  if (message.includes('unauthorized') || message.includes('forbidden')) return 'AUTH';
  return 'UNKNOWN';
}

function resolveReadableAiErrorCode(error: unknown): string {
  const message = toErrorMessage(error).toUpperCase();
  if (message.includes('DAILY_LIMIT_REACHED')) return 'DAILY_LIMIT_REACHED';
  if (message.includes('UNAUTHORIZED')) return 'UNAUTHORIZED';
  if (message.includes('FORBIDDEN')) return 'FORBIDDEN';
  return resolveErrorCode(error);
}

async function logAiFailure(
  ctx: ActionCtx,
  args: {
    userId?: Id<'users'>;
    feature: string;
    model: string;
    provider?: string;
    retries?: number;
    startedAt?: number;
    error: unknown;
  }
) {
  try {
    await ctx.runMutation(logFailureMutation, {
      userId: args.userId,
      feature: args.feature,
      model: args.model,
      provider: args.provider,
      errorCode: resolveErrorCode(args.error),
      errorMessage: toErrorMessage(args.error),
      retries: args.retries,
      durationMs: args.startedAt ? Date.now() - args.startedAt : undefined,
      httpStatus: resolveErrorHttpStatus(args.error),
    });
  } catch (logError) {
    console.warn('[AI] Failed to log AI failure:', toErrorMessage(logError));
  }
}

async function requireAuthenticatedUser(ctx: ActionCtx): Promise<Id<'users'>> {
  const userId = await getAuthUserId(ctx);
  if (!userId) {
    throw new ConvexError('UNAUTHORIZED');
  }
  return userId as Id<'users'>;
}

async function enforceAiDailyLimit(
  ctx: ActionCtx,
  userId: Id<'users'>,
  feature: string,
  cost: number = 1
) {
  const snapshot = await ctx.runQuery(getViewerAccessInternalQuery, { userId });
  const result = await ctx.runMutation(consumeFeatureUsageInternalMutation, {
    userId,
    plan: snapshot.plan,
    feature: 'ai_credits_daily',
    amount: cost,
    resourceKey: feature,
    upgradeSource: 'ai_limit',
  });

  if (!result.allowed) {
    throw new ConvexError({
      code: 'DAILY_LIMIT_REACHED',
      feature: 'ai_credits_daily',
      upgradeSource: 'ai_limit',
      remaining: result.remaining,
    });
  }

  await ctx.runMutation(logInvocationMutation, { userId, feature });
}

async function guardAiAction(
  ctx: ActionCtx,
  feature: string,
  cost: number = 1
): Promise<Id<'users'>> {
  const userId = await requireAuthenticatedUser(ctx);
  await enforceAiDailyLimit(ctx, userId, feature, cost);
  return userId;
}

async function requireAdminAction(ctx: ActionCtx): Promise<void> {
  const userId = await requireAuthenticatedUser(ctx);
  const viewer = await ctx.runQuery(api.users.viewer, {});
  if (!viewer || viewer._id !== userId || viewer.role !== 'ADMIN') {
    throw new ConvexError('FORBIDDEN');
  }
}

const SUPPORTED_TRANSLATION_LANGS = new Set<SupportedTranslationLanguage>(['zh', 'en', 'vi', 'mn']);
const TARGET_LANGUAGE_LABELS: Record<SupportedTranslationLanguage, string> = {
  zh: 'Simplified Chinese',
  en: 'English',
  vi: 'Vietnamese',
  mn: 'Mongolian',
};

const READING_RESPONSE_LANGUAGE_LABELS: Record<SupportedTranslationLanguage, string> = {
  zh: '简体中文',
  en: 'English',
  vi: 'Tiếng Việt',
  mn: 'Монгол хэл',
};

function resolveAiOutputLanguage(lang?: string) {
  const code = normalizeTargetLanguage(lang) || 'zh';
  return {
    code,
    englishLabel: TARGET_LANGUAGE_LABELS[code] || 'Simplified Chinese',
    nativeLabel: READING_RESPONSE_LANGUAGE_LABELS[code] || '简体中文',
  };
}

function resolveReadingResponseLanguage(lang?: string) {
  const normalized = resolveAiOutputLanguage(lang);
  return {
    code: normalized.code,
    label: normalized.nativeLabel,
  };
}

function normalizeTargetLanguage(lang?: string): SupportedTranslationLanguage | '' {
  if (!lang) return '';
  const normalized = lang.trim().toLowerCase();

  if (
    normalized === 'zh' ||
    normalized === 'zh-cn' ||
    normalized === 'zh-hans' ||
    normalized === 'cn'
  ) {
    return 'zh';
  }
  if (normalized === 'en' || normalized.startsWith('en-')) {
    return 'en';
  }
  if (normalized === 'vi' || normalized === 'vn' || normalized.startsWith('vi-')) {
    return 'vi';
  }
  if (normalized === 'mn' || normalized.startsWith('mn-') || normalized === 'mongolian') {
    return 'mn';
  }

  return SUPPORTED_TRANSLATION_LANGS.has(normalized as SupportedTranslationLanguage)
    ? (normalized as SupportedTranslationLanguage)
    : '';
}

type ReadingVocabularyItem = {
  term: string;
  meaning: string;
  level: string;
};

type ReadingGrammarItem = {
  pattern: string;
  explanation: string;
  example: string;
};

type ReadingAnalysisResult = {
  summary: string;
  vocabulary: ReadingVocabularyItem[];
  grammar: ReadingGrammarItem[];
};

type ReadingTranslationResult = {
  translations: string[];
};

function hashText(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function buildAiCacheKey(
  kind: 'reading_analysis' | 'reading_translation',
  language: string,
  contentHash: string
): string {
  return hashText(`${AI_CACHE_VERSION}|${kind}|${language}|${contentHash}`);
}

function normalizeReadingAnalysisPayload(
  payload: unknown,
  fallbackSummary: string
): ReadingAnalysisResult | null {
  const parsed = payload as
    | {
        summary?: unknown;
        vocabulary?: Array<{ term?: unknown; meaning?: unknown; level?: unknown }>;
        grammar?: Array<{ pattern?: unknown; explanation?: unknown; example?: unknown }>;
      }
    | null
    | undefined;
  if (!parsed || typeof parsed !== 'object') return null;

  const summary =
    typeof parsed.summary === 'string' && parsed.summary.trim()
      ? parsed.summary.trim()
      : fallbackSummary;
  const vocabulary = Array.isArray(parsed.vocabulary)
    ? parsed.vocabulary
        .map(item => ({
          term: typeof item.term === 'string' ? item.term.trim() : '',
          meaning: typeof item.meaning === 'string' ? item.meaning.trim() : '',
          level: typeof item.level === 'string' ? item.level.trim() : '',
        }))
        .filter(item => Boolean(item.term))
        .slice(0, 8)
    : [];
  const grammar = Array.isArray(parsed.grammar)
    ? parsed.grammar
        .map(item => ({
          pattern: typeof item.pattern === 'string' ? item.pattern.trim() : '',
          explanation: typeof item.explanation === 'string' ? item.explanation.trim() : '',
          example: typeof item.example === 'string' ? item.example.trim() : '',
        }))
        .filter(item => Boolean(item.pattern))
        .slice(0, 4)
    : [];

  return {
    summary,
    vocabulary,
    grammar,
  };
}

function normalizeInlineWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function splitSentences(value: string): string[] {
  return value
    .split(/(?<=[。！？.!?])\s+/)
    .map(item => item.trim())
    .filter(Boolean);
}

function clampSummaryText(summary: string, maxChars: number): string {
  const normalized = normalizeInlineWhitespace(summary);
  if (!normalized) return '';
  if (normalized.length <= maxChars) return normalized;

  const sentences = splitSentences(normalized);
  if (sentences.length > 0) {
    const selected: string[] = [];
    let used = 0;
    for (const sentence of sentences) {
      const addedLength = sentence.length + (selected.length > 0 ? 1 : 0);
      if (used + addedLength > maxChars) break;
      selected.push(sentence);
      used += addedLength;
      if (selected.length >= 2) break;
    }
    if (selected.length > 0) {
      return normalizeInlineWhitespace(selected.join(' '));
    }
  }

  const sliced = normalized.slice(0, Math.max(20, maxChars - 1)).trim();
  return sliced.endsWith('…') ? sliced : `${sliced}…`;
}

function sanitizeReadingSummary(
  summary: string,
  bodyText: string,
  fallbackSummary: string,
  language: SupportedTranslationLanguage
): string {
  const cleanedSummary = normalizeInlineWhitespace(summary);
  const cleanedBody = normalizeInlineWhitespace(bodyText);
  const fallback = normalizeInlineWhitespace(fallbackSummary);
  if (!cleanedSummary) return fallback;

  const baseMaxByLang: Record<SupportedTranslationLanguage, number> = {
    zh: 120,
    en: 260,
    vi: 260,
    mn: 260,
  };
  const dynamicCap = Math.max(48, Math.floor(cleanedBody.length * 0.45));
  const maxChars = Math.min(baseMaxByLang[language], dynamicCap);

  const compactSummary = cleanedSummary.replace(/\s+/g, '');
  const compactBody = cleanedBody.replace(/\s+/g, '');
  const looksLikeFullCopy =
    compactSummary.length > 36 &&
    (compactBody.includes(compactSummary) ||
      cleanedSummary.length >= Math.floor(cleanedBody.length * 0.7));

  if (looksLikeFullCopy) {
    const firstSentence = splitSentences(cleanedSummary)[0] || cleanedSummary;
    return clampSummaryText(firstSentence, maxChars);
  }

  return clampSummaryText(cleanedSummary, maxChars);
}

function normalizeReadingTranslationPayload(
  payload: unknown,
  expectedCount: number
): ReadingTranslationResult | null {
  const parsed = payload as { translations?: unknown } | null | undefined;
  if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.translations)) {
    return null;
  }
  const translations = parsed.translations
    .slice(0, expectedCount)
    .map(item => (typeof item === 'string' ? item : ''));
  if (translations.length < expectedCount) {
    translations.push(...new Array(expectedCount - translations.length).fill(''));
  }
  return { translations };
}

type DeepgramWord = {
  word?: string;
  punctuated_word?: string;
  start?: number;
  end?: number;
};

type WhisperSegment = {
  start?: number;
  end?: number;
  text?: string;
};

type TranscriptRecord = Doc<'podcast_transcripts'>;
type TranscriptSegment = TranscriptRecord['segments'][number];
type ChatCompletionLike = {
  choices: Array<{ message?: { content?: string | null } }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
};

type ChatCompletionWithProvider<T extends ChatCompletionLike> = {
  completion: T;
  provider: ChatProviderConfig;
};

type SegmentTranslationResult = {
  translations: string[];
  provider: ChatProviderConfig | null;
};
type SegmentInput = {
  start?: number;
  end?: number;
  text?: string;
  translation?: string;
  words?: TranscriptSegment['words'];
};

function createChatClient(config: ChatProviderConfig, timeout = 25000) {
  return new OpenAI({
    apiKey: config.apiKey,
    ...(config.baseURL ? { baseURL: config.baseURL } : {}),
    timeout,
  });
}

async function runChatCompletionWithFallback<T extends ChatCompletionLike>(
  request: (args: { client: OpenAI; provider: ChatProviderConfig }) => Promise<T>,
  options?: { label?: string; timeoutMs?: number }
): Promise<ChatCompletionWithProvider<T>> {
  const providers = resolveChatProviderConfigs(process.env);
  if (providers.length === 0) {
    throw new Error('No AI chat provider configured');
  }

  let lastError: unknown;

  for (const provider of providers) {
    try {
      const client = createChatClient(provider, options?.timeoutMs ?? 25000);
      const completion = await request({ client, provider });
      return { completion, provider };
    } catch (error) {
      lastError = error;
      console.warn(
        `[AI] ${options?.label || 'chat_completion'} failed on ${provider.provider}:${provider.model}: ${toErrorMessage(error)}`
      );

      // Try the next provider for model access issues and transient outages alike.
      if (provider !== providers[providers.length - 1]) {
        continue;
      }
    }
  }

  throw lastError ?? new Error('All AI chat providers failed');
}

function normalizeTranscriptWords(input: unknown): TranscriptSegment['words'] {
  if (!Array.isArray(input)) return undefined;
  const words = input
    .map(item => {
      if (!item || typeof item !== 'object') return null;
      const candidate = item as Record<string, unknown>;
      const word =
        typeof candidate.word === 'string'
          ? candidate.word.trim()
          : typeof candidate.punctuated_word === 'string'
            ? candidate.punctuated_word.trim()
            : '';
      const start = typeof candidate.start === 'number' ? candidate.start : null;
      const end = typeof candidate.end === 'number' ? candidate.end : null;
      if (!word || start === null || end === null) return null;
      return { word, start, end };
    })
    .filter((item): item is { word: string; start: number; end: number } => item !== null);

  return words.length > 0 ? words : undefined;
}

type DeepgramUtterance = {
  start?: number;
  end?: number;
  transcript?: string;
  words?: unknown;
};

type DeepgramParagraphSentence = {
  start?: number;
  end?: number;
  text?: string;
  words?: unknown;
};

type DeepgramParagraph = {
  sentences?: DeepgramParagraphSentence[];
};

type DeepgramAlternative = {
  words?: DeepgramWord[];
  transcript?: string;
  paragraphs?: {
    paragraphs?: DeepgramParagraph[];
  };
};

type DeepgramResponse = {
  results?: {
    channels?: Array<{
      alternatives?: DeepgramAlternative[];
    }>;
    utterances?: DeepgramUtterance[];
  };
};

function buildSegmentsFromWords(words: DeepgramWord[]) {
  const segments: TranscriptSegment[] = [];

  let currentWords: { word: string; start: number; end: number }[] = [];
  let currentText: string[] = [];
  let segStart: number | null = null;
  let prevEnd: number | null = null;

  const flush = () => {
    if (currentWords.length === 0 || segStart === null || prevEnd === null) return;
    const text = currentText.join(' ').trim();
    if (text.length === 0) return;
    segments.push({
      start: segStart,
      end: prevEnd,
      text,
      translation: '',
      words: currentWords,
    });
    currentWords = [];
    currentText = [];
    segStart = null;
  };

  for (const w of words) {
    const wordText = (w.punctuated_word || w.word || '').trim();
    if (!wordText) continue;

    const start = typeof w.start === 'number' ? w.start : null;
    const end = typeof w.end === 'number' ? w.end : null;

    const gap = prevEnd !== null && start !== null && start - prevEnd > 1.0;
    if (gap) flush();

    if (segStart === null && start !== null) segStart = start;

    currentWords.push({
      word: wordText,
      start: start ?? prevEnd ?? 0,
      end: end ?? prevEnd ?? 0,
    });
    currentText.push(wordText);

    if (end !== null) prevEnd = end;

    const duration = segStart !== null && prevEnd !== null ? prevEnd - segStart : 0;
    const endPunct = /[.!?。？！]$/.test(wordText);
    const tooLong = currentText.length >= 18 || duration > 12;

    if (endPunct || tooLong) flush();
  }

  flush();
  return segments;
}

function extractSegmentsFromDeepgramResult(result: unknown): TranscriptSegment[] {
  const parsed = result as DeepgramResponse;
  const alt = parsed.results?.channels?.[0]?.alternatives?.[0];

  if (!alt) {
    throw new Error('Deepgram returned no results');
  }

  const utterances = parsed.results?.utterances;
  const paragraphs = alt.paragraphs;

  if (Array.isArray(utterances) && utterances.length > 0) {
    const segments = utterances
      .map(
        (u): SegmentInput => ({
          start: typeof u.start === 'number' ? u.start : undefined,
          end: typeof u.end === 'number' ? u.end : undefined,
          text: typeof u.transcript === 'string' ? u.transcript.trim() : '',
          translation: '',
          words: normalizeTranscriptWords(u.words),
        })
      )
      .filter(segment => Boolean(segment.text));
    return mergeShortSegments(segments);
  }

  if (Array.isArray(paragraphs?.paragraphs)) {
    const allSentences = paragraphs.paragraphs.flatMap(p => p.sentences || []);
    const segments = allSentences
      .map(
        (s): SegmentInput => ({
          start: typeof s.start === 'number' ? s.start : undefined,
          end: typeof s.end === 'number' ? s.end : undefined,
          text: typeof s.text === 'string' ? s.text.trim() : '',
          translation: '',
          words: normalizeTranscriptWords(s.words),
        })
      )
      .filter(segment => Boolean(segment.text));
    return mergeShortSegments(segments);
  }

  if (Array.isArray(alt.words) && alt.words.length > 0) {
    logAI('Deepgram paragraphs/utterances not found, building segments from words...');
    return mergeShortSegments(buildSegmentsFromWords(alt.words));
  }

  if (typeof alt.transcript === 'string' && alt.transcript.trim().length > 0) {
    logAI('Deepgram returned transcript only; emitting a single segment.');
    return mergeShortSegments([
      {
        start: 0,
        end: 0,
        text: alt.transcript.trim(),
        translation: '',
      },
    ]);
  }

  throw new Error('Deepgram returned no usable segments');
}

function mergeShortSegments(segments: SegmentInput[]): TranscriptSegment[] {
  if (!Array.isArray(segments) || segments.length === 0) return [];

  const MIN_CHARS = 24;
  const MIN_DURATION = 2.5;
  const MAX_CHARS = 140;
  const MAX_DURATION = 14;
  const MAX_GAP_SECONDS = 1.5;

  const merged: TranscriptSegment[] = [];
  let current: TranscriptSegment | null = null;

  const flush = () => {
    if (current) {
      merged.push(current);
      current = null;
    }
  };

  for (const seg of segments) {
    const text = typeof seg.text === 'string' ? seg.text.trim() : '';
    if (!text) continue;

    const segStart = typeof seg.start === 'number' ? seg.start : null;
    const segEnd = typeof seg.end === 'number' ? seg.end : null;
    const segWords = normalizeTranscriptWords(seg.words);
    const segTranslation = typeof seg.translation === 'string' ? seg.translation : '';

    if (!current) {
      current = {
        start: segStart ?? 0,
        end: segEnd ?? segStart ?? 0,
        text,
        translation: segTranslation,
        words: segWords,
      };
      continue;
    }

    const currentEnd = typeof current.end === 'number' ? current.end : null;
    const gap = currentEnd !== null && segStart !== null ? Math.max(0, segStart - currentEnd) : 0;
    if (gap > MAX_GAP_SECONDS) {
      flush();
      current = {
        start: segStart ?? 0,
        end: segEnd ?? segStart ?? 0,
        text,
        translation: segTranslation,
        words: segWords,
      };
      continue;
    }

    const separator = current.text.endsWith(' ') ? '' : ' ';
    current.text = `${current.text}${separator}${text}`.replace(/\s+/g, ' ').trim();
    if (segEnd !== null) {
      current.end = segEnd;
    }
    if (Array.isArray(segWords)) {
      current.words = Array.isArray(current.words)
        ? [...current.words, ...segWords]
        : [...segWords];
    }

    const duration =
      typeof current.start === 'number' && typeof current.end === 'number'
        ? current.end - current.start
        : 0;
    const textLength = current.text.length;
    const endsWithPunct = /[.!?。？！…]$/.test(current.text);

    const reachedMin = textLength >= MIN_CHARS || duration >= MIN_DURATION;
    const reachedMax = textLength >= MAX_CHARS || duration >= MAX_DURATION;

    if (reachedMax || (reachedMin && endsWithPunct)) {
      flush();
    }
  }

  flush();
  return merged;
}

function applyTranslationsToSegments(
  baseSegments: TranscriptSegment[],
  translations: string[],
  fallbackToSegmentTranslation: boolean
): TranscriptSegment[] {
  return baseSegments.map((seg, index) => ({
    ...seg,
    translation:
      translations[index] ||
      (fallbackToSegmentTranslation && typeof seg.translation === 'string' ? seg.translation : ''),
  }));
}

function compactComparableText(value: string): string {
  return value
    .normalize('NFKC')
    .replace(/[\s\p{P}\p{S}]+/gu, '')
    .trim()
    .toLowerCase();
}

function countHangulCharacters(value: string): number {
  const matches = value.match(/[가-힣]/g);
  return matches ? matches.length : 0;
}

function isSuspiciousUntranslatedLine(
  source: string,
  translation: string,
  targetLanguage: SupportedTranslationLanguage
): boolean {
  const normalizedSource = compactComparableText(source);
  const normalizedTranslation = compactComparableText(translation);
  if (!normalizedSource || !normalizedTranslation) return false;
  if (normalizedSource === normalizedTranslation) return true;

  const hangulCount = countHangulCharacters(translation);
  const visibleLength = translation.replace(/\s+/g, '').length || 1;
  const hangulRatio = hangulCount / visibleLength;

  if (targetLanguage === 'zh' && hangulRatio > 0.55) {
    return true;
  }

  return false;
}

function looksLikeUntranslatedBatch(
  sourceTexts: string[],
  translations: string[],
  targetLanguage: SupportedTranslationLanguage
): boolean {
  if (sourceTexts.length === 0 || translations.length === 0) return false;
  let suspiciousCount = 0;

  for (let index = 0; index < sourceTexts.length; index += 1) {
    const source = sourceTexts[index] || '';
    const translation = translations[index] || '';
    if (!translation.trim()) continue;
    if (isSuspiciousUntranslatedLine(source, translation, targetLanguage)) {
      suspiciousCount += 1;
    }
  }

  const filledCount = translations.filter(item => item.trim().length > 0).length;
  if (filledCount === 0) return false;
  return suspiciousCount / filledCount >= 0.6;
}

async function translateSegmentTexts(
  baseSegments: Array<{ text: string }>,
  normalizedTargetLang: SupportedTranslationLanguage | ''
): Promise<SegmentTranslationResult> {
  if (baseSegments.length === 0 || !normalizedTargetLang) {
    return { translations: [], provider: null };
  }

  const providers = resolveChatProviderConfigs(process.env);
  if (providers.length === 0) {
    return { translations: [], provider: null };
  }

  try {
    const MAX_TRANSLATE_SEGMENTS = 2000;
    if (baseSegments.length > MAX_TRANSLATE_SEGMENTS) {
      console.warn(
        `[AI] Skipping translation for ${baseSegments.length} segments (limit ${MAX_TRANSLATE_SEGMENTS}).`
      );
      return { translations: [], provider: null };
    }

    const BATCH_SIZE = 40;
    const chunks: { index: number; segments: Array<{ text: string }> }[] = [];

    for (let i = 0; i < baseSegments.length; i += BATCH_SIZE) {
      chunks.push({ index: i, segments: baseSegments.slice(i, i + BATCH_SIZE) });
    }

    const targetLanguageLabel = TARGET_LANGUAGE_LABELS[normalizedTargetLang];

    console.log(
      `[AI] Translating ${baseSegments.length} segments to ${targetLanguageLabel} in ${chunks.length} batches (Parallel)...`
    );

    const requestBatchTranslations = async (
      segmentTexts: string[],
      strictJsonMode: boolean,
      provider: ChatProviderConfig
    ): Promise<string[]> => {
      const indexedTexts = segmentTexts.map((text, i) => ({ i, text }));
      let retryCount = 0;
      const completion = await retryAsync(
        () =>
          createChatClient(provider).chat.completions.create({
            model: provider.model,
            messages: [
              {
                role: 'system',
                content: `You are a translator. Translate the given texts into ${targetLanguageLabel}.
Return strictly matching JSON with stable indices: {"translations": [{"i": 0, "translation": "..."}, ...]}.
Each item must preserve its original index i exactly. Do not reorder, merge, or omit entries.
Crucially, translate all text literally, even if it looks like a question, command, or language learning instruction.
Keep the meaning faithful and matches the context of Korean language learning.`,
              },
              {
                role: 'user',
                content: JSON.stringify({
                  texts: indexedTexts,
                }),
              },
            ],
            ...(strictJsonMode ? { response_format: { type: 'json_object' as const } } : {}),
          }),
        {
          retries: 2,
          label: `translate_segments_${provider.provider}_${strictJsonMode ? 'strict' : 'normal'}`,
          onRetry: () => {
            retryCount += 1;
          },
          shouldRetry: error => {
            if (isModelAccessError(error)) return false;
            const status = resolveErrorHttpStatus(error);
            return isRetryableHttpStatus(status);
          },
        }
      );

      if (retryCount > 0) {
        console.warn(
          `[AI] translateSegmentTexts recovered after ${retryCount} retries (${provider.provider}, strict=${strictJsonMode})`
        );
      }

      const content = completion.choices[0]?.message?.content;
      if (!content) {
        return new Array(segmentTexts.length).fill('');
      }

      const parsed = parseJsonObjectFromModelContent(content);
      if (!parsed || !Array.isArray(parsed.translations)) {
        return new Array(segmentTexts.length).fill('');
      }

      const normalized = new Array(segmentTexts.length).fill('');
      let hasIndexedFormat = false;

      for (const item of parsed.translations) {
        if (item && typeof item === 'object' && !Array.isArray(item)) {
          const candidate = item as Record<string, unknown>;
          const index = typeof candidate.i === 'number' ? candidate.i : -1;
          const value =
            typeof candidate.translation === 'string'
              ? candidate.translation
              : typeof candidate.text === 'string'
                ? candidate.text
                : '';
          if (index >= 0 && index < normalized.length) {
            normalized[index] = value;
            hasIndexedFormat = true;
          }
        }
      }

      if (hasIndexedFormat) {
        return normalized;
      }

      // Backward compatibility for providers returning legacy string-array format.
      const legacy = parsed.translations.map(item =>
        typeof item === 'string' ? item : String(item ?? '')
      );
      while (legacy.length < segmentTexts.length) legacy.push('');
      return legacy.slice(0, segmentTexts.length);
    };

    const processBatch = async (chunk: {
      index: number;
      segments: Array<{ text: string }>;
    }): Promise<{
      index: number;
      translations: string[];
      provider: ChatProviderConfig | null;
    }> => {
      const segmentTexts = chunk.segments.map(s => s.text);
      let chosenProvider: ChatProviderConfig | null = null;
      let translations = new Array(chunk.segments.length).fill('');

      for (const provider of providers) {
        try {
          translations = await requestBatchTranslations(segmentTexts, false, provider);
        } catch (error) {
          console.warn(
            `[AI] Batch ${chunk.index} primary translation failed on ${provider.provider}:${provider.model}: ${toErrorMessage(error)}`
          );
        }

        if (!translations.some(item => item.trim().length > 0)) {
          try {
            translations = await requestBatchTranslations(segmentTexts, true, provider);
          } catch (error) {
            console.warn(
              `[AI] Batch ${chunk.index} strict translation failed on ${provider.provider}:${provider.model}: ${toErrorMessage(error)}`
            );
          }
        }

        if (looksLikeUntranslatedBatch(segmentTexts, translations, normalizedTargetLang)) {
          console.warn(
            `[AI] Batch ${chunk.index} from ${provider.provider}:${provider.model} looks untranslated; trying fallback provider`
          );
          translations = new Array(chunk.segments.length).fill('');
        }

        if (translations.some(item => item.trim().length > 0)) {
          chosenProvider = provider;
          break;
        }
      }

      return { index: chunk.index, translations, provider: chosenProvider };
    };

    const CONCURRENCY = 5;
    let allResults: {
      index: number;
      translations: string[];
      provider: ChatProviderConfig | null;
    }[] = [];

    for (let i = 0; i < chunks.length; i += CONCURRENCY) {
      const slice = chunks.slice(i, i + CONCURRENCY);
      const results = await Promise.all(slice.map(processBatch));
      allResults.push(...results);
    }

    allResults.sort((a, b) => a.index - b.index);
    const flatTranslations = allResults.flatMap(r => r.translations);
    const resolvedProvider = allResults.find(result => result.provider)?.provider ?? null;

    return { translations: flatTranslations, provider: resolvedProvider };
  } catch (translateErr) {
    console.error('[AI] Translation failed:', translateErr);
    return { translations: [], provider: null };
  }
}

async function translateSingleTextDirect(
  sourceText: string,
  normalizedTargetLang: SupportedTranslationLanguage
): Promise<{ translation: string; provider: ChatProviderConfig | null }> {
  const providers = resolveChatProviderConfigs(process.env);
  if (providers.length === 0) {
    return { translation: '', provider: null };
  }

  const targetLanguageLabel = TARGET_LANGUAGE_LABELS[normalizedTargetLang];

  for (const provider of providers) {
    try {
      const completion = await retryAsync(
        () =>
          createChatClient(provider).chat.completions.create({
            model: provider.model,
            messages: [
              {
                role: 'system',
                content: `Translate Korean into ${targetLanguageLabel}. Return only the translated ${targetLanguageLabel} text. Do not explain. Do not keep Korean unless it is a proper noun.`,
              },
              {
                role: 'user',
                content: sourceText,
              },
            ],
          }),
        {
          retries: 2,
          label: `translate_single_direct_${provider.provider}`,
          shouldRetry: error => {
            if (isModelAccessError(error)) return false;
            const status = resolveErrorHttpStatus(error);
            return isRetryableHttpStatus(status);
          },
        }
      );

      const rawContent = completion.choices[0]?.message?.content?.trim() ?? '';
      const translation = rawContent
        .replace(/^(?:翻译|中文翻译|简体中文翻译)\s*[:：]\s*/u, '')
        .replace(/^["'“”]|["'“”]$/gu, '')
        .trim();

      if (!translation) {
        continue;
      }

      if (isSuspiciousUntranslatedLine(sourceText, translation, normalizedTargetLang)) {
        console.warn(
          `[AI] direct single translation looks untranslated on ${provider.provider}:${provider.model}`
        );
        continue;
      }

      return { translation, provider };
    } catch (error) {
      console.warn(
        `[AI] direct single translation failed on ${provider.provider}:${provider.model}: ${toErrorMessage(error)}`
      );
    }
  }

  const emergencyTranslation = await translateSingleTextWithEmergencyFallback(
    sourceText,
    normalizedTargetLang
  );
  if (emergencyTranslation) {
    return { translation: emergencyTranslation, provider: null };
  }

  return { translation: '', provider: null };
}

const EMERGENCY_TRANSLATION_TARGET_CODES: Record<SupportedTranslationLanguage, string> = {
  zh: 'zh-CN',
  en: 'en',
  vi: 'vi',
  mn: 'mn',
};

async function translateSingleTextWithEmergencyFallback(
  sourceText: string,
  normalizedTargetLang: SupportedTranslationLanguage
): Promise<string> {
  const targetCode = EMERGENCY_TRANSLATION_TARGET_CODES[normalizedTargetLang];
  const url = new URL('https://translate.googleapis.com/translate_a/single');
  url.searchParams.set('client', 'gtx');
  url.searchParams.set('sl', 'ko');
  url.searchParams.set('tl', targetCode);
  url.searchParams.set('dt', 't');
  url.searchParams.set('q', sourceText);

  try {
    const response = await fetchWithTimeout(
      url.toString(),
      {
        headers: {
          'User-Agent': 'Mozilla/5.0',
        },
      },
      10000
    );
    if (!response.ok) {
      console.warn(`[AI] emergency translation fallback failed with ${response.status}`);
      return '';
    }

    const payload = (await response.json()) as unknown;
    if (!Array.isArray(payload) || !Array.isArray(payload[0])) {
      return '';
    }

    const translation = (payload[0] as unknown[])
      .map(item => (Array.isArray(item) && typeof item[0] === 'string' ? item[0] : ''))
      .join('')
      .trim();

    if (!translation) {
      return '';
    }

    if (isSuspiciousUntranslatedLine(sourceText, translation, normalizedTargetLang)) {
      return '';
    }

    return translation;
  } catch (error) {
    console.warn(`[AI] emergency translation fallback error: ${toErrorMessage(error)}`);
    return '';
  }
}

async function cacheTranscriptToSpaces(episodeId: string, segments: TranscriptSegment[]) {
  try {
    const payload = JSON.stringify({ segments });
    const presigned = createPresignedUploadUrl({
      filename: `${episodeId}.json`,
      contentType: 'application/json',
      folder: 'transcripts',
      key: `transcripts/${episodeId}.json`,
    });
    const uploadRes = await fetch(presigned.uploadUrl, {
      method: 'PUT',
      headers: presigned.headers,
      body: payload,
    });
    if (!uploadRes.ok) {
      console.warn('[AI] Transcript cache upload failed:', uploadRes.status, uploadRes.statusText);
    }
  } catch (cacheErr) {
    console.warn('[AI] Transcript cache upload failed:', cacheErr);
  }
}

async function upsertTranscript(ctx: ActionCtx, episodeId: string, segments: TranscriptSegment[]) {
  await ctx.runMutation(internal.podcastTranscripts.upsert, {
    episodeId,
    segments,
  });
}

async function translateAndStoreTranscriptIfNeeded(
  ctx: ActionCtx,
  args: {
    episodeId: string;
    baseSegments: TranscriptSegment[];
    language: SupportedTranslationLanguage | '';
  }
): Promise<SegmentTranslationResult> {
  const language = args.language || '';
  if (!language || args.baseSegments.length === 0) {
    return { translations: [], provider: null };
  }

  const lease = await ctx.runMutation(internal.podcastTranscripts.tryStartTranslation, {
    episodeId: args.episodeId,
    language,
  });
  if (!lease.started) {
    return { translations: [], provider: null };
  }

  try {
    const result = await translateSegmentTexts(args.baseSegments, language);
    if (result.translations.length > 0) {
      await retryAsync(
        () =>
          ctx.runMutation(internal.podcastTranscripts.setTranslations, {
            episodeId: args.episodeId,
            language,
            translations: result.translations,
          }),
        {
          retries: 3,
          label: 'transcript_set_translations',
          shouldRetry: error => isLikelyTransientError(error),
        }
      );
      return result;
    }
  } finally {
    await ctx.runMutation(internal.podcastTranscripts.releaseTranslationLease, {
      episodeId: args.episodeId,
      language,
    });
  }

  return { translations: [], provider: null };
}

// Helper: Delete transcript (action since "use node" requires actions only)
export const deleteTranscript = action({
  args: { episodeId: v.string() },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx);
    await ctx.runMutation(internal.podcastTranscripts.deleteByEpisode, {
      episodeId: args.episodeId,
    });
    return { success: true };
  },
});

export const generateTranscript = action({
  args: {
    audioUrl: v.string(),
    episodeId: v.string(),
    language: v.optional(v.string()),
    storageId: v.optional(v.id('_storage')),
    storageIds: v.optional(v.array(v.string())), // Legacy, kept for compatibility but ignored
  },
  handler: async (ctx, args) => {
    const userId = await guardAiAction(ctx, 'generate_transcript');
    console.log('[AI] Starting Deepgram Transcript Generation...');

    // 1. Deepgram Transcription (Transcribe URL directly)
    const deepgramKey = process.env.DEEPGRAM_API_KEY;
    if (!deepgramKey) {
      return { success: false, error: 'DEEPGRAM_API_KEY not set' };
    }

    let baseSegments: TranscriptSegment[] = [];
    const targetLang = args.language || ''; // translation target (optional)
    const sourceLang = 'ko'; // podcasts are Korean by default

    try {
      const deepgram = createClient(deepgramKey);

      logAI(`Calling Deepgram (nova-2) for URL: ${args.audioUrl.substring(0, 100)}...`);

      const { result, error } = await deepgram.listen.prerecorded.transcribeUrl(
        { url: args.audioUrl },
        {
          model: 'nova-2',
          smart_format: true,
          punctuate: true,
          paragraphs: true,
          utterances: true,
          language: sourceLang,
        }
      );

      if (error) {
        throw new Error(`Deepgram API Error: ${error.message}`);
      }

      baseSegments = extractSegmentsFromDeepgramResult(result);

      logAI(`Deepgram finished. Generated ${baseSegments.length} segments.`);

      if (logUsageMutation) {
        // Log "seconds" as "tokens" roughly for tracking? Or just count 1 call.
        await ctx.runMutation(logUsageMutation, {
          userId,
          feature: 'transcribe',
          model: 'deepgram-nova-2',
        });
      }
    } catch (err) {
      console.error('[AI] Deepgram Transcription failed:', err);
      return { success: false, error: toErrorMessage(err) };
    }

    // 2. Translation Logic (Batched & Parallel using OpenAI 4o-mini)
    const normalizedTargetLang = normalizeTargetLanguage(targetLang);
    await upsertTranscript(ctx, args.episodeId, baseSegments);

    const translationResult = await translateAndStoreTranscriptIfNeeded(ctx, {
      episodeId: args.episodeId,
      baseSegments,
      language: normalizedTargetLang,
    });
    const translations = translationResult.translations;
    const merged =
      translations.length > 0
        ? applyTranslationsToSegments(baseSegments, translations, normalizedTargetLang === 'zh')
        : baseSegments;
    // Best-effort CDN cache (optional)
    await cacheTranscriptToSpaces(args.episodeId, baseSegments);
    return { success: true, data: { segments: merged } };
  },
});

export const requestTranscript = action({
  args: {
    audioUrl: v.string(),
    episodeId: v.string(),
    language: v.optional(v.string()),
  },
  handler: async (_ctx, args) => {
    await guardAiAction(_ctx, 'request_transcript');
    const deepgramKey = process.env.DEEPGRAM_API_KEY;
    if (!deepgramKey) {
      return { success: false, error: 'DEEPGRAM_API_KEY not set' };
    }

    const baseCallback =
      process.env.DEEPGRAM_CALLBACK_URL || process.env.CONVEX_SITE_URL || process.env.CONVEX_URL;
    if (!baseCallback) {
      return { success: false, error: 'DEEPGRAM_CALLBACK_URL not set' };
    }

    const normalizedTargetLang = normalizeTargetLanguage(args.language);
    const callbackBase = baseCallback.includes('/webhook/deepgram')
      ? baseCallback.replace(/\/$/, '')
      : `${baseCallback.replace(/\/$/, '')}/webhook/deepgram`;
    const callbackUrl = `${callbackBase}?episodeId=${encodeURIComponent(args.episodeId)}${
      normalizedTargetLang ? `&language=${encodeURIComponent(normalizedTargetLang)}` : ''
    }${
      process.env.DEEPGRAM_CALLBACK_TOKEN
        ? `&token=${encodeURIComponent(process.env.DEEPGRAM_CALLBACK_TOKEN)}`
        : ''
    }`;

    const deepgramLang = 'ko';

    const dgUrl = new URL('https://api.deepgram.com/v1/listen');
    dgUrl.searchParams.set('callback', callbackUrl);
    dgUrl.searchParams.set('model', 'nova-2');
    dgUrl.searchParams.set('smart_format', 'true');
    dgUrl.searchParams.set('punctuate', 'true');
    dgUrl.searchParams.set('paragraphs', 'true');
    dgUrl.searchParams.set('utterances', 'true');
    if (deepgramLang) {
      dgUrl.searchParams.set('language', deepgramLang);
    }

    const res = await retryAsync(
      () =>
        fetchWithTimeout(
          dgUrl.toString(),
          {
            method: 'POST',
            headers: {
              Authorization: `Token ${deepgramKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ url: args.audioUrl }),
          },
          15000
        ),
      { retries: 2, label: 'deepgram_request_transcript' }
    );

    if (!res.ok) {
      const errorText = await res.text();
      return {
        success: false,
        error: `Deepgram async request failed (${res.status}): ${errorText}`,
      };
    }

    const data = await res.json().catch(() => ({}));
    return { success: true, requestId: data.request_id || data.id };
  },
});

export const handleDeepgramCallback = action({
  args: {
    episodeId: v.string(),
    language: v.optional(v.string()),
    payloadJson: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      const payload = JSON.parse(args.payloadJson);
      const baseSegments = extractSegmentsFromDeepgramResult(payload);
      logAI(`Deepgram callback received. Segments: ${baseSegments.length}`);

      if (logUsageMutation) {
        await ctx.runMutation(logUsageMutation, {
          feature: 'transcribe',
          model: 'deepgram-nova-2',
        });
      }

      // IMPORTANT: Keep callback fast to avoid Deepgram timeout.
      // Store transcript in DB for reliable retrieval.
      await upsertTranscript(ctx, args.episodeId, baseSegments);

      const normalizedTargetLang = normalizeTargetLanguage(args.language);
      if (normalizedTargetLang) {
        try {
          await translateAndStoreTranscriptIfNeeded(ctx, {
            episodeId: args.episodeId,
            baseSegments,
            language: normalizedTargetLang,
          });
        } catch (translationError) {
          console.warn(
            '[AI] Deepgram callback translation failed:',
            toErrorMessage(translationError)
          );
        }
      }

      // Best-effort CDN cache (optional)
      await cacheTranscriptToSpaces(args.episodeId, baseSegments);

      return { success: true };
    } catch (err) {
      console.error('[AI] Deepgram callback processing failed:', err);
      return { success: false, error: toErrorMessage(err) };
    }
  },
});

export const getTranscript = action({
  args: { episodeId: v.string(), language: v.optional(v.string()) },
  handler: async (ctx, args): Promise<{ segments: TranscriptSegment[] | null }> => {
    const record = (await ctx.runQuery(internal.podcastTranscripts.getRecordByEpisode, {
      episodeId: args.episodeId,
    })) as TranscriptRecord | null;

    if (!record?.segments || record.segments.length === 0) {
      return { segments: null };
    }

    const normalizedTargetLang = normalizeTargetLanguage(args.language);
    if (!normalizedTargetLang) {
      return { segments: record.segments };
    }

    const existingTranslations = record.translations?.[normalizedTargetLang];
    const hasSuspiciousCachedTranslations =
      Array.isArray(existingTranslations) &&
      existingTranslations.length === record.segments.length &&
      looksLikeUntranslatedBatch(
        record.segments.map(segment => segment.text),
        existingTranslations,
        normalizedTargetLang
      );

    if (
      existingTranslations &&
      existingTranslations.length === record.segments.length &&
      !hasSuspiciousCachedTranslations
    ) {
      const merged = applyTranslationsToSegments(
        record.segments,
        existingTranslations,
        normalizedTargetLang === 'zh'
      );
      return { segments: merged };
    }

    if (hasSuspiciousCachedTranslations) {
      console.warn(
        `[AI] Ignoring suspicious cached transcript translation for ${args.episodeId} (${normalizedTargetLang})`
      );
      await ctx.runMutation(internal.podcastTranscripts.clearTranslationsForLanguage, {
        episodeId: args.episodeId,
        language: normalizedTargetLang,
      });
    }

    const userId = (await getAuthUserId(ctx).catch(() => null)) as Id<'users'> | null;
    if (!userId) {
      return { segments: record.segments };
    }

    try {
      const translationResult = await translateAndStoreTranscriptIfNeeded(ctx, {
        episodeId: args.episodeId,
        baseSegments: record.segments,
        language: normalizedTargetLang,
      });
      const translations = translationResult.translations;
      if (translations.length > 0) {
        await ctx.runMutation(logUsageMutation, {
          userId,
          feature: 'get_transcript_translation',
          model: translationResult.provider?.model || 'unknown',
          status: 'success',
          provider: translationResult.provider?.provider || 'unknown',
        });
      }

      const merged =
        translations.length > 0
          ? applyTranslationsToSegments(
              record.segments,
              translations,
              normalizedTargetLang === 'zh'
            )
          : record.segments;
      return { segments: merged };
    } catch (error) {
      console.warn('[AI] getTranscript translation fallback:', toErrorMessage(error));
      return { segments: record.segments };
    }
  },
});

export const analyzeText = action({
  args: { text: v.string() },
  handler: async (ctx, args) => {
    const userId = await guardAiAction(ctx, 'analyze_text');
    const providers = resolveChatProviderConfigs(process.env);
    if (providers.length === 0) {
      console.warn('No AI chat provider configured');
      return null;
    }

    // Skip analysis for very short texts
    if (!args.text || args.text.trim().length < 10) {
      return null;
    }

    try {
      const { completion, provider } = await runChatCompletionWithFallback(
        ({ client, provider }) =>
          client.chat.completions.create({
            model: provider.model,
            messages: [
              {
                role: 'system',
                content: `You are a Korean linguistics expert. Analyze the provided text for language learners.

Task: Perform morphological analysis (Lemmatization).
1. Break down the text into meaningful tokens (words, particles, endings).
2. For verbs/adjectives, identify their dictionary base form (Lemma).
3. Calculate the precise 'offset' (0-based start index) and 'length' of each token in the original string.

IMPORTANT: 
- Be precise with offset calculations - count exact character positions
- Include spaces in your offset calculations
- Only return tokens that are meaningful for language learning (skip punctuation, spaces)

Return a JSON object with a "tokens" key containing an array of:
{ 
  "surface": string (the exact word in text, e.g., "갔습니다"), 
  "base": string (dictionary form, e.g., "가다"), 
  "offset": number (0-based index), 
  "length": number (character length of surface form), 
  "pos": string (e.g., "Verb", "Noun", "Adjective", "Particle", "Adverb", "Pronoun", "Number", "Determiner") 
}`,
              },
              { role: 'user', content: args.text },
            ],
            response_format: { type: 'json_object' },
            max_tokens: 4000,
          }),
        { label: 'analyze_text' }
      );
      const usage = completion.usage;
      await ctx.runMutation(logUsageMutation, {
        userId,
        feature: 'analyze_text',
        model: provider.model,
        promptTokens: usage?.prompt_tokens,
        completionTokens: usage?.completion_tokens,
        totalTokens: usage?.total_tokens,
        costUsd: 0,
        provider: provider.provider,
      });

      const content = completion.choices[0].message.content;
      if (!content) return null;

      const result = JSON.parse(content);
      return { tokens: result.tokens || [], tokenCount: (result.tokens || []).length };
    } catch (error) {
      console.error('Text analysis failed:', error);
      return null;
    }
  },
});

// Analyze a Korean sentence for vocabulary and grammar
export const analyzeSentence = action({
  args: {
    sentence: v.string(),
    context: v.optional(v.string()),
    language: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await guardAiAction(ctx, 'analyze_sentence');
    const providers = resolveChatProviderConfigs(process.env);
    if (providers.length === 0) {
      console.warn('No AI chat provider configured');
      return null;
    }
    const responseLanguage = resolveAiOutputLanguage(args.language);

    try {
      const { completion, provider } = await runChatCompletionWithFallback(
        ({ client, provider }) =>
          client.chat.completions.create({
            model: provider.model,
            messages: [
              {
                role: 'system',
                content: `You are a strict Korean language teacher. Analyze the given sentence for a language learner.
The user is validating a sentence they wrote based on a specific grammar point (Context).
All explanatory text must be in ${responseLanguage.nativeLabel} (${responseLanguage.englishLabel}).

Validation Rules:
1. Strict Grammar Check: If there are ANY spelling errors, particle errors, or conjugation errors, mark nuances.nuance as "Incorrect" or provide specific correction.
2. If the sentence is grammatically incorrect, "nuance" must explain the error clearly.
3. If the sentence meaning is clear but grammar is wrong, isCorrect should be seemingly false (though the JSON structure doesn't support a boolean explicitly, putting the correction in nuance implies it).

Return a JSON object with:
{
  "isCorrect": boolean,
  "vocabulary": [{ "word": string, "root": string, "meaning": string, "type": string }],
  "grammar": [{ "structure": string, "explanation": string }],
  "nuance": string (If correct: "Correct! [Reason]". If incorrect: "Incorrect. [Detailed correction]"),
  "corrected": string (The corrected sentence if there were errors, otherwise null)
}`,
              },
              {
                role: 'user',
                content: args.sentence + (args.context ? `\n\nContext: ${args.context}` : ''),
              },
            ],
            response_format: { type: 'json_object' },
          }),
        { label: 'analyze_sentence' }
      );
      const usage = completion.usage;
      await ctx.runMutation(logUsageMutation, {
        userId,
        feature: 'analyze_sentence',
        model: provider.model,
        promptTokens: usage?.prompt_tokens,
        completionTokens: usage?.completion_tokens,
        totalTokens: usage?.total_tokens,
        costUsd: 0,
        provider: provider.provider,
      });

      const content = completion.choices[0].message.content;
      if (!content) return null;

      const result = JSON.parse(content);
      return { success: true, data: result };
    } catch (error) {
      console.error('Sentence analysis failed:', error);
      return { success: false, data: null };
    }
  },
});

export const grammarTutorChat = action({
  args: {
    grammarTitle: v.string(),
    grammarSummary: v.optional(v.string()),
    grammarExplanation: v.optional(v.string()),
    language: v.optional(v.string()),
    messages: v.array(
      v.object({
        role: v.union(v.literal('assistant'), v.literal('user')),
        content: v.string(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const userId = await guardAiAction(ctx, 'grammar_tutor_chat');
    const providers = resolveChatProviderConfigs(process.env);
    if (providers.length === 0) {
      console.warn('No AI chat provider configured');
      return { success: false, error: 'AI chat provider not configured' };
    }
    const responseLanguage = resolveAiOutputLanguage(args.language);

    const safeTitle = normalizeInlineWhitespace(args.grammarTitle).slice(0, 120);
    const safeSummary = normalizeInlineWhitespace(args.grammarSummary || '').slice(0, 500);
    const safeExplanation = normalizeInlineWhitespace(args.grammarExplanation || '').slice(0, 1800);

    const normalizedMessages = args.messages
      .map(message => ({
        role: message.role,
        content: normalizeInlineWhitespace(message.content),
      }))
      .filter(message => Boolean(message.content))
      .slice(-8);

    try {
      const { completion, provider } = await runChatCompletionWithFallback(
        ({ client, provider }) =>
          client.chat.completions.create({
            model: provider.model,
            messages: [
              {
                role: 'system',
                content: `You are a concise Korean grammar tutor for language learners.
Always respond in ${responseLanguage.nativeLabel} (${responseLanguage.englishLabel}).
Use a warm and practical teaching tone.
Keep answers focused, concrete, and easy to apply.
When useful, provide 1 short Korean example sentence with translation.
If the learner asks for correction, explain what is wrong and give a corrected sentence.`,
              },
              {
                role: 'system',
                content: `Current grammar context:
Title: ${safeTitle}
Summary: ${safeSummary || 'N/A'}
Explanation: ${safeExplanation || 'N/A'}`,
              },
              ...normalizedMessages,
            ],
          }),
        { label: 'grammar_tutor_chat' }
      );

      const usage = completion.usage;
      await ctx.runMutation(logUsageMutation, {
        userId,
        feature: 'grammar_tutor_chat',
        model: provider.model,
        promptTokens: usage?.prompt_tokens,
        completionTokens: usage?.completion_tokens,
        totalTokens: usage?.total_tokens,
        costUsd: 0,
        provider: provider.provider,
      });

      const reply = completion.choices[0]?.message?.content?.trim();
      if (!reply) {
        return { success: false, error: 'Empty response from model' };
      }

      return { success: true, reply };
    } catch (error) {
      console.error('Grammar tutor chat failed:', error);
      return { success: false, error: toErrorMessage(error) };
    }
  },
});

// Analyze TOPIK question (for study mode)
export const analyzeQuestion = action({
  args: {
    question: v.string(),
    options: v.array(v.string()),
    correctAnswer: v.number(),
    type: v.optional(v.string()),
    language: v.optional(v.string()),
    instruction: v.optional(v.string()),
    passage: v.optional(v.string()),
    contextBox: v.optional(v.string()),
    questionNumber: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await guardAiAction(ctx, 'analyze_topik_question');
    const providers = resolveChatProviderConfigs(process.env);
    if (providers.length === 0) return null;
    const responseLanguage = resolveAiOutputLanguage(args.language);
    const analysisMode = inferTopikQuestionAnalysisMode(args);
    const questionContext = buildTopikQuestionAnalysisContext(args);

    try {
      const { completion, provider } = await runChatCompletionWithFallback(
        ({ client, provider }) =>
          client.chat.completions.create({
            model: provider.model,
            messages: [
              {
                role: 'system',
                content: `You are a TOPIK exam tutor.
Respond in ${responseLanguage.nativeLabel} (${responseLanguage.englishLabel}).
Return strict JSON only:
{
  "translation": string (translation of the question in output language),
  "keyPoint": string (what knowledge point this question tests),
  "analysis": string (why the correct answer is right),
  "wrongOptions": { "1": string, "2": string, ... } (why each wrong option is wrong)
}
All textual fields must be in ${responseLanguage.nativeLabel} (${responseLanguage.englishLabel}).
The explanation must be specific to the actual Korean text shown in the problem. Do not give generic test-taking advice.
For every question, use the passage/context/instruction when available.
When the problem is an ordering / sequencing question:
- Explain the correct order step by step.
- Refer to the labeled fragments such as (가), (나), (다), (라) explicitly.
- Cite the concrete clue that determines each transition, such as time flow, cause-result, pronoun/reference, or discourse marker.
- In "analysis", explain why fragment A must come before fragment B.
- In "wrongOptions", explain the first point where each wrong sequence breaks the story or logic.
When the problem is an insertion / <보기> question:
- Explain the local coherence clue before and after the insertion point.
- Mention why neighboring sentences make that location correct.
Do not include markdown or extra text.`,
              },
              {
                role: 'user',
                content: JSON.stringify({
                  analysisMode,
                  responseLanguage: responseLanguage.nativeLabel,
                  questionContext,
                  answerGuide: {
                    correctOptionNumber: args.correctAnswer + 1,
                    options: args.options.map((option, index) => ({
                      number: index + 1,
                      text: normalizeTopikAnalysisText(option),
                    })),
                  },
                }),
              },
            ],
            response_format: { type: 'json_object' },
          }),
        { label: 'analyze_topik_question' }
      );
      const usage = completion.usage;
      await ctx.runMutation(logUsageMutation, {
        userId,
        feature: 'analyze_topik_question',
        model: provider.model,
        promptTokens: usage?.prompt_tokens,
        completionTokens: usage?.completion_tokens,
        totalTokens: usage?.total_tokens,
        costUsd: 0,
        provider: provider.provider,
      });

      const content = completion.choices[0].message.content;
      if (!content) return null;

      return { success: true, data: JSON.parse(content) };
    } catch (error) {
      console.error('Question analysis failed:', error);
      return { success: false, data: null };
    }
  },
});

type AnalyzeTopikQuestionArgs = {
  question: string;
  options: string[];
  correctAnswer: number;
  type?: string;
  language?: string;
  instruction?: string;
  passage?: string;
  contextBox?: string;
  questionNumber?: number;
};

type TopikQuestionAnalysisMode = 'SEQUENCE_ORDERING' | 'INSERTION' | 'GENERAL';

const normalizeTopikAnalysisText = (value?: string) =>
  String(value ?? '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(?:p|div|li|tr|h\d)>/gi, '\n')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&amp;/gi, '&')
    .replace(/\r/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();

const inferTopikQuestionAnalysisMode = (
  args: Pick<AnalyzeTopikQuestionArgs, 'question' | 'instruction' | 'passage' | 'contextBox'>
): TopikQuestionAnalysisMode => {
  const haystack = [args.question, args.instruction, args.passage, args.contextBox]
    .map(normalizeTopikAnalysisText)
    .join('\n');

  if (/(순서대로|배열한 것|순서에 맞게|배열하)/.test(haystack)) {
    return 'SEQUENCE_ORDERING';
  }

  if (/(<보기>|들어가기에 가장 알맞은 곳|주어진 문장이 들어갈 곳)/.test(haystack)) {
    return 'INSERTION';
  }

  return 'GENERAL';
};

const buildTopikQuestionAnalysisContext = (
  args: Pick<
    AnalyzeTopikQuestionArgs,
    'question' | 'instruction' | 'passage' | 'contextBox' | 'questionNumber'
  >
) => ({
  questionNumber: args.questionNumber ?? null,
  instruction: normalizeTopikAnalysisText(args.instruction),
  question: normalizeTopikAnalysisText(args.question),
  passage: normalizeTopikAnalysisText(args.passage),
  contextBox: normalizeTopikAnalysisText(args.contextBox),
});

export const analyzeReadingArticle = action({
  args: {
    title: v.string(),
    summary: v.optional(v.string()),
    bodyText: v.string(),
    language: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await guardAiAction(ctx, 'analyze_reading_article');
    const startedAt = Date.now();
    const { code: responseLanguageCode, label: responseLanguageLabel } =
      resolveReadingResponseLanguage(args.language);
    const trimmedBody = args.bodyText.trim().slice(0, 7000);
    const trimmedSummary = args.summary?.trim() || '';
    const fallbackSummary = trimmedSummary || args.title;

    if (!trimmedBody || trimmedBody.length < 20) {
      return null;
    }

    const contentHash = hashText(
      `${READING_ANALYSIS_PROMPT_VERSION}|${args.title.trim()}|${trimmedSummary}|${trimmedBody}|${responseLanguageCode}`
    );
    const cacheKey = buildAiCacheKey('reading_analysis', responseLanguageCode, contentHash);
    const cached = await ctx.runQuery(getAiCacheByKeyQuery, { key: cacheKey });
    const cachedResult = normalizeReadingAnalysisPayload(cached?.payload, fallbackSummary);
    if (cachedResult) {
      return cachedResult;
    }

    const providers = resolveChatProviderConfigs(process.env);
    if (providers.length === 0) {
      return null;
    }

    try {
      const { completion, provider } = await runChatCompletionWithFallback(
        ({ client, provider }) =>
          retryAsync(
            () =>
              client.chat.completions.create({
                model: provider.model,
                messages: [
                  {
                    role: 'system',
                    content: `你是韩语阅读教练。请基于文章生成学习卡片，并严格返回 JSON。

输出语言：${responseLanguageLabel}
返回格式：
{
  "summary": "string",
  "vocabulary": [
    { "term": "string", "meaning": "string", "level": "TOPIK level label" }
  ],
  "grammar": [
    { "pattern": "string", "explanation": "string", "example": "string" }
  ]
}

规则：
1. summary 必须是 1~2 句，且必须“概括”而不是复述原文。
2. summary 禁止逐句翻译全文，不要按原文顺序罗列信息；总长度控制在 120 字以内（中文）或约 2 句（其他语言）。
3. 可保留最多 1 个关键数字事实（如金额/人数），其余信息应合并表达。
4. vocabulary 返回 5~8 个韩语核心词，term 必须是韩语；meaning 用输出语言；level 类似 "TOPIK 3-4"。
5. grammar 返回 2~3 个文法点，优先文章中真实出现的表达；example 尽量取自原文短句。
6. 只返回 JSON，不要任何额外文本。`,
                  },
                  {
                    role: 'user',
                    content: JSON.stringify({
                      title: args.title,
                      summaryHint: trimmedSummary || null,
                      bodyText: trimmedBody,
                    }),
                  },
                ],
                response_format: { type: 'json_object' },
              }),
            { retries: 2, label: `analyze_reading_article_${provider.provider}` }
          ),
        { label: 'analyze_reading_article' }
      );

      const usage = completion.usage;
      await ctx.runMutation(logUsageMutation, {
        userId,
        feature: 'analyze_reading_article',
        model: provider.model,
        promptTokens: usage?.prompt_tokens,
        completionTokens: usage?.completion_tokens,
        totalTokens: usage?.total_tokens,
        costUsd: 0,
        status: 'success',
        provider: provider.provider,
        durationMs: Date.now() - startedAt,
      });

      const content = completion.choices[0].message.content;
      if (!content) return null;

      const parsed = parseJsonObjectFromModelContent(content);
      if (!parsed) return null;
      const result = normalizeReadingAnalysisPayload(parsed, fallbackSummary);
      if (!result) return null;
      result.summary = sanitizeReadingSummary(
        result.summary,
        trimmedBody,
        fallbackSummary,
        responseLanguageCode
      );

      await ctx.runMutation(upsertAiCacheMutation, {
        key: cacheKey,
        kind: 'reading_analysis',
        language: responseLanguageCode,
        contentHash,
        payload: result,
      });

      return result;
    } catch (error) {
      console.error('[AI] analyzeReadingArticle failed:', toErrorMessage(error));
      await logAiFailure(ctx, {
        userId,
        feature: 'analyze_reading_article',
        model: providers[0]?.model || 'unknown',
        provider: providers[0]?.provider || 'unknown',
        startedAt,
        error,
      });
      return null;
    }
  },
});

export const explainWordFallback = action({
  args: {
    word: v.string(),
    context: v.optional(v.string()),
    language: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await guardAiAction(ctx, 'dictionary_fallback');
    const startedAt = Date.now();
    const providers = resolveChatProviderConfigs(process.env);
    if (providers.length === 0) {
      return null;
    }

    const term = args.word.trim();
    if (!term) return null;

    const { label: responseLanguageLabel } = resolveReadingResponseLanguage(args.language);

    try {
      const { completion, provider } = await runChatCompletionWithFallback(
        ({ client, provider }) =>
          retryAsync(
            () =>
              client.chat.completions.create({
                model: provider.model,
                messages: [
                  {
                    role: 'system',
                    content: `你是韩语词典助手。用户词典未命中时，你需要给出简洁、可学习的解释。严格返回 JSON。
输出语言：${responseLanguageLabel}
返回格式：
{
  "word": "string",
  "pos": "string",
  "meaning": "string",
  "example": "string",
  "note": "string"
}
规则：
1. word 保持韩语原词。
2. meaning 用输出语言，简洁准确。
3. example 尽量结合给定上下文。
4. note 给出一个学习提示（搭配、语感或近义区分）。`,
                  },
                  {
                    role: 'user',
                    content: JSON.stringify({
                      word: term,
                      context: args.context?.trim() || '',
                    }),
                  },
                ],
                response_format: { type: 'json_object' },
              }),
            { retries: 2, label: `explain_word_fallback_${provider.provider}` }
          ),
        { label: 'explain_word_fallback' }
      );

      const usage = completion.usage;
      await ctx.runMutation(logUsageMutation, {
        userId,
        feature: 'dictionary_fallback',
        model: provider.model,
        promptTokens: usage?.prompt_tokens,
        completionTokens: usage?.completion_tokens,
        totalTokens: usage?.total_tokens,
        costUsd: 0,
        status: 'success',
        provider: provider.provider,
        durationMs: Date.now() - startedAt,
      });

      const content = completion.choices[0].message.content;
      if (!content) return null;

      const parsed = (parseJsonObjectFromModelContent(content) || {}) as {
        word?: unknown;
        pos?: unknown;
        meaning?: unknown;
        example?: unknown;
        note?: unknown;
      };

      return {
        word: typeof parsed.word === 'string' && parsed.word.trim() ? parsed.word.trim() : term,
        pos: typeof parsed.pos === 'string' ? parsed.pos.trim() : '',
        meaning: typeof parsed.meaning === 'string' ? parsed.meaning.trim() : '',
        example: typeof parsed.example === 'string' ? parsed.example.trim() : '',
        note: typeof parsed.note === 'string' ? parsed.note.trim() : '',
      };
    } catch (error) {
      console.error('[AI] explainWordFallback failed:', toErrorMessage(error));
      await logAiFailure(ctx, {
        userId,
        feature: 'dictionary_fallback',
        model: providers[0]?.model || 'unknown',
        provider: providers[0]?.provider || 'unknown',
        startedAt,
        error,
      });
      return null;
    }
  },
});

export const translateReadingParagraphs = action({
  args: {
    title: v.string(),
    paragraphs: v.array(v.string()),
    language: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const startedAt = Date.now();
    let userId: Id<'users'> | undefined;
    try {
      userId = await guardAiAction(ctx, 'translate_reading_paragraphs');
    } catch (error) {
      await logAiFailure(ctx, {
        feature: 'translate_reading_paragraphs',
        model: 'mimo-v2-flash',
        provider: 'openai',
        startedAt,
        error,
      });
      return {
        translations: [] as string[],
        errorCode: resolveReadableAiErrorCode(error),
      };
    }

    const limitedParagraphs = args.paragraphs.slice(0, 36).map(item => item.trim());
    if (limitedParagraphs.length === 0) {
      return { translations: [] as string[] };
    }

    const normalizedTargetLang = normalizeTargetLanguage(args.language) || 'zh';
    const contentHash = hashText(
      `${args.title.trim()}|${normalizedTargetLang}|${limitedParagraphs.join('\n\n')}`
    );
    const cacheKey = buildAiCacheKey('reading_translation', normalizedTargetLang, contentHash);
    const cached = await ctx.runQuery(getAiCacheByKeyQuery, { key: cacheKey });
    const cachedResult = normalizeReadingTranslationPayload(
      cached?.payload,
      limitedParagraphs.length
    );
    if (cachedResult && cachedResult.translations.some(item => item.trim().length > 0)) {
      return cachedResult;
    }

    try {
      const segments = limitedParagraphs.map(text => ({ text }));
      const translationResult = await translateSegmentTexts(segments, normalizedTargetLang);
      const translations = translationResult.translations;
      const result: ReadingTranslationResult = {
        translations: limitedParagraphs.map((_, index) => translations[index] || ''),
      };

      await ctx.runMutation(logUsageMutation, {
        userId,
        feature: 'translate_reading_paragraphs',
        model: translationResult.provider?.model || 'unknown',
        status: 'success',
        provider: translationResult.provider?.provider || 'unknown',
        durationMs: Date.now() - startedAt,
      });

      if (result.translations.some(item => item.trim().length > 0)) {
        await ctx.runMutation(upsertAiCacheMutation, {
          key: cacheKey,
          kind: 'reading_translation',
          language: normalizedTargetLang,
          contentHash,
          payload: result,
        });
      }

      return result;
    } catch (error) {
      console.error('[AI] translateReadingParagraphs failed:', toErrorMessage(error));
      await logAiFailure(ctx, {
        userId,
        feature: 'translate_reading_paragraphs',
        model: 'mimo-v2-flash',
        provider: 'openai',
        startedAt,
        error,
      });
      return {
        translations: limitedParagraphs.map(() => ''),
        errorCode: resolveReadableAiErrorCode(error),
      };
    }
  },
});

export const batchTranslate = action({
  args: {
    texts: v.array(v.string()),
    targetLang: v.string(),
  },
  handler: async (ctx, args) => {
    const normalizedTargetLang = normalizeTargetLanguage(args.targetLang);
    if (!normalizedTargetLang) {
      return { translations: [] };
    }
    const segments = args.texts.map(text => ({ text }));
    const translationResult = await translateSegmentTexts(segments, normalizedTargetLang);
    return { translations: translationResult.translations };
  },
});

export const adminRepairTranscriptTranslation = internalAction({
  args: {
    episodeId: v.string(),
    targetLang: v.string(),
    chunkSize: v.optional(v.number()),
    startIndex: v.optional(v.number()),
    endIndex: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const normalizedTargetLang = normalizeTargetLanguage(args.targetLang);
    if (!normalizedTargetLang) {
      throw new ConvexError('INVALID_TARGET_LANGUAGE');
    }

    const record = await ctx.runQuery(internal.podcastTranscripts.getRecordByEpisode, {
      episodeId: args.episodeId,
    });
    if (!record || record.segments.length === 0) {
      throw new ConvexError('TRANSCRIPT_NOT_FOUND');
    }

    const requestedChunkSize = Math.floor(args.chunkSize ?? 1);
    const chunkSize = Math.max(1, Math.min(5, requestedChunkSize));
    const startIndex = Math.max(0, Math.floor(args.startIndex ?? 0));
    const endIndex = Math.min(
      record.segments.length,
      Math.max(startIndex, Math.floor(args.endIndex ?? record.segments.length))
    );
    const targetSegments = record.segments.slice(startIndex, endIndex);
    const translations: string[] = [];
    let providerUsed: string | null = null;

    for (let index = 0; index < targetSegments.length; index += chunkSize) {
      const chunk = targetSegments
        .slice(index, index + chunkSize)
        .map(segment => ({ text: segment.text }));

      const result = await translateSegmentTexts(chunk, normalizedTargetLang);
      for (let offset = 0; offset < chunk.length; offset += 1) {
        const source = chunk[offset]?.text ?? '';
        let translation = result.translations[offset] ?? '';

        if (
          !translation.trim() ||
          isSuspiciousUntranslatedLine(source, translation, normalizedTargetLang)
        ) {
          const directFallback = await translateSingleTextDirect(source, normalizedTargetLang);
          translation = directFallback.translation;
          providerUsed = providerUsed ?? directFallback.provider?.provider ?? null;
        }

        if (!translation.trim()) {
          throw new ConvexError(`EMPTY_TRANSCRIPT_TRANSLATION_AT_${startIndex + index + offset}`);
        }
        if (isSuspiciousUntranslatedLine(source, translation, normalizedTargetLang)) {
          throw new ConvexError(
            `SUSPICIOUS_TRANSCRIPT_TRANSLATION_AT_${startIndex + index + offset}`
          );
        }

        translations.push(translation);
      }

      providerUsed = providerUsed ?? result.provider?.provider ?? null;
    }

    const mergedTranslations = Array.from(
      { length: record.segments.length },
      (_, index) => record.translations?.[normalizedTargetLang]?.[index] ?? ''
    );
    translations.forEach((translation, index) => {
      mergedTranslations[startIndex + index] = translation;
    });

    await ctx.runMutation(internal.podcastTranscripts.setTranslations, {
      episodeId: args.episodeId,
      language: normalizedTargetLang,
      translations: mergedTranslations,
    });

    return {
      success: true,
      count: translations.length,
      startIndex,
      endIndex,
      provider: providerUsed,
      sample: translations.slice(0, 3),
    };
  },
});

// Analyze video (transcribe + translate)
export const generateVideoAnalysis = action({
  args: {
    videoUrl: v.string(),
    language: v.optional(v.string()), // Target language for translation (defaults to zh)
  },
  handler: async (ctx, args) => {
    const userId = await guardAiAction(ctx, 'generate_video_analysis');
    // 1. Fetch file
    // Note: Video analysis might also need to switch to Deepgram if videos are large
    // But for now, user instruction only mentioned generateTranscript.
    // Leaving existing logic AS IS per instructions to only refactor generateTranscript
    // Wait, reusing existing logic might fail if generateTranscript is a template?
    // No, this is a separate export.

    // HOWEVER: The "User" didn't explicitly say "fix generateVideoAnalysis", but "Refactor the generateTranscript action".

    // Existing logic is OpenAI-based.
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return { success: false, error: 'OPENAI_API_KEY not set' };
    }

    try {
      console.log(`[AI] Fetching video: ${args.videoUrl}`);
      const res = await fetch(args.videoUrl);
      if (!res.ok) {
        return { success: false, error: `Failed to fetch video (${res.status})` };
      }

      const contentType = res.headers.get('content-type') || 'video/mp4';
      const ext = contentType.includes('mp4') ? 'mp4' : 'mp3'; // Fallback
      const buffer = await res.arrayBuffer();
      const file = new File([buffer], `video_temp.${ext}`, { type: contentType });

      console.log(`[AI] Transcribing ${file.size} bytes...`);

      // 2. Transcribe with Whisper
      const client = new OpenAI({ apiKey });
      const transcription = await client.audio.transcriptions.create({
        file,
        model: 'whisper-1',
        response_format: 'verbose_json',
        timestamp_granularities: ['segment'],
      });

      await ctx.runMutation(logUsageMutation, {
        userId,
        feature: 'transcribe_video',
        model: 'whisper-1',
      });

      // 3. Process Segments
      const rawSegments =
        (transcription as unknown as { segments?: WhisperSegment[] }).segments ?? [];

      const baseSegments = rawSegments
        .map(s => ({
          start: typeof s.start === 'number' ? s.start : 0,
          end: typeof s.end === 'number' ? s.end : 0,
          text: typeof s.text === 'string' ? s.text.trim() : '',
          translation: '',
        }))
        .filter(s => s.text.length > 0);

      // 4. Translate if needed.
      const targetLangCode = normalizeTargetLanguage(args.language) || 'zh';
      const targetLangLabel = TARGET_LANGUAGE_LABELS[targetLangCode] || 'Simplified Chinese';

      console.log(`[AI] Translating ${baseSegments.length} segments to ${targetLangLabel}...`);

      if (baseSegments.length > 0) {
        const { completion, provider } = await runChatCompletionWithFallback(
          ({ client, provider }) =>
            client.chat.completions.create({
              model: provider.model,
              messages: [
                {
                  role: 'system',
                  content: `Translate the following Korean video transcript segments into ${targetLangLabel}.
              Return a JSON object with a "translations" array of strings, strictly matching the order and count of the input.
              Keep the translation concise and natural for subtitles.`,
                },
                {
                  role: 'user',
                  content: JSON.stringify({
                    segments: baseSegments.map(s => s.text),
                  }),
                },
              ],
              response_format: { type: 'json_object' },
            }),
          { label: 'translate_video' }
        );

        const usage = completion.usage;
        await ctx.runMutation(logUsageMutation, {
          userId,
          feature: 'translate_video',
          model: provider.model,
          promptTokens: usage?.prompt_tokens,
          completionTokens: usage?.completion_tokens,
          totalTokens: usage?.total_tokens,
          costUsd: 0,
          provider: provider.provider,
        });

        const content = completion.choices[0].message.content;
        if (content) {
          const parsed = JSON.parse(content) as { translations?: string[] };
          const translations = Array.isArray(parsed.translations) ? parsed.translations : [];

          baseSegments.forEach((seg, i) => {
            if (translations[i]) seg.translation = translations[i];
          });
        }
      }

      return { success: true, data: baseSegments };
    } catch (error) {
      console.error('[AI] Video analysis failed:', error);
      return { success: false, error: toErrorMessage(error) };
    }
  },
});

// Grammar Quiz Generation Action
export const generateGrammarQuiz = action({
  args: {
    title: v.string(),
    summary: v.string(),
    explanation: v.string(),
    examples: v.string(),
  },
  handler: async (_ctx, args) => {
    const providers = resolveChatProviderConfigs(process.env);
    if (providers.length === 0) {
      return { success: false, error: 'AI chat provider not configured', quizItems: [] };
    }

    const systemPrompt = `You are a Korean language teaching assistant generating practice quiz items.
CRITICAL RULES:
- Korean text in answers must NEVER be translated. It stays as Korean in ALL language versions (zh, en, vi, mn).
- Each answer that contains a Korean example sentence should format it as: "Korean sentence (translation in target language)"
- Return valid JSON only.`;

    const userPrompt = `Generate 3 quiz items for this Korean grammar point:

Grammar: ${args.title}
Summary: ${args.summary}
Explanation: ${args.explanation.substring(0, 600)}
Examples: ${args.examples}

Quiz requirements:
Q1: Knowledge question about the grammar rule. Answer explains the rule.
Q2: Sentence completion/formation. Ask to form a Korean sentence. Answer MUST contain a Korean sentence.
Q3: Translation exercise. Give a Korean sentence, ask to explain it. Answer provides the meaning.

For each prompt and answer, provide 4 languages: zh (Simplified Chinese), en (English), vi (Vietnamese), mn (Mongolian).
Korean text in answers must remain Korean in ALL language versions. Only translate the explanation parts.

Example answer format for Korean sentences:
  en: "하나마나 실패할 거예요. (It will fail regardless.)"
  zh: "하나마나 실패할 거예요.（不管怎样都会失败。）"

    Return JSON: {"items": [{"prompt":{"zh":"...","en":"...","vi":"...","mn":"..."},"answer":{"zh":"...","en":"...","vi":"...","mn":"..."}}, ...]}`;

    try {
      const { completion } = await runChatCompletionWithFallback(
        ({ client, provider }) =>
          client.chat.completions.create({
            model: provider.model,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt },
            ],
            response_format: { type: 'json_object' as const },
            temperature: 0.7,
          }),
        { label: 'generate_grammar_quiz' }
      );

      const content = completion.choices[0]?.message?.content;
      if (!content) return { success: false, error: 'Empty response', quizItems: [] };

      const parsed = JSON.parse(content) as Record<string, unknown>;
      let items = parsed.items || parsed.quizItems || parsed.quiz_items || parsed.questions;
      if (!Array.isArray(items)) {
        items = Object.values(parsed).find(v => Array.isArray(v)) || [];
      }

      const valid = (
        items as Array<{ prompt?: Record<string, string>; answer?: Record<string, string> }>
      )
        .filter(
          item =>
            item.prompt &&
            typeof item.prompt === 'object' &&
            item.answer &&
            typeof item.answer === 'object' &&
            (item.prompt.zh || item.prompt.en)
        )
        .slice(0, 3);

      return { success: true, quizItems: valid };
    } catch (err) {
      return { success: false, error: toErrorMessage(err), quizItems: [] };
    }
  },
});

export const classifyGrammars = action({
  args: {
    grammars: v.array(
      v.object({
        id: v.id('grammar_points'),
        title: v.string(),
        summary: v.string(),
      })
    ),
  },
  handler: async (_ctx, args) => {
    const providers = resolveChatProviderConfigs(process.env);
    if (providers.length === 0) return { success: false, error: 'AI chat provider not configured' };

    const categories = [
      '1: 猜测与推断 (Speculation)',
      '2: 对照与转折 (Contrast)',
      '3: 原因与理由 (Cause & Reason)',
      '4: 目的与意图 (Purpose)',
      '5: 进行与完成 (Aspect)',
      '6: 状态与其持续 (State)',
      '7: 程度与限定 (Degree)',
      '8: 假设与假定 (Hypothesis)',
      '9: 让步与包含 (Concession)',
      '10: 机会与改变 (Opportunity)',
      '11: 传闻与引用 (Indirect Speech)',
      '12: 必然与经历 (Necessity)',
      '13: 罗列与顺序 (Listing)',
      '14: 基准与范围 (Standard)',
      '15: 助词与添意 (Particles)',
    ];

    const prompt = `Classify the following Korean grammar points into one of these 15 categories. Return a JSON object mapping the grammar ID to the category number (1-15).

Categories:
${categories.join('\n')}

Grammar points:
${args.grammars.map(g => `ID: ${g.id} | Title: ${g.title} | Summary: ${g.summary}`).join('\n')}

    Return JSON: {"classifications": {"id1": 1, "id2": 5, ...}}`;

    try {
      const { completion } = await runChatCompletionWithFallback(
        ({ client, provider }) =>
          client.chat.completions.create({
            model: provider.model,
            messages: [{ role: 'user', content: prompt }],
            response_format: { type: 'json_object' as const },
          }),
        { label: 'classify_grammars' }
      );

      const content = completion.choices[0]?.message?.content;
      if (!content) return { success: false, error: 'Empty response' };

      const parsed = JSON.parse(content) as { classifications: Record<string, number> };
      return { success: true, classifications: parsed.classifications };
    } catch (err) {
      return { success: false, error: toErrorMessage(err) };
    }
  },
});

type TopikCategoryDefinition = {
  id: number;
  zh: string;
  en: string;
  description: string;
  positiveSignals: string[];
};

const TOPIK_CATEGORY_DEFINITIONS: TopikCategoryDefinition[] = [
  {
    id: 1,
    zh: '推测与推断',
    en: 'Speculation & Inference',
    description: '表达说话者的猜测、推断、可能性判断或委婉判断。',
    positiveSignals: ['推测', '猜测', '可能', '看来', '似乎', 'inference', 'seems', 'guess'],
  },
  {
    id: 2,
    zh: '对比与转折',
    en: 'Contrast & Shift',
    description: '表达前后内容对照、转折、让步后反转、语义逆向连接。',
    positiveSignals: ['但是', '然而', '转折', '对比', 'contrast', 'however', 'while'],
  },
  {
    id: 3,
    zh: '原因与理由',
    en: 'Cause & Reason',
    description: '表达原因、依据、理由、因果关系。',
    positiveSignals: ['因为', '所以', '理由', '原因', 'cause', 'reason', 'because'],
  },
  {
    id: 4,
    zh: '目的与意图',
    en: 'Purpose & Intent',
    description: '表达目的、打算、意图、计划趋向。',
    positiveSignals: ['为了', '打算', '意图', '目的', 'purpose', 'intend', 'plan'],
  },
  {
    id: 5,
    zh: '进展与完成',
    en: 'Progress & Completion',
    description: '表达进行、变化过程、结果完成或动作终结。',
    positiveSignals: ['开始', '结束', '完成', '过程', 'progress', 'completion', 'ended up'],
  },
  {
    id: 6,
    zh: '状态与持续',
    en: 'State & Continuity',
    description: '表达状态保持、持续、习惯或长期特征。',
    positiveSignals: ['一直', '持续', '状态', '习惯', 'state', 'continuity', 'ongoing'],
  },
  {
    id: 7,
    zh: '程度与限制',
    en: 'Degree & Limits',
    description: '表达程度变化、上限下限、限定范围、强弱差异。',
    positiveSignals: ['程度', '越', '最', '限制', 'degree', 'limit', 'extent'],
  },
  {
    id: 8,
    zh: '假设与前提',
    en: 'Hypothesis & Condition',
    description: '表达条件、假设、前提成立与否。',
    positiveSignals: ['如果', '假设', '前提', '条件', 'if', 'suppose', 'condition'],
  },
  {
    id: 9,
    zh: '让步与包含',
    en: 'Concession & Inclusion',
    description: '表达尽管、即使、包含、附加范围。',
    positiveSignals: ['尽管', '即使', '包含', '连', 'concession', 'even if', 'including'],
  },
  {
    id: 10,
    zh: '机会与变化',
    en: 'Chance & Change',
    description: '表达机会、转机、变化趋势与状态转换。',
    positiveSignals: ['机会', '变化', '转变', 'chance', 'change', 'turning point'],
  },
  {
    id: 11,
    zh: '引述与传闻',
    en: 'Quotation & Reported Speech',
    description: '表达引用、转述、听说、间接引语。',
    positiveSignals: ['听说', '据说', '引用', '转述', 'reported', 'quotation', 'indirect speech'],
  },
  {
    id: 12,
    zh: '必要与经验',
    en: 'Necessity & Experience',
    description: '表达必须、应当、经验有无、义务与经历。',
    positiveSignals: ['必须', '需要', '经验', '应该', 'must', 'need', 'experience'],
  },
  {
    id: 13,
    zh: '列举与顺序',
    en: 'Listing & Sequence',
    description: '表达并列、列举、顺序先后。',
    positiveSignals: ['首先', '然后', '列举', '顺序', 'listing', 'sequence', 'first'],
  },
  {
    id: 14,
    zh: '标准与范围',
    en: 'Standard & Scope',
    description: '表达依据标准、范围界定、比较基准。',
    positiveSignals: ['标准', '范围', '按照', '基准', 'standard', 'scope', 'based on'],
  },
  {
    id: 15,
    zh: '助词与语气',
    en: 'Particles & Nuance',
    description: '表达语气、助词功能、细微语用差异。',
    positiveSignals: ['助词', '语气', '口气', 'particle', 'nuance', 'tone'],
  },
];

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length === 0 || b.length === 0 || a.length !== b.length) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i += 1) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA <= 0 || normB <= 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

function toTopikSemanticsError(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

export const adminClassifyTopikBySemantics = action({
  args: {
    items: v.array(
      v.object({
        key: v.string(),
        language: v.union(v.literal('zh'), v.literal('en')),
        title: v.string(),
        summary: v.optional(v.string()),
        explanation: v.optional(v.string()),
      })
    ),
  },
  handler: async (_ctx, args) => {
    await requireAdminAction(_ctx);
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return { success: false, error: 'OPENAI_API_KEY not set', results: [] };

    const client = new OpenAI({ apiKey });
    const categoryTexts = TOPIK_CATEGORY_DEFINITIONS.map(
      category =>
        `Category ${category.id}: ${category.zh} / ${category.en}. ${category.description}. Signals: ${category.positiveSignals.join(', ')}`
    );
    const itemTexts = args.items.map(item => {
      const summary = (item.summary || '').slice(0, 500);
      const explanation = (item.explanation || '').slice(0, 1200);
      return `${item.title}\n${summary}\n${explanation}`;
    });

    const embeddingCategoryByKey = new Map<
      string,
      { categoryId: number; score: number; channel: string }
    >();

    try {
      const categoryEmbeddingResponse = await client.embeddings.create({
        model: 'text-embedding-3-small',
        input: categoryTexts,
      });
      const itemEmbeddingResponse = await client.embeddings.create({
        model: 'text-embedding-3-small',
        input: itemTexts,
      });

      const categoryVectors = categoryEmbeddingResponse.data.map(row => row.embedding);
      const itemVectors = itemEmbeddingResponse.data.map(row => row.embedding);

      args.items.forEach((item, index) => {
        const vector = itemVectors[index] || [];
        let bestCategory = TOPIK_CATEGORY_DEFINITIONS[0]?.id || 15;
        let bestScore = -1;
        categoryVectors.forEach((categoryVector, catIndex) => {
          const score = cosineSimilarity(vector, categoryVector);
          if (score > bestScore) {
            bestScore = score;
            bestCategory = TOPIK_CATEGORY_DEFINITIONS[catIndex]?.id || 15;
          }
        });
        embeddingCategoryByKey.set(item.key, {
          categoryId: bestCategory,
          score: clamp01((bestScore + 1) / 2),
          channel: 'embedding',
        });
      });
    } catch (error) {
      console.warn('[adminClassifyTopikBySemantics] embedding channel failed:', error);
      for (const item of args.items) {
        embeddingCategoryByKey.set(item.key, { categoryId: 15, score: 0.35, channel: 'fallback' });
      }
    }

    const llmPrompt = `你是韩语语法专家。请将每条语法按“含义”归入以下 15 类之一，并给出证据短句。
分类：
${TOPIK_CATEGORY_DEFINITIONS.map(c => `${c.id}. ${c.zh} / ${c.en}: ${c.description}`).join('\n')}

输入数据：
${args.items
  .map(
    item =>
      `KEY=${item.key}\nLANG=${item.language}\nTITLE=${item.title}\nSUMMARY=${item.summary || ''}\nEXPLANATION=${(item.explanation || '').slice(0, 900)}`
  )
  .join('\n\n---\n\n')}

仅返回 JSON：
{"results":[{"key":"...","categoryId":1,"confidence":0.0-1.0,"reason":"...","evidence":"..."}, ...]}`;

    let llmResults: Array<{
      key: string;
      categoryId: number;
      confidence: number;
      reason?: string;
      evidence?: string;
    }> = [];
    try {
      const { completion } = await runChatCompletionWithFallback(
        ({ client, provider }) =>
          client.chat.completions.create({
            model: provider.model,
            messages: [{ role: 'user', content: llmPrompt }],
            response_format: { type: 'json_object' as const },
            temperature: 0.1,
          }),
        { label: 'admin_classify_topik_semantics' }
      );
      const content = completion.choices[0]?.message?.content || '';
      const parsed = JSON.parse(content) as {
        results?: Array<{
          key?: string;
          categoryId?: number;
          confidence?: number;
          reason?: string;
          evidence?: string;
        }>;
      };
      llmResults = (parsed.results || [])
        .filter(item => typeof item.key === 'string')
        .map(item => ({
          key: item.key as string,
          categoryId: Math.max(1, Math.min(15, Math.floor(item.categoryId || 15))),
          confidence: clamp01(Number(item.confidence ?? 0.5)),
          reason: item.reason,
          evidence: item.evidence,
        }));
    } catch (error) {
      return {
        success: false,
        error: `LLM channel failed: ${toTopikSemanticsError(error)}`,
        results: [],
      };
    }

    const llmByKey = new Map(llmResults.map(item => [item.key, item]));
    const finalResults = args.items.map(item => {
      const embedding = embeddingCategoryByKey.get(item.key) || {
        categoryId: 15,
        score: 0.35,
        channel: 'fallback',
      };
      const llm = llmByKey.get(item.key);
      const hasLlm = Boolean(llm);
      const llmCategory = llm?.categoryId ?? embedding.categoryId;
      const llmConfidence = clamp01(llm?.confidence ?? 0.35);
      const agrees = llmCategory === embedding.categoryId;
      const combinedConfidence = hasLlm
        ? agrees
          ? clamp01((llmConfidence + embedding.score) / 2)
          : clamp01(Math.max(llmConfidence * 0.75, embedding.score * 0.75))
        : embedding.score;
      const finalCategoryId =
        agrees || llmConfidence >= 0.82 || !hasLlm ? llmCategory : embedding.categoryId;
      const status: 'AUTO_OK' | 'NEEDS_REVIEW' = hasLlm
        ? agrees && combinedConfidence >= 0.72
          ? 'AUTO_OK'
          : 'NEEDS_REVIEW'
        : embedding.score >= 0.72
          ? 'AUTO_OK'
          : 'NEEDS_REVIEW';

      return {
        key: item.key,
        categoryId: finalCategoryId,
        confidence: combinedConfidence,
        status,
        reason:
          llm?.reason ||
          `embedding=${embedding.categoryId}(${embedding.score.toFixed(2)}), llm=${llmCategory}(${llmConfidence.toFixed(2)})`,
        evidence: llm?.evidence || '',
        channels: {
          embeddingCategoryId: embedding.categoryId,
          embeddingScore: embedding.score,
          llmCategoryId: llmCategory,
          llmConfidence,
        },
      };
    });

    return {
      success: true,
      results: finalResults,
    };
  },
});

export const adminRunTopikQualityRepair = action({
  args: {
    courseId: v.optional(v.string()),
    batchSize: v.optional(v.number()),
    apply: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await requireAdminAction(ctx);

    const courseId = args.courseId?.trim() || 'topik-grammar';
    const batchSize = Math.max(1, Math.min(200, Math.floor(args.batchSize ?? 40)));

    const summarize = (
      results: Array<{
        total?: number;
        scanned?: number;
        changed?: number;
        summariesRegenerated?: number;
        issueCounts?: {
          processingKeyword?: number;
          labelPrefix?: number;
          romanization?: number;
          mergedMarker?: number;
          noisyTitleSuffix?: number;
        };
        samples?: Array<{ grammarId: string; beforeTitle: string; afterTitle: string }>;
        errors?: string[];
      }>
    ) => {
      const summary = {
        batches: results.length,
        total: 0,
        scanned: 0,
        changed: 0,
        summariesRegenerated: 0,
        issueCounts: {
          processingKeyword: 0,
          labelPrefix: 0,
          romanization: 0,
          mergedMarker: 0,
          noisyTitleSuffix: 0,
        },
        samples: [] as Array<{ grammarId: string; beforeTitle: string; afterTitle: string }>,
        errors: [] as string[],
      };

      for (const result of results) {
        summary.total = Math.max(summary.total, result.total ?? 0);
        summary.scanned += result.scanned ?? 0;
        summary.changed += result.changed ?? 0;
        summary.summariesRegenerated += result.summariesRegenerated ?? 0;
        summary.issueCounts.processingKeyword += result.issueCounts?.processingKeyword ?? 0;
        summary.issueCounts.labelPrefix += result.issueCounts?.labelPrefix ?? 0;
        summary.issueCounts.romanization += result.issueCounts?.romanization ?? 0;
        summary.issueCounts.mergedMarker += result.issueCounts?.mergedMarker ?? 0;
        summary.issueCounts.noisyTitleSuffix += result.issueCounts?.noisyTitleSuffix ?? 0;

        for (const sample of result.samples || []) {
          if (summary.samples.length >= 40) break;
          summary.samples.push(sample);
        }
        for (const error of result.errors || []) {
          if (summary.errors.length >= 80) break;
          summary.errors.push(error);
        }
      }

      return summary;
    };

    const runPass = async (dryRun: boolean) => {
      let offset = 0;
      const results: Array<{
        total?: number;
        scanned?: number;
        changed?: number;
        summariesRegenerated?: number;
        issueCounts?: {
          processingKeyword?: number;
          labelPrefix?: number;
          romanization?: number;
          mergedMarker?: number;
          noisyTitleSuffix?: number;
        };
        samples?: Array<{ grammarId: string; beforeTitle: string; afterTitle: string }>;
        errors?: string[];
      }> = [];

      while (true) {
        const result = await ctx.runMutation(api.grammars.adminSanitizeTopikCourseBatch, {
          courseId,
          offset,
          limit: batchSize,
          dryRun,
        });
        results.push(result);
        offset += result.scanned ?? 0;
        if ((result.scanned ?? 0) === 0 || offset >= (result.total ?? 0)) break;
      }

      return summarize(results);
    };

    const dryRunSummary = await runPass(true);

    if (args.apply !== true) {
      return {
        success: true,
        courseId,
        batchSize,
        mode: 'dry-run',
        dryRunSummary,
      };
    }

    const applySummary = await runPass(false);
    const verifySummary = await runPass(true);

    return {
      success: true,
      courseId,
      batchSize,
      mode: 'apply',
      dryRunSummary,
      applySummary,
      verifySummary,
    };
  },
});

export const translateGrammarSections = action({
  args: {
    enContent: v.string(),
    targetLangs: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const providers = resolveChatProviderConfigs(process.env);
    if (providers.length === 0) throw new Error('AI chat provider is not configured');

    const prompt = `You are a professional translator for a Korean learning platform. 
Translate the following English content into these languages: ${args.targetLangs.join(', ')}.
The content is a specific section of a grammar point (e.g., Comparative analysis, Cultural relevance, or Review).
Maintain the markdown formatting and placeholders exactly.

CRITICAL: Return a simple JSON object where each key is exactly a language code (${args.targetLangs.join(', ')}) and the value is a single plain string of the translated content. 
DO NOT use nested objects, DO NOT use arrays, and DO NOT use non-ASCII characters in keys.

English Content:
${args.enContent}

Return a raw JSON object only:
{
  ${args.targetLangs.map(lang => `"${lang}": "translated string..."`).join(',\n')}
}`;

    const { completion: response } = await runChatCompletionWithFallback(
      ({ client, provider }) =>
        client.chat.completions.create({
          model: provider.model,
          messages: [
            { role: 'system', content: 'You return only raw JSON.' },
            { role: 'user', content: prompt },
          ],
          response_format: { type: 'json_object' },
        }),
      { label: 'translate_grammar_sections' }
    );

    const content = response.choices[0].message.content;
    if (!content) return null;

    const parsed = JSON.parse(content);
    const filtered: Record<string, string> = {};
    for (const lang of args.targetLangs) {
      if (typeof parsed[lang] === 'string') {
        filtered[lang] = parsed[lang];
      }
    }
    return filtered;
  },
});
