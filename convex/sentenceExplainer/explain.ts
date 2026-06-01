'use node';

import { action } from '../_generated/server';
import type { ActionCtx } from '../_generated/server';
import { ConvexError, v } from 'convex/values';
import { getAuthUserId } from '@convex-dev/auth/server';
import type { Id } from '../_generated/dataModel';
import { makeFunctionReference } from 'convex/server';
import type { FunctionReference } from 'convex/server';
import { createHash } from 'node:crypto';
import OpenAI from 'openai';
import {
  isModelAccessError,
  resolveChatProviderConfigs,
  type ChatProviderConfig,
} from '../aiProviders';
import {
  isRetryableHttpStatus,
  parseJsonObjectFromModelContent,
  retryAsync,
} from '../aiReliability';
import { buildAffixCandidateSet, scoreGrammarMatch } from '../grammarMapping';
import {
  SENTENCE_EXPLAINER_SOURCE,
  SENTENCE_EXPLANATION_VERSION,
  dedupeByKey,
  getSentenceLanguageLabels,
  normalizeSentenceLanguage,
  normalizeSentenceText,
  pruneExplanationPayload,
  resolveLocalizedMeaning,
  type SentenceExplanationPayload,
  type SentenceGrammarItem,
  type SentenceToken,
  type SentenceVocabularyItem,
  type SupportedSentenceLanguage,
} from './shared';

type WordLookupResult = {
  word: string;
  meaning: string;
  meaningEn?: string;
  meaningVi?: string;
  meaningMn?: string;
  partOfSpeech: string;
  pronunciation?: string;
  hanja?: string;
  audioUrl?: string;
  difficultyLevel?: string;
  difficultyScore?: number;
};

type GrammarLookupResult = {
  id: string;
  title: string;
  titleEn?: string;
  titleZh?: string;
  titleVi?: string;
  titleMn?: string;
  summary: string;
  summaryEn?: string;
  summaryVi?: string;
  summaryMn?: string;
  type: string;
  level: string;
  searchPatterns: string[];
};

type KiwiTokenizedResult = {
  text: string;
  normalizedText: string;
  textHash: string;
  modelVersion: string;
  tokens: SentenceToken[];
  cacheHit: boolean;
};

const getAiCacheByKeyQuery = makeFunctionReference<
  'query',
  { key: string },
  { payload?: SentenceExplanationPayload } | null
>('aiCache:getByKey') as unknown as FunctionReference<
  'query',
  'internal',
  { key: string },
  { payload?: SentenceExplanationPayload } | null
>;

const upsertAiCacheMutation = makeFunctionReference<
  'mutation',
  {
    key: string;
    kind: string;
    language: string;
    contentHash: string;
    payload: SentenceExplanationPayload;
  },
  string
>('aiCache:upsert') as unknown as FunctionReference<
  'mutation',
  'internal',
  {
    key: string;
    kind: string;
    language: string;
    contentHash: string;
    payload: SentenceExplanationPayload;
  },
  string
>;

const logUsageMutation = makeFunctionReference<
  'mutation',
  {
    userId?: Id<'users'>;
    feature: string;
    model: string;
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
    costUsd?: number;
    status?: 'success' | 'error';
    provider?: string;
    errorCode?: string;
    errorMessage?: string;
    retries?: number;
    durationMs?: number;
    httpStatus?: number;
  },
  { success: boolean }
>('aiUsageLogs:logUsage') as unknown as FunctionReference<
  'mutation',
  'internal',
  {
    userId?: Id<'users'>;
    feature: string;
    model: string;
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
    costUsd?: number;
    status?: 'success' | 'error';
    provider?: string;
    errorCode?: string;
    errorMessage?: string;
    retries?: number;
    durationMs?: number;
    httpStatus?: number;
  },
  { success: boolean }
>;

const logFailureMutation = makeFunctionReference<
  'mutation',
  {
    userId?: Id<'users'>;
    feature: string;
    model: string;
    provider?: string;
    errorCode?: string;
    errorMessage: string;
    retries?: number;
    durationMs?: number;
    httpStatus?: number;
  },
  { success: boolean }
>('aiUsageLogs:logFailure') as unknown as FunctionReference<
  'mutation',
  'internal',
  {
    userId?: Id<'users'>;
    feature: string;
    model: string;
    provider?: string;
    errorCode?: string;
    errorMessage: string;
    retries?: number;
    durationMs?: number;
    httpStatus?: number;
  },
  { success: boolean }
>;

const getWordByLemmaQuery = makeFunctionReference<
  'query',
  { lemma: string },
  WordLookupResult | null
>('dictionaryQueries:getWordByLemmaQuery') as unknown as FunctionReference<
  'query',
  'internal',
  { lemma: string },
  WordLookupResult | null
>;

const getGrammarPointsForMatchingQuery = makeFunctionReference<
  'query',
  Record<string, never>,
  GrammarLookupResult[]
>('dictionaryQueries:getGrammarPointsForMatchingQuery') as unknown as FunctionReference<
  'query',
  'internal',
  Record<string, never>,
  GrammarLookupResult[]
>;

const tokenizePersistedAction = makeFunctionReference<
  'action',
  { text: string },
  KiwiTokenizedResult
>('kiwi:tokenizePersisted') as unknown as FunctionReference<
  'action',
  'internal',
  { text: string },
  KiwiTokenizedResult
>;

const upsertExplanationRecordMutation = makeFunctionReference<
  'mutation',
  {
    sentenceId?: Id<'content_sentences'>;
    userId?: Id<'users'>;
    textHash: string;
    sentence: string;
    targetLanguage: string;
    explanationVersion?: string;
    provider?: string;
    model?: string;
    cacheKey?: string;
    payload: SentenceExplanationPayload;
    confidence?: number;
    promptVersion?: string;
  },
  Id<'sentence_explanations'>
>('sentenceExplainer/save:upsertExplanationRecord') as unknown as FunctionReference<
  'mutation',
  'internal',
  {
    sentenceId?: Id<'content_sentences'>;
    userId?: Id<'users'>;
    textHash: string;
    sentence: string;
    targetLanguage: string;
    explanationVersion?: string;
    provider?: string;
    model?: string;
    cacheKey?: string;
    payload: SentenceExplanationPayload;
    confidence?: number;
    promptVersion?: string;
  },
  Id<'sentence_explanations'>
>;

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

function resolveHttpStatus(error: unknown): number | undefined {
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
  const status = resolveHttpStatus(error);
  if (status) return `HTTP_${status}`;
  const message = toErrorMessage(error).toLowerCase();
  if (message.includes('timeout')) return 'TIMEOUT';
  if (message.includes('rate limit')) return 'RATE_LIMIT';
  if (message.includes('unauthorized')) return 'UNAUTHORIZED';
  return 'UNKNOWN';
}

function hashText(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function buildCacheKeys(targetLanguage: SupportedSentenceLanguage, normalizedText: string) {
  const contentHash = hashText(
    `${SENTENCE_EXPLANATION_VERSION}|${targetLanguage}|${normalizedText}`
  );
  return {
    contentHash,
    cacheKey: hashText(`sentence_explanation|${contentHash}`),
  };
}

function createChatClient(provider: ChatProviderConfig) {
  return new OpenAI({
    apiKey: provider.apiKey,
    ...(provider.baseURL ? { baseURL: provider.baseURL } : {}),
    timeout: 25000,
  });
}

async function runChatCompletionWithFallback(
  request: (args: {
    client: OpenAI;
    provider: ChatProviderConfig;
  }) => Promise<OpenAI.Chat.Completions.ChatCompletion>
) {
  const providers = resolveChatProviderConfigs(process.env);
  if (providers.length === 0) {
    throw new ConvexError('AI_PROVIDER_NOT_CONFIGURED');
  }

  let lastError: unknown;
  for (const provider of providers) {
    try {
      const client = createChatClient(provider);
      const completion = await request({ client, provider });
      return { completion, provider };
    } catch (error) {
      lastError = error;
      if (isModelAccessError(error)) continue;
      const status = resolveHttpStatus(error);
      if (
        status &&
        !isRetryableHttpStatus(status) &&
        provider === providers[providers.length - 1]
      ) {
        throw error;
      }
    }
  }

  throw lastError ?? new Error('All AI providers failed');
}

function isLexicalToken(tag?: string) {
  if (!tag) return true;
  return /^(NN|VV|VA|XR|MAG|MAJ|MM|IC|NP|NR|SL|SH)/.test(tag);
}

function localizeGrammarTitle(grammar: GrammarLookupResult, language: SupportedSentenceLanguage) {
  const candidates =
    language === 'en'
      ? [grammar.titleEn, grammar.title, grammar.titleVi, grammar.titleMn]
      : language === 'vi'
        ? [grammar.titleVi, grammar.titleEn, grammar.title, grammar.titleMn]
        : language === 'mn'
          ? [grammar.titleMn, grammar.titleEn, grammar.title, grammar.titleVi]
          : [grammar.titleZh, grammar.title, grammar.titleEn, grammar.titleVi, grammar.titleMn];
  return (
    candidates.find(value => typeof value === 'string' && value.trim().length > 0) || grammar.title
  );
}

function localizeGrammarSummary(grammar: GrammarLookupResult, language: SupportedSentenceLanguage) {
  const candidates =
    language === 'en'
      ? [grammar.summaryEn, grammar.summary, grammar.summaryVi, grammar.summaryMn]
      : language === 'vi'
        ? [grammar.summaryVi, grammar.summaryEn, grammar.summary, grammar.summaryMn]
        : language === 'mn'
          ? [grammar.summaryMn, grammar.summaryEn, grammar.summary, grammar.summaryVi]
          : [grammar.summary, grammar.summaryEn, grammar.summaryVi, grammar.summaryMn];
  return (
    candidates.find(value => typeof value === 'string' && value.trim().length > 0) ||
    grammar.summary
  );
}

async function resolveVocabularySeeds(
  ctx: ActionCtx,
  tokens: SentenceToken[],
  language: SupportedSentenceLanguage
): Promise<SentenceVocabularyItem[]> {
  const lexicalTokens = dedupeByKey(
    tokens.filter(token => isLexicalToken(token.partOfSpeech)).slice(0, 16),
    token => token.lemma?.trim() || token.surface.trim()
  );

  const resolved = await Promise.all(
    lexicalTokens.map(async (token): Promise<SentenceVocabularyItem | null> => {
      const lookupKey = token.lemma?.trim() || token.surface.trim();
      if (!lookupKey) return null;
      const word = await ctx.runQuery(getWordByLemmaQuery, { lemma: lookupKey });
      if (!word) {
        return {
          surface: token.surface,
          lemma: token.lemma,
          partOfSpeech: token.partOfSpeech,
        };
      }
      return {
        surface: token.surface,
        lemma: token.lemma || word.word,
        partOfSpeech: token.partOfSpeech || word.partOfSpeech,
        meaning: resolveLocalizedMeaning(word, language),
        difficultyLevel: word.difficultyLevel,
        difficultyScore: word.difficultyScore,
      } satisfies SentenceVocabularyItem;
    })
  );

  return resolved.filter((item): item is SentenceVocabularyItem => item !== null).slice(0, 10);
}

async function resolveGrammarSeeds(
  ctx: ActionCtx,
  tokens: SentenceToken[],
  language: SupportedSentenceLanguage
): Promise<SentenceGrammarItem[]> {
  const affixForms = tokens
    .filter(token => token.partOfSpeech?.startsWith('E') || token.partOfSpeech?.startsWith('J'))
    .map(token => token.surface);
  if (affixForms.length === 0) return [];

  const affixCandidates = buildAffixCandidateSet(affixForms);
  const grammarPoints = await ctx.runQuery(getGrammarPointsForMatchingQuery, {});
  return grammarPoints
    .map((grammar: GrammarLookupResult) => ({
      grammar,
      score: scoreGrammarMatch(grammar.searchPatterns, affixCandidates),
    }))
    .filter((item: { grammar: GrammarLookupResult; score: number }) => item.score > 0)
    .sort((left, right) => right.score - left.score)
    .slice(0, 5)
    .map(
      (item): SentenceGrammarItem => ({
        pattern: localizeGrammarTitle(item.grammar, language),
        explanation: localizeGrammarSummary(item.grammar, language),
        reason: item.grammar.level,
      })
    );
}

function mergeVocabulary(
  aiVocabulary: SentenceVocabularyItem[],
  seedVocabulary: SentenceVocabularyItem[]
): SentenceVocabularyItem[] {
  const seedByKey = new Map(
    seedVocabulary.map(item => [item.lemma?.trim() || item.surface.trim(), item] as const)
  );
  const merged = aiVocabulary.map(item => {
    const key = item.lemma?.trim() || item.surface.trim();
    const seed = seedByKey.get(key);
    return {
      surface: item.surface || seed?.surface || key,
      lemma: item.lemma || seed?.lemma,
      partOfSpeech: item.partOfSpeech || seed?.partOfSpeech,
      meaning: item.meaning || seed?.meaning,
      difficultyLevel: item.difficultyLevel || seed?.difficultyLevel,
      difficultyScore: item.difficultyScore ?? seed?.difficultyScore,
    };
  });
  return dedupeByKey(
    [...merged, ...seedVocabulary],
    item => item.lemma?.trim() || item.surface.trim()
  ).slice(0, 10);
}

function mergeGrammar(aiGrammar: SentenceGrammarItem[], seedGrammar: SentenceGrammarItem[]) {
  const merged = aiGrammar.map(item => {
    const seed = seedGrammar.find(candidate => candidate.pattern === item.pattern);
    return {
      pattern: item.pattern,
      explanation: item.explanation || seed?.explanation,
      reason: item.reason || seed?.reason,
      start: item.start,
      end: item.end,
    };
  });
  return dedupeByKey([...merged, ...seedGrammar], item => item.pattern).slice(0, 8);
}

function parseExplanationPayload(
  parsed: unknown,
  fallback: {
    sentence: string;
    normalizedText: string;
    tokens: SentenceToken[];
    vocabulary: SentenceVocabularyItem[];
    grammar: SentenceGrammarItem[];
  }
) {
  const candidate = (parsed || {}) as {
    summary?: unknown;
    overallMeaning?: unknown;
    naturalTranslation?: unknown;
    notes?: unknown;
    vocabulary?: unknown;
    grammar?: unknown;
  };

  const aiVocabulary = Array.isArray(candidate.vocabulary)
    ? candidate.vocabulary
        .map((item): SentenceVocabularyItem | null => {
          if (!item || typeof item !== 'object') return null;
          const row = item as Record<string, unknown>;
          return {
            surface: typeof row.surface === 'string' ? row.surface.trim() : '',
            lemma: typeof row.lemma === 'string' ? row.lemma.trim() : undefined,
            partOfSpeech:
              typeof row.partOfSpeech === 'string' ? row.partOfSpeech.trim() : undefined,
            meaning: typeof row.meaning === 'string' ? row.meaning.trim() : undefined,
            difficultyLevel:
              typeof row.difficultyLevel === 'string' ? row.difficultyLevel.trim() : undefined,
            difficultyScore:
              typeof row.difficultyScore === 'number' ? row.difficultyScore : undefined,
          } satisfies SentenceVocabularyItem;
        })
        .filter((item): item is SentenceVocabularyItem => Boolean(item?.surface))
    : [];

  const aiGrammar = Array.isArray(candidate.grammar)
    ? candidate.grammar
        .map((item): SentenceGrammarItem | null => {
          if (!item || typeof item !== 'object') return null;
          const row = item as Record<string, unknown>;
          return {
            pattern: typeof row.pattern === 'string' ? row.pattern.trim() : '',
            explanation: typeof row.explanation === 'string' ? row.explanation.trim() : undefined,
            reason: typeof row.reason === 'string' ? row.reason.trim() : undefined,
            start: typeof row.start === 'number' ? row.start : undefined,
            end: typeof row.end === 'number' ? row.end : undefined,
          } satisfies SentenceGrammarItem;
        })
        .filter((item): item is SentenceGrammarItem => Boolean(item?.pattern))
    : [];

  const payload: SentenceExplanationPayload = {
    sentence: fallback.sentence,
    normalizedText: fallback.normalizedText,
    summary: typeof candidate.summary === 'string' ? candidate.summary.trim() : undefined,
    overallMeaning:
      typeof candidate.overallMeaning === 'string' ? candidate.overallMeaning.trim() : undefined,
    naturalTranslation:
      typeof candidate.naturalTranslation === 'string'
        ? candidate.naturalTranslation.trim()
        : undefined,
    notes: Array.isArray(candidate.notes)
      ? candidate.notes.map(item => (typeof item === 'string' ? item.trim() : '')).filter(Boolean)
      : [],
    tokens: fallback.tokens,
    vocabulary: mergeVocabulary(aiVocabulary, fallback.vocabulary),
    grammar: mergeGrammar(aiGrammar, fallback.grammar),
  };

  return pruneExplanationPayload(payload);
}

export const explainSentence = action({
  args: {
    sentence: v.string(),
    sentenceId: v.optional(v.id('content_sentences')),
    targetLanguage: v.optional(v.string()),
    source: v.optional(v.string()),
    sourceRefId: v.optional(v.string()),
    forceRefresh: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = (await getAuthUserId(ctx)) as Id<'users'> | null;
    if (!userId) {
      throw new ConvexError('UNAUTHORIZED');
    }

    const sentence = normalizeSentenceText(args.sentence);
    if (!sentence) {
      throw new ConvexError('EMPTY_SENTENCE');
    }

    const startedAt = Date.now();
    const targetLanguage = normalizeSentenceLanguage(args.targetLanguage);
    const { cacheKey, contentHash } = buildCacheKeys(targetLanguage, sentence);
    const cached = !args.forceRefresh
      ? await ctx.runQuery(getAiCacheByKeyQuery, { key: cacheKey })
      : null;
    const cachedPayload = cached?.payload ? pruneExplanationPayload(cached.payload) : null;
    if (cachedPayload?.sentence) {
      const explanationId = await ctx.runMutation(upsertExplanationRecordMutation, {
        sentenceId: args.sentenceId,
        userId,
        textHash: hashText(sentence),
        sentence,
        targetLanguage,
        explanationVersion: SENTENCE_EXPLANATION_VERSION,
        provider: 'cache',
        model: 'cache',
        cacheKey,
        payload: cachedPayload,
      });
      return {
        success: true,
        source: args.source?.trim() || SENTENCE_EXPLAINER_SOURCE,
        sourceRefId: args.sourceRefId?.trim() || String(explanationId),
        explanationId,
        cacheHit: true,
        data: cachedPayload,
      };
    }

    try {
      const tokenized = await ctx.runAction(tokenizePersistedAction, { text: sentence });
      const tokens = tokenized.tokens || [];
      const vocabularySeeds = await resolveVocabularySeeds(ctx as never, tokens, targetLanguage);
      const grammarSeeds = await resolveGrammarSeeds(ctx as never, tokens, targetLanguage);
      const languageLabels = getSentenceLanguageLabels(targetLanguage);

      const { completion, provider } = await runChatCompletionWithFallback(({ client, provider }) =>
        retryAsync(
          () =>
            client.chat.completions.create({
              model: provider.model,
              messages: [
                {
                  role: 'system',
                  content: `You are a Korean sentence explainer for language learners.
Return strict JSON only.
All explanatory text must be in ${languageLabels.native} (${languageLabels.english}).
Use the provided tokenization and candidate hints to explain the sentence accurately.
Output format:
{
  "summary": "1 short sentence",
  "overallMeaning": "overall meaning in output language",
  "naturalTranslation": "natural translation in output language",
  "notes": ["practical learner note"],
  "vocabulary": [
    {
      "surface": "한국어 토큰",
      "lemma": "base form if useful",
      "partOfSpeech": "POS",
      "meaning": "meaning in output language",
      "difficultyLevel": "optional level label"
    }
  ],
  "grammar": [
    {
      "pattern": "grammar pattern or expression",
      "explanation": "why it matters in this sentence",
      "reason": "short reason"
    }
  ]
}
Rules:
- Keep vocabulary to 4-8 learning-relevant items.
- Prefer real expressions appearing in the sentence.
- Keep grammar to 2-5 items.
- Do not repeat the entire sentence in summary.
- Never output markdown.`,
                },
                {
                  role: 'user',
                  content: JSON.stringify({
                    sentence,
                    tokenization: tokens,
                    candidateVocabulary: vocabularySeeds,
                    candidateGrammar: grammarSeeds,
                  }),
                },
              ],
              response_format: { type: 'json_object' },
            }),
          {
            retries: 2,
            label: `sentence_explanation_${provider.provider}`,
          }
        )
      );

      const usage = completion.usage;
      const parsed = parseJsonObjectFromModelContent(completion.choices[0]?.message?.content || '');
      const payload = parseExplanationPayload(parsed, {
        sentence,
        normalizedText: tokenized.normalizedText,
        tokens,
        vocabulary: vocabularySeeds,
        grammar: grammarSeeds,
      });

      await ctx.runMutation(upsertAiCacheMutation, {
        key: cacheKey,
        kind: 'sentence_explanation',
        language: targetLanguage,
        contentHash,
        payload,
      });

      const explanationId = await ctx.runMutation(upsertExplanationRecordMutation, {
        sentenceId: args.sentenceId,
        userId,
        textHash: tokenized.textHash,
        sentence,
        targetLanguage,
        explanationVersion: SENTENCE_EXPLANATION_VERSION,
        provider: provider.provider,
        model: provider.model,
        cacheKey,
        payload,
        promptVersion: SENTENCE_EXPLANATION_VERSION,
      });

      await ctx.runMutation(logUsageMutation, {
        userId,
        feature: 'sentence_explanation',
        model: provider.model,
        provider: provider.provider,
        status: 'success',
        promptTokens: usage?.prompt_tokens,
        completionTokens: usage?.completion_tokens,
        totalTokens: usage?.total_tokens,
        costUsd: 0,
        durationMs: Date.now() - startedAt,
      });

      return {
        success: true,
        source: args.source?.trim() || SENTENCE_EXPLAINER_SOURCE,
        sourceRefId: args.sourceRefId?.trim() || String(explanationId),
        explanationId,
        cacheHit: false,
        data: payload,
      };
    } catch (error) {
      await ctx.runMutation(logFailureMutation, {
        userId,
        feature: 'sentence_explanation',
        model: 'unknown',
        provider: 'unknown',
        errorCode: resolveErrorCode(error),
        errorMessage: toErrorMessage(error),
        durationMs: Date.now() - startedAt,
        httpStatus: resolveHttpStatus(error),
      });
      return {
        success: false,
        error: toErrorMessage(error),
      };
    }
  },
});
