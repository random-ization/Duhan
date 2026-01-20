'use node';
import { action } from './_generated/server';
import { v } from 'convex/values';
import { makeFunctionReference } from 'convex/server';
import OpenAI from 'openai';
import { toErrorMessage } from './errors';

type LogUsageArgs = {
  feature: string;
  model: string;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  costUsd?: number;
};

type WhisperSegment = {
  start?: number;
  end?: number;
  text?: string;
};

const logUsageMutation = makeFunctionReference<'mutation', LogUsageArgs, { success: boolean }>(
  'aiUsageLogs:logUsage'
);

// Helper: Delete transcript (action since "use node" requires actions only)
export const deleteTranscript = action({
  args: { episodeId: v.string() },
  handler: async (_ctx, _args) => {
    // Currently a no-op as transcripts are cached on frontend/S3
    // If stored in DB, would need to call an internal mutation
    return { success: true };
  },
});

// Helper: Generate Transcript Stub
export const generateTranscript = action({
  args: {
    audioUrl: v.string(),
    episodeId: v.string(),
    language: v.optional(v.string()),
  },
  handler: async (_ctx, args) => {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return { success: false, error: 'OPENAI_API_KEY not set' };
    }

    try {
      const audioRes = await fetch(args.audioUrl);
      if (!audioRes.ok) {
        return { success: false, error: `Failed to fetch audio (${audioRes.status})` };
      }

      const contentType = audioRes.headers.get('content-type') || 'audio/mpeg';
      const ext = contentType.includes('wav')
        ? 'wav'
        : contentType.includes('mp4') || contentType.includes('m4a')
          ? 'm4a'
          : 'mp3';

      const buffer = await audioRes.arrayBuffer();
      const file = new File([buffer], `episode_${args.episodeId}.${ext}`, { type: contentType });

      const client = new OpenAI({ apiKey });
      const transcription = await client.audio.transcriptions.create({
        file,
        model: 'whisper-1',
        response_format: 'verbose_json',
        timestamp_granularities: ['segment'],
      });
      await _ctx.runMutation(logUsageMutation, {
        feature: 'transcribe',
        model: 'whisper-1',
      });

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

      const targetLang = (args.language || '').trim().toLowerCase();
      const shouldTranslate =
        baseSegments.length > 0 &&
        targetLang.length > 0 &&
        targetLang !== 'ko' &&
        targetLang !== 'kr' &&
        targetLang !== 'korean' &&
        baseSegments.length <= 80 &&
        baseSegments.reduce((sum, s) => sum + s.text.length, 0) <= 8000;

      if (!shouldTranslate) {
        return { success: true, data: { segments: baseSegments } };
      }

      const completion = await client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content:
              'Translate each Korean segment into the target language. Return JSON: {"translations": [string, ...]} aligned by index. Keep meaning faithful and natural.',
          },
          {
            role: 'user',
            content: JSON.stringify({
              targetLanguage: targetLang,
              segments: baseSegments.map(s => s.text),
            }),
          },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.2,
      });
      const usage = completion.usage;
      await _ctx.runMutation(logUsageMutation, {
        feature: 'translate_segments',
        model: 'gpt-4o-mini',
        promptTokens: usage?.prompt_tokens,
        completionTokens: usage?.completion_tokens,
        totalTokens: usage?.total_tokens,
        costUsd: 0,
      });

      const content = completion.choices[0].message.content;
      if (!content) {
        return { success: true, data: { segments: baseSegments } };
      }

      const parsed = JSON.parse(content) as { translations?: unknown };
      const translations = Array.isArray(parsed.translations) ? parsed.translations : [];

      const merged = baseSegments.map((seg, i) => ({
        ...seg,
        translation: typeof translations[i] === 'string' ? translations[i] : '',
      }));

      return { success: true, data: { segments: merged } };
    } catch (error) {
      return { success: false, error: toErrorMessage(error) };
    }
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
            content: `You are a Korean language teacher. Analyze the given sentence for a language learner.

Return a JSON object with:
{
  "vocabulary": [{ "word": string, "root": string, "meaning": string, "type": string }],
  "grammar": [{ "structure": string, "explanation": string }],
  "nuance": string (cultural or contextual notes)
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
