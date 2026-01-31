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
      let ext = 'mp3';
      if (contentType.includes('wav')) {
        ext = 'wav';
      } else if (contentType.includes('mp4') || contentType.includes('m4a')) {
        ext = 'm4a';
      }

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
        .map(s => {
          const start = typeof s.start === 'number' ? s.start : 0;
          const end = typeof s.end === 'number' ? s.end : 0;
          const text = typeof s.text === 'string' ? s.text.trim() : '';
          return {
            start,
            end,
            text,
            translation: '',
          };
        })
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
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return { success: false, error: 'OPENAI_API_KEY not set' };
    }

    try {
      // 1. Fetch file
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
      // For videos, we usually want Chinese translation for this app context
      const targetLang = args.language || 'Chinese';

      console.log(`[AI] Translating ${baseSegments.length} segments to ${targetLang}...`);

      if (baseSegments.length > 0) {
        // Limit batch size for translation to avoid context limits
        // Simple approach: Translate all in one go if small, or just first chunk
        // For robustness, let's translate the whole thing using GPT-4o-mini which has large context

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
