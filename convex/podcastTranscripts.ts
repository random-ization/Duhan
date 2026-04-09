import { internalMutation, internalQuery } from './_generated/server';
import { v } from 'convex/values';

const TranslationLanguage = v.union(
  v.literal('zh'),
  v.literal('en'),
  v.literal('vi'),
  v.literal('mn')
);

const TRANSLATION_LEASE_TTL_MS = 2 * 60 * 1000;

const hasCompleteTranslations = (translations: string[] | undefined, expectedLength: number) => {
  return (
    Array.isArray(translations) &&
    translations.length === expectedLength &&
    translations.every(item => item.trim().length > 0)
  );
};

const withoutLanguageKey = <T extends Record<string, unknown>>(
  source: T | undefined,
  language: 'zh' | 'en' | 'vi' | 'mn'
) => {
  if (!source) return undefined;
  const next = { ...source };
  delete next[language];
  return Object.keys(next).length > 0 ? next : undefined;
};

export const upsert = internalMutation({
  args: {
    episodeId: v.string(),
    segments: v.array(
      v.object({
        start: v.number(),
        end: v.number(),
        text: v.string(),
        translation: v.optional(v.string()),
        words: v.optional(
          v.array(
            v.object({
              word: v.string(),
              start: v.number(),
              end: v.number(),
            })
          )
        ),
      })
    ),
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
      const nextLeases = withoutLanguageKey(existing.translationLeases, args.language);
      await ctx.db.patch(existing._id, {
        translations: {
          ...currentTranslations,
          [args.language]: args.translations,
        },
        translationLeases: nextLeases,
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

export const clearTranslationsForLanguage = internalMutation({
  args: {
    episodeId: v.string(),
    language: TranslationLanguage,
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('podcast_transcripts')
      .withIndex('by_episode', q => q.eq('episodeId', args.episodeId))
      .unique();
    if (!existing) return;

    const currentTranslations =
      typeof existing.translations === 'object' && existing.translations !== null
        ? { ...existing.translations }
        : {};
    delete currentTranslations[args.language];

    const nextTranslations =
      Object.keys(currentTranslations).length > 0 ? currentTranslations : undefined;
    const nextLeases = withoutLanguageKey(existing.translationLeases, args.language);

    await ctx.db.patch(existing._id, {
      translations: nextTranslations,
      translationLeases: nextLeases,
      updatedAt: Date.now(),
    });
  },
});

export const tryStartTranslation = internalMutation({
  args: {
    episodeId: v.string(),
    language: TranslationLanguage,
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('podcast_transcripts')
      .withIndex('by_episode', q => q.eq('episodeId', args.episodeId))
      .unique();
    if (!existing || existing.segments.length === 0) {
      return { started: false, reason: 'missing' as const };
    }

    const translations = existing.translations?.[args.language];
    if (hasCompleteTranslations(translations, existing.segments.length)) {
      return { started: false, reason: 'ready' as const };
    }

    const now = Date.now();
    const activeLeaseUntil = existing.translationLeases?.[args.language] ?? 0;
    if (activeLeaseUntil > now) {
      return { started: false, reason: 'leased' as const };
    }

    await ctx.db.patch(existing._id, {
      translationLeases: {
        ...(existing.translationLeases || {}),
        [args.language]: now + TRANSLATION_LEASE_TTL_MS,
      },
      updatedAt: now,
    });

    return { started: true as const };
  },
});

export const releaseTranslationLease = internalMutation({
  args: {
    episodeId: v.string(),
    language: TranslationLanguage,
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('podcast_transcripts')
      .withIndex('by_episode', q => q.eq('episodeId', args.episodeId))
      .unique();
    if (!existing) return;

    const nextLeases = withoutLanguageKey(existing.translationLeases, args.language);
    await ctx.db.patch(existing._id, {
      translationLeases: nextLeases,
      updatedAt: Date.now(),
    });
  },
});
