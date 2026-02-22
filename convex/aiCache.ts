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
    payload: v.union(ReadingAnalysisPayloadValidator, ReadingTranslationPayloadValidator),
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
