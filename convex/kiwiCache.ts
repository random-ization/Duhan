import { internalMutation, internalQuery } from './_generated/server';
import { v } from 'convex/values';

const PersistedSentenceTokenValidator = v.object({
  surface: v.string(),
  lemma: v.optional(v.string()),
  partOfSpeech: v.optional(v.string()),
  start: v.optional(v.number()),
  end: v.optional(v.number()),
  length: v.optional(v.number()),
  wordPosition: v.optional(v.number()),
  sentencePosition: v.optional(v.number()),
});

export const getCachedTokenization = internalQuery({
  args: {
    textHash: v.string(),
    modelVersion: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (args.modelVersion) {
      return ctx.db
        .query('kiwi_tokenize_cache')
        .withIndex('by_text_hash_model', q =>
          q.eq('textHash', args.textHash).eq('modelVersion', args.modelVersion!)
        )
        .first();
    }

    return ctx.db
      .query('kiwi_tokenize_cache')
      .withIndex('by_text_hash', q => q.eq('textHash', args.textHash))
      .order('desc')
      .first();
  },
});

export const upsertTokenizationCache = internalMutation({
  args: {
    textHash: v.string(),
    text: v.string(),
    normalizedText: v.optional(v.string()),
    modelVersion: v.string(),
    tokens: v.array(PersistedSentenceTokenValidator),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const existing = await ctx.db
      .query('kiwi_tokenize_cache')
      .withIndex('by_text_hash_model', q =>
        q.eq('textHash', args.textHash).eq('modelVersion', args.modelVersion)
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        text: args.text,
        normalizedText: args.normalizedText,
        tokenCount: args.tokens.length,
        tokens: args.tokens,
        updatedAt: now,
      });
      return existing._id;
    }

    return ctx.db.insert('kiwi_tokenize_cache', {
      textHash: args.textHash,
      text: args.text,
      normalizedText: args.normalizedText,
      modelVersion: args.modelVersion,
      tokenCount: args.tokens.length,
      tokens: args.tokens,
      createdAt: now,
      updatedAt: now,
    });
  },
});
