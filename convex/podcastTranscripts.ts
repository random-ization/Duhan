import { internalMutation, internalQuery } from './_generated/server';
import { v } from 'convex/values';

const TranslationLanguage = v.union(
  v.literal('zh'),
  v.literal('en'),
  v.literal('vi'),
  v.literal('mn')
);

export const upsert = internalMutation({
  args: {
    episodeId: v.string(),
    segments: v.any(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('podcast_transcripts')
      .withIndex('by_episode', q => q.eq('episodeId', args.episodeId))
      .unique();
    const now = Date.now();
    if (existing) {
      await ctx.db.patch(existing._id, { segments: args.segments, updatedAt: now });
    } else {
      await ctx.db.insert('podcast_transcripts', {
        episodeId: args.episodeId,
        segments: args.segments,
        createdAt: now,
        updatedAt: now,
      });
    }
  },
});

export const getByEpisode = internalQuery({
  args: { episodeId: v.string() },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('podcast_transcripts')
      .withIndex('by_episode', q => q.eq('episodeId', args.episodeId))
      .unique();
    return existing?.segments ?? null;
  },
});

export const getRecordByEpisode = internalQuery({
  args: { episodeId: v.string() },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('podcast_transcripts')
      .withIndex('by_episode', q => q.eq('episodeId', args.episodeId))
      .unique();
    return existing ?? null;
  },
});

export const setTranslations = internalMutation({
  args: {
    episodeId: v.string(),
    language: TranslationLanguage,
    translations: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('podcast_transcripts')
      .withIndex('by_episode', q => q.eq('episodeId', args.episodeId))
      .unique();
    const now = Date.now();
    if (existing) {
      const currentTranslations =
        typeof existing.translations === 'object' && existing.translations !== null
          ? existing.translations
          : {};
      await ctx.db.patch(existing._id, {
        translations: {
          ...currentTranslations,
          [args.language]: args.translations,
        },
        updatedAt: now,
      });
      return;
    }

    await ctx.db.insert('podcast_transcripts', {
      episodeId: args.episodeId,
      segments: [],
      translations: {
        [args.language]: args.translations,
      },
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const deleteByEpisode = internalMutation({
  args: { episodeId: v.string() },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('podcast_transcripts')
      .withIndex('by_episode', q => q.eq('episodeId', args.episodeId))
      .unique();
    if (existing) {
      await ctx.db.delete(existing._id);
    }
  },
});
