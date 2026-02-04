/* eslint-disable @typescript-eslint/no-explicit-any */
'use node';
import { action } from './_generated/server';
import { v } from 'convex/values';
import { internal } from './_generated/api';
import OpenAI from 'openai';
import { createClient } from '@deepgram/sdk';
import { createPresignedUploadUrl } from './storagePresign';

// Helper: No-op fallback for logging
const logAI = (msg: string) => console.log(`[AI] ${msg}`);

// Minimal error formatter
function toErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

const SUPPORTED_TRANSLATION_LANGS = new Set(['zh', 'en', 'vi', 'mn']);
const TARGET_LANGUAGE_LABELS: Record<string, string> = {
  zh: 'Simplified Chinese',
  en: 'English',
  vi: 'Vietnamese',
  mn: 'Mongolian',
};

function normalizeTargetLanguage(lang?: string): string {
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

  return SUPPORTED_TRANSLATION_LANGS.has(normalized) ? normalized : '';
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

function buildSegmentsFromWords(words: DeepgramWord[]) {
  const segments: Array<{
    start: number;
    end: number;
    text: string;
    translation: string;
    words: { word: string; start: number; end: number }[];
  }> = [];

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

function extractSegmentsFromDeepgramResult(result: any) {
  if (!result?.results?.channels?.[0]?.alternatives?.[0]) {
    throw new Error('Deepgram returned no results');
  }

  const alt = result.results.channels[0].alternatives[0];
  const utterances = (result.results as any).utterances;
  const paragraphs = alt.paragraphs;

  if (Array.isArray(utterances) && utterances.length > 0) {
    const segments = utterances
      .map((u: any) => ({
        start: u.start,
        end: u.end,
        text: typeof u.transcript === 'string' ? u.transcript.trim() : '',
        translation: '',
      }))
      .filter((s: any) => s.text.length > 0);
    return mergeShortSegments(segments);
  }

  if (paragraphs && paragraphs.paragraphs) {
    const allSentences = paragraphs.paragraphs.flatMap((p: any) => p.sentences || []);
    const segments = allSentences
      .map((s: any) => ({
        start: s.start,
        end: s.end,
        text: typeof s.text === 'string' ? s.text.trim() : '',
        translation: '',
      }))
      .filter((s: any) => s.text.length > 0);
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

function mergeShortSegments(segments: any[]) {
  if (!Array.isArray(segments) || segments.length === 0) return [];

  const MIN_CHARS = 24;
  const MIN_DURATION = 2.5;
  const MAX_CHARS = 140;
  const MAX_DURATION = 14;
  const MAX_GAP_SECONDS = 1.5;

  const merged: any[] = [];
  let current: any | null = null;

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

    if (!current) {
      current = {
        ...seg,
        text,
        translation: '',
        words: Array.isArray(seg.words) ? [...seg.words] : seg.words,
      };
      continue;
    }

    const currentEnd = typeof current.end === 'number' ? current.end : null;
    const gap = currentEnd !== null && segStart !== null ? Math.max(0, segStart - currentEnd) : 0;
    if (gap > MAX_GAP_SECONDS) {
      flush();
      current = {
        ...seg,
        text,
        translation: '',
        words: Array.isArray(seg.words) ? [...seg.words] : seg.words,
      };
      continue;
    }

    const separator = current.text.endsWith(' ') ? '' : ' ';
    current.text = `${current.text}${separator}${text}`.replace(/\s+/g, ' ').trim();
    if (segEnd !== null) {
      current.end = segEnd;
    }
    if (Array.isArray(seg.words)) {
      current.words = Array.isArray(current.words)
        ? [...current.words, ...seg.words]
        : [...seg.words];
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
  baseSegments: any[],
  translations: string[],
  fallbackToSegmentTranslation: boolean
) {
  return baseSegments.map((seg, index) => ({
    ...seg,
    translation:
      translations[index] ||
      (fallbackToSegmentTranslation && typeof seg.translation === 'string' ? seg.translation : ''),
  }));
}

async function translateSegmentTexts(baseSegments: any[], normalizedTargetLang: string) {
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
    const chunks: { index: number; segments: any[] }[] = [];

    for (let i = 0; i < baseSegments.length; i += BATCH_SIZE) {
      chunks.push({ index: i, segments: baseSegments.slice(i, i + BATCH_SIZE) });
    }

    const targetLanguageLabel =
      TARGET_LANGUAGE_LABELS[normalizedTargetLang] || normalizedTargetLang;

    console.log(
      `[AI] Translating ${baseSegments.length} segments to ${targetLanguageLabel} in ${chunks.length} batches (Parallel)...`
    );

    const processBatch = async (chunk: { index: number; segments: any[] }) => {
      try {
        const completion = await client.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: `Translate each Korean segment into ${targetLanguageLabel}. Return strictly matching JSON array of strings: {"translations": ["...", ...]}. Keep meaning faithful.`,
            },
            {
              role: 'user',
              content: JSON.stringify({
                segments: chunk.segments.map(s => s.text),
              }),
            },
          ],
          response_format: { type: 'json_object' },
          temperature: 0.2,
        });

        const content = completion.choices[0].message.content;
        if (!content) {
          return { index: chunk.index, translations: new Array(chunk.segments.length).fill('') };
        }

        const parsed = JSON.parse(content) as { translations?: string[] };
        const trans = Array.isArray(parsed.translations) ? parsed.translations : [];

        while (trans.length < chunk.segments.length) trans.push('');
        return { index: chunk.index, translations: trans };
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

async function cacheTranscriptToSpaces(episodeId: string, segments: any[]) {
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

async function upsertTranscript(ctx: any, episodeId: string, segments: any[]) {
  await ctx.runMutation(internal.podcastTranscripts.upsert, {
    episodeId,
    segments,
  });
}

// Helper: Delete transcript (action since "use node" requires actions only)
export const deleteTranscript = action({
  args: { episodeId: v.string() },
  handler: async (ctx, args) => {
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
    console.log('[AI] Starting Deepgram Transcript Generation...');

    // 1. Deepgram Transcription (Transcribe URL directly)
    const deepgramKey = process.env.DEEPGRAM_API_KEY;
    if (!deepgramKey) {
      return { success: false, error: 'DEEPGRAM_API_KEY not set' };
    }

    let baseSegments: any[] = [];
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
        language: normalizedTargetLang as 'zh' | 'en' | 'vi' | 'mn',
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
    payload: v.any(),
  },
  handler: async (ctx, args) => {
    try {
      const baseSegments = extractSegmentsFromDeepgramResult(args.payload);
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
  handler: async (ctx, args): Promise<{ segments: any[] | null }> => {
    const record = (await ctx.runQuery(internal.podcastTranscripts.getRecordByEpisode, {
      episodeId: args.episodeId,
    })) as { segments?: any[]; translations?: Record<string, string[]> } | null;

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
        language: normalizedTargetLang as 'zh' | 'en' | 'vi' | 'mn',
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
        model: 'gpt-4o-mini',
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
        feature: 'analyze_text',
        model: 'gpt-4o-mini',
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
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.warn('OPENAI_API_KEY not set');
      return null;
    }

    const client = new OpenAI({ apiKey });

    try {
      const completion = await client.chat.completions.create({
        model: 'gpt-4o-mini',
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
        feature: 'analyze_sentence',
        model: 'gpt-4o-mini',
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
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return null;

    const client = new OpenAI({ apiKey });

    try {
      const completion = await client.chat.completions.create({
        model: 'gpt-4o-mini',
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
        feature: 'analyze_topik_question',
        model: 'gpt-4o-mini',
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
// Analyze video (transcribe + translate)
export const generateVideoAnalysis = action({
  args: {
    videoUrl: v.string(),
    language: v.optional(v.string()), // Target language for translation (default: Chinese)
  },
  handler: async (ctx, args) => {
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
          model: 'gpt-4o-mini',
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
          feature: 'translate_video',
          model: 'gpt-4o-mini',
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

const logUsageMutation = internal.aiUsageLogs.logUsage;
