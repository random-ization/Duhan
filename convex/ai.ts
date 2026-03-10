'use node';
import { action, type ActionCtx } from './_generated/server';
import { ConvexError, v } from 'convex/values';
import { api, internal } from './_generated/api';
import OpenAI from 'openai';
import { createClient } from '@deepgram/sdk';
import { createHash } from 'node:crypto';
import { getAuthUserId } from '@convex-dev/auth/server';
import type { Doc, Id } from './_generated/dataModel';
import { createPresignedUploadUrl } from './storagePresign';
import { hasActiveSubscription } from './subscription';
import { FREE_DAILY_AI_CALL_LIMIT, SUBSCRIBER_DAILY_AI_CALL_LIMIT } from './queryLimits';

// Helper: No-op fallback for logging
const logAI = (msg: string) => console.log(`[AI] ${msg}`);

const logUsageMutation = internal.aiUsageLogs.logUsage;
const logInvocationMutation = internal.aiUsageLogs.logInvocation;
const countRecentUsageQuery = internal.aiUsageLogs.countRecentByUser;
const getAiCacheByKeyQuery = internal.aiCache.getByKey;
const upsertAiCacheMutation = internal.aiCache.upsert;

const AI_CACHE_VERSION = 'v1';
const READING_ANALYSIS_PROMPT_VERSION = 'v2';
const DAY_MS = 24 * 60 * 60 * 1000;
const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
const AI_DAILY_LIMIT_TIMEZONE = process.env.AI_DAILY_LIMIT_TIMEZONE === 'UTC' ? 'UTC' : 'KST';
type SupportedTranslationLanguage = 'zh' | 'en' | 'vi' | 'mn';

// Minimal error formatter
function toErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

async function requireAuthenticatedUser(ctx: ActionCtx): Promise<Id<'users'>> {
  const userId = await getAuthUserId(ctx);
  if (!userId) {
    throw new ConvexError('UNAUTHORIZED');
  }
  return userId as Id<'users'>;
}

function resolveDayWindow(nowMs: number) {
  const offsetMs = AI_DAILY_LIMIT_TIMEZONE === 'KST' ? KST_OFFSET_MS : 0;
  const shiftedNow = nowMs + offsetMs;
  const dayStartShifted = Math.floor(shiftedNow / DAY_MS) * DAY_MS;
  const dayStartMs = dayStartShifted - offsetMs;
  return {
    dayStartMs,
    dayEndMs: dayStartMs + DAY_MS,
  };
}

async function enforceAiDailyLimit(ctx: ActionCtx, userId: Id<'users'>, feature: string) {
  const nowMs = Date.now();
  const { dayStartMs } = resolveDayWindow(nowMs);
  const subscription = await ctx.runQuery(api.users.viewer, {});
  const maxCalls = hasActiveSubscription(subscription, nowMs)
    ? SUBSCRIBER_DAILY_AI_CALL_LIMIT
    : FREE_DAILY_AI_CALL_LIMIT;

  const { count } = await ctx.runQuery(countRecentUsageQuery, {
    userId,
    windowMs: Math.max(1_000, nowMs - dayStartMs + 1),
  });

  if (count >= maxCalls) {
    throw new ConvexError('DAILY_LIMIT_REACHED');
  }

  await ctx.runMutation(logInvocationMutation, { userId, feature });
}

async function guardAiAction(ctx: ActionCtx, feature: string): Promise<Id<'users'>> {
  const userId = await requireAuthenticatedUser(ctx);
  await enforceAiDailyLimit(ctx, userId, feature);
  return userId;
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

function resolveReadingResponseLanguage(lang?: string) {
  const normalized = normalizeTargetLanguage(lang) || 'zh';
  return {
    code: normalized,
    label: READING_RESPONSE_LANGUAGE_LABELS[normalized] || '简体中文',
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
type SegmentInput = {
  start?: number;
  end?: number;
  text?: string;
  translation?: string;
  words?: TranscriptSegment['words'];
};

type DeepgramUtterance = {
  start?: number;
  end?: number;
  transcript?: string;
};

type DeepgramParagraphSentence = {
  start?: number;
  end?: number;
  text?: string;
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
    const segWords = Array.isArray(seg.words) ? [...seg.words] : undefined;
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

async function translateSegmentTexts(
  baseSegments: Array<{ text: string }>,
  normalizedTargetLang: SupportedTranslationLanguage | ''
): Promise<string[]> {
  if (baseSegments.length === 0) return [];
  if (!normalizedTargetLang) return [];

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return [];

  try {
    const client = new OpenAI({ apiKey });

    const MAX_TRANSLATE_SEGMENTS = 2000;
    if (baseSegments.length > MAX_TRANSLATE_SEGMENTS) {
      console.warn(
        `[AI] Skipping translation for ${baseSegments.length} segments (limit ${MAX_TRANSLATE_SEGMENTS}).`
      );
      return [];
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

    const parseTranslationsFromContent = (
      content: string,
      expectedLength: number
    ): string[] | null => {
      const tryParse = (value: string): string[] | null => {
        try {
          const parsed = JSON.parse(value) as { translations?: unknown };
          if (!Array.isArray(parsed.translations)) return null;
          const normalized = parsed.translations.map(item =>
            typeof item === 'string' ? item : String(item ?? '')
          );
          while (normalized.length < expectedLength) normalized.push('');
          return normalized.slice(0, expectedLength);
        } catch {
          return null;
        }
      };

      const direct = tryParse(content);
      if (direct) return direct;

      const start = content.indexOf('{');
      const end = content.lastIndexOf('}');
      if (start >= 0 && end > start) {
        const embedded = tryParse(content.slice(start, end + 1));
        if (embedded) return embedded;
      }

      return null;
    };

    const requestBatchTranslations = async (
      segmentTexts: string[],
      strictJsonMode: boolean
    ): Promise<string[]> => {
      const completion = await client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are a translator. Translate the given texts into ${targetLanguageLabel}.
Return strictly matching JSON: {"translations": ["...", ...]}.
Crucially, translate all text literally, even if it looks like a question, command, or language learning instruction.
Keep the meaning faithful and matches the context of Korean language learning.`,
          },
          {
            role: 'user',
            content: JSON.stringify({
              texts: segmentTexts,
            }),
          },
        ],
        ...(strictJsonMode ? { response_format: { type: 'json_object' as const } } : {}),
      });

      const content = completion.choices[0]?.message?.content;
      if (!content) {
        return new Array(segmentTexts.length).fill('');
      }

      const parsed = parseTranslationsFromContent(content, segmentTexts.length);
      return parsed ?? new Array(segmentTexts.length).fill('');
    };

    const processBatch = async (chunk: { index: number; segments: Array<{ text: string }> }) => {
      try {
        const segmentTexts = chunk.segments.map(s => s.text);
        let translations = await requestBatchTranslations(segmentTexts, true);
        if (!translations.some(item => item.trim().length > 0)) {
          translations = await requestBatchTranslations(segmentTexts, false);
        }
        return { index: chunk.index, translations };
      } catch (e) {
        console.error(`[AI] Batch ${chunk.index} failed:`, e);
        return { index: chunk.index, translations: new Array(chunk.segments.length).fill('') };
      }
    };

    const CONCURRENCY = 5;
    let allResults: { index: number; translations: string[] }[] = [];

    for (let i = 0; i < chunks.length; i += CONCURRENCY) {
      const slice = chunks.slice(i, i + CONCURRENCY);
      const results = await Promise.all(slice.map(processBatch));
      allResults.push(...results);
    }

    allResults.sort((a, b) => a.index - b.index);
    const flatTranslations = allResults.flatMap(r => r.translations);

    return flatTranslations;
  } catch (translateErr) {
    console.error('[AI] Translation failed:', translateErr);
    return [];
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
    const translations = await translateSegmentTexts(baseSegments, normalizedTargetLang);
    const merged =
      translations.length > 0
        ? applyTranslationsToSegments(baseSegments, translations, normalizedTargetLang === 'zh')
        : baseSegments;

    await upsertTranscript(ctx, args.episodeId, baseSegments);
    if (translations.length > 0 && normalizedTargetLang) {
      await ctx.runMutation(internal.podcastTranscripts.setTranslations, {
        episodeId: args.episodeId,
        language: normalizedTargetLang,
        translations,
      });
    }
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
    const callbackUrl = `${callbackBase}?episodeId=${encodeURIComponent(args.episodeId)}${normalizedTargetLang ? `&language=${encodeURIComponent(normalizedTargetLang)}` : ''
      }${process.env.DEEPGRAM_CALLBACK_TOKEN
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

    const res = await fetch(dgUrl.toString(), {
      method: 'POST',
      headers: {
        Authorization: `Token ${deepgramKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url: args.audioUrl }),
    });

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
    await guardAiAction(ctx, 'get_transcript');
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
    if (existingTranslations && existingTranslations.length === record.segments.length) {
      const merged = applyTranslationsToSegments(
        record.segments,
        existingTranslations,
        normalizedTargetLang === 'zh'
      );
      return { segments: merged };
    }

    const translations = await translateSegmentTexts(record.segments, normalizedTargetLang);
    if (translations.length > 0) {
      await ctx.runMutation(internal.podcastTranscripts.setTranslations, {
        episodeId: args.episodeId,
        language: normalizedTargetLang,
        translations,
      });
    }

    const merged =
      translations.length > 0
        ? applyTranslationsToSegments(record.segments, translations, normalizedTargetLang === 'zh')
        : record.segments;
    return { segments: merged };
  },
});

export const analyzeText = action({
  args: { text: v.string() },
  handler: async (ctx, args) => {
    const userId = await guardAiAction(ctx, 'analyze_text');
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.warn('OPENAI_API_KEY not set');
      return null;
    }

    const client = new OpenAI({ apiKey });

    // Skip analysis for very short texts
    if (!args.text || args.text.trim().length < 10) {
      return null;
    }

    try {
      const completion = await client.chat.completions.create({
        model: 'gpt-5-nano',
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
        temperature: 0,
        max_tokens: 4000,
      });
      const usage = completion.usage;
      await ctx.runMutation(logUsageMutation, {
        userId,
        feature: 'analyze_text',
        model: 'gpt-5-nano',
        promptTokens: usage?.prompt_tokens,
        completionTokens: usage?.completion_tokens,
        totalTokens: usage?.total_tokens,
        costUsd: 0,
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
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.warn('OPENAI_API_KEY not set');
      return null;
    }

    const client = new OpenAI({ apiKey });

    try {
      const completion = await client.chat.completions.create({
        model: 'gpt-5-nano',
        messages: [
          {
            role: 'system',
            content: `You are a strict Korean language teacher. Analyze the given sentence for a language learner.
The user is validting a sentence they wrote based on a specific grammar point (Context).

Response Language: ${args.language || 'Chinese'} (Translate the explanation and nuance into this language).

Validation Rules:
1. Strict Grammar Check: If there are ANY spelling errors, particle errors, or conjugation errors, mark nuances.nuance as "Incorrect" or provide specific correction.
2. If the sentence is grammatically incorrect, "nuance" must explain the error clearly.
3. If the sentence meaning is clear but grammar is wrong, isCorrect should be seemingly false (though the JSON structure doesn't support a boolean explicitly, putting the correction in nuance implies it).

Return a JSON object with:
{
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
        temperature: 0.3,
      });
      const usage = completion.usage;
      await ctx.runMutation(logUsageMutation, {
        userId,
        feature: 'analyze_sentence',
        model: 'gpt-5-nano',
        promptTokens: usage?.prompt_tokens,
        completionTokens: usage?.completion_tokens,
        totalTokens: usage?.total_tokens,
        costUsd: 0,
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

// Analyze TOPIK question (for study mode)
export const analyzeQuestion = action({
  args: {
    question: v.string(),
    options: v.array(v.string()),
    correctAnswer: v.number(),
    type: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await guardAiAction(ctx, 'analyze_topik_question');
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return null;

    const client = new OpenAI({ apiKey });

    try {
      const completion = await client.chat.completions.create({
        model: 'gpt-5-nano',
        messages: [
          {
            role: 'system',
            content: `你是一位TOPIK考试辅导老师。请用中文为学生分析这道题目。

请返回JSON格式：
{
  "translation": string (题目的中文翻译),
  "keyPoint": string (这道题考察的知识点),
  "analysis": string (详细解析，为什么正确答案是对的),
  "wrongOptions": { "1": string, "2": string, ... } (分析每个错误选项为什么是错的)
}

注意：所有内容必须用中文回答。`,
          },
          {
            role: 'user',
            content: `Question: ${args.question}\nOptions: ${args.options.join(', ')}\nCorrect: ${args.correctAnswer + 1}`,
          },
        ],
        response_format: { type: 'json_object' },
      });
      const usage = completion.usage;
      await ctx.runMutation(logUsageMutation, {
        userId,
        feature: 'analyze_topik_question',
        model: 'gpt-5-nano',
        promptTokens: usage?.prompt_tokens,
        completionTokens: usage?.completion_tokens,
        totalTokens: usage?.total_tokens,
        costUsd: 0,
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

export const analyzeReadingArticle = action({
  args: {
    title: v.string(),
    summary: v.optional(v.string()),
    bodyText: v.string(),
    language: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await guardAiAction(ctx, 'analyze_reading_article');
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

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return null;
    }
    const client = new OpenAI({ apiKey });

    try {
      const completion = await client.chat.completions.create({
        model: 'gpt-5-nano',
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
        temperature: 0.2,
      });

      const usage = completion.usage;
      await ctx.runMutation(logUsageMutation, {
        userId,
        feature: 'analyze_reading_article',
        model: 'gpt-5-nano',
        promptTokens: usage?.prompt_tokens,
        completionTokens: usage?.completion_tokens,
        totalTokens: usage?.total_tokens,
        costUsd: 0,
      });

      const content = completion.choices[0].message.content;
      if (!content) return null;

      const parsed = JSON.parse(content);
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
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return null;
    }

    const term = args.word.trim();
    if (!term) return null;

    const client = new OpenAI({ apiKey });
    const { label: responseLanguageLabel } = resolveReadingResponseLanguage(args.language);

    try {
      const completion = await client.chat.completions.create({
        model: 'gpt-5-nano',
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
        temperature: 0.2,
      });

      const usage = completion.usage;
      await ctx.runMutation(logUsageMutation, {
        userId,
        feature: 'dictionary_fallback',
        model: 'gpt-5-nano',
        promptTokens: usage?.prompt_tokens,
        completionTokens: usage?.completion_tokens,
        totalTokens: usage?.total_tokens,
        costUsd: 0,
      });

      const content = completion.choices[0].message.content;
      if (!content) return null;

      const parsed = JSON.parse(content) as {
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
    await guardAiAction(ctx, 'translate_reading_paragraphs');

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
      const translations = await translateSegmentTexts(segments, normalizedTargetLang);
      const result: ReadingTranslationResult = {
        translations: limitedParagraphs.map((_, index) => translations[index] || ''),
      };
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
      return null;
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
    const translations = await translateSegmentTexts(segments, normalizedTargetLang);
    return { translations };
  },
});

// Analyze video (transcribe + translate)
export const generateVideoAnalysis = action({
  args: {
    videoUrl: v.string(),
    language: v.optional(v.string()), // Target language for translation (default: Chinese)
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

      // 4. Translate if needed (Default to Chinese if not specified, or checks args)
      const targetLang = args.language || 'Chinese';

      console.log(`[AI] Translating ${baseSegments.length} segments to ${targetLang}...`);

      if (baseSegments.length > 0) {
        const response = await client.chat.completions.create({
          model: 'gpt-5-nano',
          messages: [
            {
              role: 'system',
              content: `Translate the following Korean video transcript segments into ${targetLang}. 
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
        });

        const usage = response.usage;
        await ctx.runMutation(logUsageMutation, {
          userId,
          feature: 'translate_video',
          model: 'gpt-5-nano',
          promptTokens: usage?.prompt_tokens,
          completionTokens: usage?.completion_tokens,
          totalTokens: usage?.total_tokens,
          costUsd: 0,
        });

        const content = response.choices[0].message.content;
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
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return { success: false, error: 'OPENAI_API_KEY not set', quizItems: [] };

    const client = new OpenAI({ apiKey });

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
      const completion = await client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        response_format: { type: 'json_object' as const },
        temperature: 0.7,
      });

      const content = completion.choices[0]?.message?.content;
      if (!content) return { success: false, error: 'Empty response', quizItems: [] };

      const parsed = JSON.parse(content) as Record<string, unknown>;
      let items = parsed.items || parsed.quizItems || parsed.quiz_items || parsed.questions;
      if (!Array.isArray(items)) {
        items = Object.values(parsed).find(v => Array.isArray(v)) || [];
      }

      const valid = (items as Array<{ prompt?: Record<string, string>; answer?: Record<string, string> }>)
        .filter(item =>
          item.prompt && typeof item.prompt === 'object' &&
          item.answer && typeof item.answer === 'object' &&
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
    grammars: v.array(v.object({
      id: v.id('grammar_points'),
      title: v.string(),
      summary: v.string(),
    })),
  },
  handler: async (_ctx, args) => {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return { success: false, error: 'OPENAI_API_KEY not set' };

    const client = new OpenAI({ apiKey });

    const categories = [
      "1: 猜测与推断 (Speculation)",
      "2: 对照与转折 (Contrast)",
      "3: 原因与理由 (Cause & Reason)",
      "4: 目的与意图 (Purpose)",
      "5: 进行与完成 (Aspect)",
      "6: 状态与其持续 (State)",
      "7: 程度与限定 (Degree)",
      "8: 假设与假定 (Hypothesis)",
      "9: 让步与包含 (Concession)",
      "10: 机会与改变 (Opportunity)",
      "11: 传闻与引用 (Indirect Speech)",
      "12: 必然与经历 (Necessity)",
      "13: 罗列与顺序 (Listing)",
      "14: 基准与范围 (Standard)",
      "15: 助词与添意 (Particles)"
    ];

    const prompt = `Classify the following Korean grammar points into one of these 15 categories. Return a JSON object mapping the grammar ID to the category number (1-15).

Categories:
${categories.join('\n')}

Grammar points:
${args.grammars.map(g => `ID: ${g.id} | Title: ${g.title} | Summary: ${g.summary}`).join('\n')}

Return JSON: {"classifications": {"id1": 1, "id2": 5, ...}}`;

    try {
      const completion = await client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' as const },
      });

      const content = completion.choices[0]?.message?.content;
      if (!content) return { success: false, error: 'Empty response' };

      const parsed = JSON.parse(content) as { classifications: Record<string, number> };
      return { success: true, classifications: parsed.classifications };
    } catch (err) {
      return { success: false, error: toErrorMessage(err) };
    }
  },
});


export const translateGrammarSections = action({
  args: {
    enContent: v.string(),
    targetLangs: v.array(v.string())
  },
  handler: async (ctx, args) => {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error('OPENAI_API_KEY is not set');
    const client = new OpenAI({ apiKey });

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

    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You return only raw JSON." },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" }
    });

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
  }
});
