import { internalMutation, internalQuery } from './_generated/server';
import { v } from 'convex/values';

const ReadingAnalysisPayloadValidator = v.object({
  summary: v.string(),
  vocabulary: v.array(
    v.object({
      term: v.string(),
      meaning: v.string(),
      level: v.string(),
    })
  ),
  grammar: v.array(
    v.object({
      pattern: v.string(),
      explanation: v.string(),
      example: v.string(),
    })
  ),
});

const ReadingTranslationPayloadValidator = v.object({
  translations: v.array(v.string()),
});

const SentenceTokenValidator = v.object({
  surface: v.string(),
  lemma: v.optional(v.string()),
  partOfSpeech: v.optional(v.string()),
  start: v.optional(v.number()),
  end: v.optional(v.number()),
  length: v.optional(v.number()),
  wordPosition: v.optional(v.number()),
  sentencePosition: v.optional(v.number()),
});

const SentenceVocabularyItemValidator = v.object({
  surface: v.string(),
  lemma: v.optional(v.string()),
  partOfSpeech: v.optional(v.string()),
  meaning: v.optional(v.string()),
  difficultyLevel: v.optional(v.string()),
  difficultyScore: v.optional(v.number()),
});

const SentenceGrammarItemValidator = v.object({
  pattern: v.string(),
  explanation: v.optional(v.string()),
  reason: v.optional(v.string()),
  start: v.optional(v.number()),
  end: v.optional(v.number()),
});

const SentenceExplanationPayloadValidator = v.object({
  sentence: v.string(),
  normalizedText: v.optional(v.string()),
  summary: v.optional(v.string()),
  overallMeaning: v.optional(v.string()),
  naturalTranslation: v.optional(v.string()),
  tokens: v.optional(v.array(SentenceTokenValidator)),
  vocabulary: v.optional(v.array(SentenceVocabularyItemValidator)),
  grammar: v.optional(v.array(SentenceGrammarItemValidator)),
  notes: v.optional(v.array(v.string())),
});

export const getByKey = internalQuery({
  args: {
    key: v.string(),
  },
  handler: async (ctx, args) => {
    return ctx.db
      .query('ai_response_cache')
      .withIndex('by_key', q => q.eq('key', args.key))
      .first();
  },
});

export const upsert = internalMutation({
  args: {
    key: v.string(),
    kind: v.string(),
    language: v.string(),
    contentHash: v.string(),
    payload: v.union(
      ReadingAnalysisPayloadValidator,
      ReadingTranslationPayloadValidator,
      SentenceExplanationPayloadValidator
    ),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const existing = await ctx.db
      .query('ai_response_cache')
      .withIndex('by_key', q => q.eq('key', args.key))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        kind: args.kind,
        language: args.language,
        contentHash: args.contentHash,
        payload: args.payload,
        updatedAt: now,
      });
      return existing._id;
    }

    return ctx.db.insert('ai_response_cache', {
      key: args.key,
      kind: args.kind,
      language: args.language,
      contentHash: args.contentHash,
      payload: args.payload,
      createdAt: now,
      updatedAt: now,
    });
  },
});
