import { internalQuery } from './_generated/server';
import { v } from 'convex/values';

export const getVocabBookForUser = internalQuery({
  args: {
    userId: v.id('users'),
    search: v.optional(v.string()),
    includeMastered: v.optional(v.boolean()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const progressItems = await ctx.db
      .query('user_vocab_progress')
      .withIndex('by_user', q => q.eq('userId', args.userId))
      .collect();

    const filteredProgress = args.includeMastered
      ? progressItems
      : progressItems.filter(p => p.status !== 'MASTERED');

    const wordIds = [...new Set(filteredProgress.map(p => p.wordId))];
    const wordsArray = await Promise.all(wordIds.map(id => ctx.db.get(id)));
    const wordsMap = new Map(wordsArray.filter(Boolean).map(w => [w!._id.toString(), w!]));

    const latestAppearances = await Promise.all(
      wordIds.map(async wordId => {
        const app = await ctx.db
          .query('vocabulary_appearances')
          .withIndex('by_word_createdAt', q => q.eq('wordId', wordId))
          .order('desc')
          .first();
        return [wordId.toString(), app] as const;
      })
    );
    const appearanceMap = new Map(latestAppearances);

    const searchQuery = args.search?.trim().toLowerCase();
    const items = filteredProgress
      .map(progress => {
        const word = wordsMap.get(progress.wordId.toString());
        if (!word) return null;

        const app = appearanceMap.get(progress.wordId.toString());

        const meaning = app?.meaning || word.meaning;
        const meaningEn = app?.meaningEn || word.meaningEn;
        const meaningVi = app?.meaningVi || word.meaningVi;
        const meaningMn = app?.meaningMn || word.meaningMn;

        const item = {
          id: word._id.toString(),
          word: word.word,
          meaning,
          meaningEn,
          meaningVi,
          meaningMn,
          progress: {
            status: progress.status ?? 'LEARNING',
            state: progress.state,
          },
        };

        if (searchQuery) {
          const w = (item.word || '').toLowerCase();
          const m = (item.meaning || '').toLowerCase();
          if (!w.includes(searchQuery) && !m.includes(searchQuery)) {
            return null;
          }
        }

        return item;
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);

    const limit = args.limit && args.limit > 0 ? Math.min(args.limit, 2000) : undefined;
    return limit ? items.slice(0, limit) : items;
  },
});
