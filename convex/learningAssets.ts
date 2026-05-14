import { query } from './_generated/server';
import type { QueryCtx } from './_generated/server';
import type { Id } from './_generated/dataModel';
import { v } from 'convex/values';
import { getOptionalAuthUserId } from './utils';

type RecentAssetItem = {
  id: string;
  kind: 'word' | 'grammar' | 'sentence' | 'note';
  title: string;
  subtitle?: string;
  createdAt: number;
  source?: string;
  sourceRefId?: string;
};

type ReviewAggregate = {
  dueVocabCount: number;
  dueNoteCount: number;
  savedSentenceCount: number;
  savedGrammarCount: number;
  savedWordCount: number;
};

async function getRecentWordAssets(
  ctx: QueryCtx,
  userId: Id<'users'>,
  limit: number
): Promise<RecentAssetItem[]> {
  const rows = await ctx.db
    .query('user_vocab_progress')
    .withIndex('by_user_saved', q => q.eq('userId', userId).eq('savedByUser', true))
    .order('desc')
    .take(limit);

  const wordDocs = await Promise.all(rows.map(row => ctx.db.get(row.wordId)));
  return rows
    .map((row, index): RecentAssetItem | null => {
      const word = wordDocs[index];
      if (!word) return null;
      return {
        id: String(word._id),
        kind: 'word',
        title: word.word,
        subtitle: word.meaning,
        createdAt: row.updatedAt || row.createdAt || 0,
        source: row.source,
        sourceRefId: row.sourceRefId,
      } satisfies RecentAssetItem;
    })
    .filter((item): item is RecentAssetItem => item !== null);
}

export const getReviewAggregate = query({
  args: {},
  handler: async (ctx): Promise<ReviewAggregate> => {
    const userId = await getOptionalAuthUserId(ctx);
    if (!userId) {
      return {
        dueVocabCount: 0,
        dueNoteCount: 0,
        savedSentenceCount: 0,
        savedGrammarCount: 0,
        savedWordCount: 0,
      };
    }

    const now = Date.now();
    const vocabProgress = await ctx.db
      .query('user_vocab_progress')
      .withIndex('by_user', q => q.eq('userId', userId))
      .collect();

    const dueVocabCount = vocabProgress.filter(progress => {
      if (progress.savedByUser !== true) return false;
      if (progress.status === 'MASTERED') return false;
      const dueAt = progress.nextReviewAt ?? progress.due ?? 0;
      return dueAt <= now;
    }).length;

    const reviewQueue = await ctx.db
      .query('note_review_queue')
      .withIndex('by_user_status', q => q.eq('userId', userId).eq('status', 'queued'))
      .collect();
    const dueNoteCount = reviewQueue.filter(
      item => !item.scheduledFor || item.scheduledFor <= now
    ).length;

    const [savedSentences, savedGrammar, savedWordRows] = await Promise.all([
      ctx.db
        .query('user_saved_sentences')
        .withIndex('by_user_createdAt', q => q.eq('userId', userId))
        .collect(),
      ctx.db
        .query('user_grammar_saved')
        .withIndex('by_user_createdAt', q => q.eq('userId', userId))
        .collect(),
      ctx.db
        .query('user_vocab_progress')
        .withIndex('by_user_saved', q => q.eq('userId', userId).eq('savedByUser', true))
        .collect(),
    ]);

    return {
      dueVocabCount,
      dueNoteCount,
      savedSentenceCount: savedSentences.length,
      savedGrammarCount: savedGrammar.length,
      savedWordCount: savedWordRows.length,
    };
  },
});

export const getRecentSavedAssets = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<RecentAssetItem[]> => {
    const userId = await getOptionalAuthUserId(ctx);
    if (!userId) return [] as RecentAssetItem[];

    const limit = Math.min(args.limit ?? 12, 30);
    const [sentences, grammar, words, notes] = await Promise.all([
      ctx.db
        .query('user_saved_sentences')
        .withIndex('by_user_createdAt', q => q.eq('userId', userId))
        .order('desc')
        .take(limit),
      ctx.db
        .query('user_grammar_saved')
        .withIndex('by_user_createdAt', q => q.eq('userId', userId))
        .order('desc')
        .take(limit),
      getRecentWordAssets(ctx, userId, limit),
      ctx.db
        .query('note_review_queue')
        .withIndex('by_user', q => q.eq('userId', userId))
        .order('desc')
        .take(limit),
    ]);

    const notePages = await Promise.all(notes.map(item => ctx.db.get(item.pageId)));

    const sentenceItems: RecentAssetItem[] = sentences.map(item => ({
      id: String(item._id),
      kind: 'sentence',
      title: item.text,
      subtitle: item.translation,
      createdAt: item.updatedAt || item.createdAt,
      source: item.source,
      sourceRefId: item.sourceRefId,
    }));

    const grammarItems: RecentAssetItem[] = grammar.map(item => ({
      id: String(item._id),
      kind: 'grammar',
      title: item.pattern,
      subtitle: item.explanation,
      createdAt: item.updatedAt || item.createdAt,
      source: item.source,
      sourceRefId: item.sourceRefId,
    }));

    const noteItems: RecentAssetItem[] = notes
      .map((item, index): RecentAssetItem | null => {
        const page = notePages[index];
        if (!page) return null;
        return {
          id: String(item._id),
          kind: 'note',
          title: page.title,
          subtitle: page.previewText,
          createdAt: item.updatedAt || item.createdAt,
          source: page.sourceModule,
          sourceRefId:
            typeof item.sourceRef?.explanationId === 'string'
              ? item.sourceRef.explanationId
              : undefined,
        } satisfies RecentAssetItem;
      })
      .filter((item): item is RecentAssetItem => item !== null);

    return [...sentenceItems, ...grammarItems, ...words, ...noteItems]
      .sort((left, right) => right.createdAt - left.createdAt)
      .slice(0, limit);
  },
});

export const getHomeSnapshot = query({
  args: {
    recentLimit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getOptionalAuthUserId(ctx);
    if (!userId) {
      return {
        summary: {
          dueVocabCount: 0,
          dueNoteCount: 0,
          savedSentenceCount: 0,
          savedGrammarCount: 0,
          savedWordCount: 0,
        },
        recent: [] as RecentAssetItem[],
      };
    }

    const [vocabProgress, reviewQueue, savedSentences, savedGrammar, savedWordRows, recent] =
      await Promise.all([
        ctx.db
          .query('user_vocab_progress')
          .withIndex('by_user', q => q.eq('userId', userId))
          .collect(),
        ctx.db
          .query('note_review_queue')
          .withIndex('by_user_status', q => q.eq('userId', userId).eq('status', 'queued'))
          .collect(),
        ctx.db
          .query('user_saved_sentences')
          .withIndex('by_user_createdAt', q => q.eq('userId', userId))
          .collect(),
        ctx.db
          .query('user_grammar_saved')
          .withIndex('by_user_createdAt', q => q.eq('userId', userId))
          .collect(),
        ctx.db
          .query('user_vocab_progress')
          .withIndex('by_user_saved', q => q.eq('userId', userId).eq('savedByUser', true))
          .collect(),
        getRecentWordAssets(ctx, userId, Math.min(args.recentLimit ?? 12, 30)),
      ]);

    const now = Date.now();
    const summary: ReviewAggregate = {
      dueVocabCount: vocabProgress.filter(progress => {
        if (progress.savedByUser !== true) return false;
        if (progress.status === 'MASTERED') return false;
        const dueAt = progress.nextReviewAt ?? progress.due ?? 0;
        return dueAt <= now;
      }).length,
      dueNoteCount: reviewQueue.filter(item => !item.scheduledFor || item.scheduledFor <= now)
        .length,
      savedSentenceCount: savedSentences.length,
      savedGrammarCount: savedGrammar.length,
      savedWordCount: savedWordRows.length,
    };

    return {
      summary,
      recent,
    };
  },
});
