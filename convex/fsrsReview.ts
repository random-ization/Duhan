/**
 * FSRS Review Module — Sentence & Grammar Review
 *
 * Provides query + mutation for reviewing saved sentences and grammar
 * using the FSRS spaced repetition algorithm. Mirrors the vocab review
 * pattern but works with user_saved_sentences and user_grammar_saved tables.
 */
import { query, mutation } from './_generated/server';
import { v } from 'convex/values';
import type { Id } from './_generated/dataModel';
import { getAuthUserId } from './utils';
import {
  fsrsStateFromPrefixedFields,
  fsrsStateToPrefixedFields,
  createInitialFsrsState,
  type FsrsCardState,
} from './fsrsUtils';

// ─── Types ──────────────────────────────────────────────

export type DueSentenceItem = {
  _id: string;
  kind: 'sentence';
  text: string;
  translation?: string;
  source?: string;
  fsrsState: FsrsCardState;
  createdAt: number;
};

export type DueGrammarItem = {
  _id: string;
  kind: 'grammar';
  pattern: string;
  explanation?: string;
  source?: string;
  fsrsState: FsrsCardState;
  createdAt: number;
};

export type DueReviewItem = DueSentenceItem | DueGrammarItem;

// ─── Queries ────────────────────────────────────────────

/**
 * Get all due sentence and grammar items for the current user.
 * Supports filtering by kind and limiting results.
 */
export const getDueItems = query({
  args: {
    kind: v.optional(v.union(v.literal('sentence'), v.literal('grammar'), v.literal('all'))),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<DueReviewItem[]> => {
    const userId = await getAuthUserId(ctx).catch(() => null);
    if (!userId) return [];

    const now = Date.now();
    const kind = args.kind ?? 'all';
    const limit = Math.min(args.limit ?? 50, 200);
    const items: DueReviewItem[] = [];

    // Fetch due sentences
    if (kind === 'all' || kind === 'sentence') {
      const sentences = await ctx.db
        .query('user_saved_sentences')
        .withIndex('by_user_due', q => q.eq('userId', userId).lte('fsrsDue', now))
        .take(limit);

      for (const s of sentences) {
        const fsrs = fsrsStateFromPrefixedFields(s);
        if (!fsrs) continue;
        items.push({
          _id: s._id,
          kind: 'sentence',
          text: s.text,
          translation: s.translation ?? undefined,
          source: s.source ?? undefined,
          fsrsState: fsrs,
          createdAt: s.createdAt,
        });
      }
    }

    // Fetch due grammar
    if (kind === 'all' || kind === 'grammar') {
      const grammar = await ctx.db
        .query('user_grammar_saved')
        .withIndex('by_user_due', q => q.eq('userId', userId).lte('fsrsDue', now))
        .take(limit);

      for (const g of grammar) {
        const fsrs = fsrsStateFromPrefixedFields(g);
        if (!fsrs) continue;
        items.push({
          _id: g._id,
          kind: 'grammar',
          pattern: g.pattern,
          explanation: g.explanation ?? undefined,
          source: g.source ?? undefined,
          fsrsState: fsrs,
          createdAt: g.createdAt,
        });
      }
    }

    // Sort by due date (most overdue first) and limit
    items.sort((a, b) => a.fsrsState.due - b.fsrsState.due);
    return items.slice(0, limit);
  },
});

/**
 * Get review summary counts for the current user.
 */
export const getReviewSummary = query({
  args: {},
  handler: async ctx => {
    const userId = await getAuthUserId(ctx).catch(() => null);
    if (!userId) return { dueSentences: 0, dueGrammar: 0, totalSentences: 0, totalGrammar: 0 };

    const now = Date.now();

    const allSentences = await ctx.db
      .query('user_saved_sentences')
      .withIndex('by_user_createdAt', q => q.eq('userId', userId))
      .collect();

    const allGrammar = await ctx.db
      .query('user_grammar_saved')
      .withIndex('by_user_createdAt', q => q.eq('userId', userId))
      .collect();

    const dueSentences = allSentences.filter(s => {
      const due = s.fsrsDue ?? 0;
      return due > 0 && due <= now;
    }).length;

    const dueGrammar = allGrammar.filter(g => {
      const due = g.fsrsDue ?? 0;
      return due > 0 && due <= now;
    }).length;

    return {
      dueSentences,
      dueGrammar,
      totalSentences: allSentences.length,
      totalGrammar: allGrammar.length,
    };
  },
});

// ─── Mutations ──────────────────────────────────────────

/**
 * Apply an FSRS review result to a saved sentence or grammar item.
 * Called after the client runs calculateNextSchedule and gets the new card state.
 *
 * This is the "write" side — the client calls the fsrs.calculateNextSchedule
 * action first (which runs in Node), then passes the result here to persist.
 */
export const applyReviewResult = mutation({
  args: {
    itemId: v.string(),
    kind: v.union(v.literal('sentence'), v.literal('grammar')),
    newCardState: v.object({
      state: v.number(),
      due: v.number(),
      stability: v.number(),
      difficulty: v.number(),
      elapsed_days: v.number(),
      scheduled_days: v.number(),
      learning_steps: v.number(),
      reps: v.number(),
      lapses: v.number(),
      last_review: v.optional(v.union(v.number(), v.null())),
    }),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    const { itemId, kind, newCardState } = args;

    const fsrsFields = fsrsStateToPrefixedFields({
      state: newCardState.state,
      due: newCardState.due,
      stability: newCardState.stability,
      difficulty: newCardState.difficulty,
      elapsedDays: newCardState.elapsed_days,
      scheduledDays: newCardState.scheduled_days,
      learningSteps: newCardState.learning_steps,
      reps: newCardState.reps,
      lapses: newCardState.lapses,
      lastReview: newCardState.last_review ?? undefined,
    });

    if (kind === 'sentence') {
      const savedSentenceId = itemId as Id<'user_saved_sentences'>;
      const doc = await ctx.db.get(savedSentenceId);
      if (!doc || doc.userId !== userId) {
        throw new Error('Sentence not found or unauthorized');
      }
      await ctx.db.patch(savedSentenceId, {
        ...fsrsFields,
        updatedAt: Date.now(),
      });
    } else {
      const savedGrammarId = itemId as Id<'user_grammar_saved'>;
      const doc = await ctx.db.get(savedGrammarId);
      if (!doc || doc.userId !== userId) {
        throw new Error('Grammar item not found or unauthorized');
      }
      await ctx.db.patch(savedGrammarId, {
        ...fsrsFields,
        updatedAt: Date.now(),
      });
    }

    return { success: true };
  },
});

/**
 * Initialize FSRS state for items that were saved before FSRS was added.
 * Idempotent — skips items that already have FSRS state.
 */
export const initializeFsrsForExistingItems = mutation({
  args: {},
  handler: async ctx => {
    const userId = await getAuthUserId(ctx);
    const now = Date.now();
    let sentenceCount = 0;
    let grammarCount = 0;

    // Sentences
    const sentences = await ctx.db
      .query('user_saved_sentences')
      .withIndex('by_user_createdAt', q => q.eq('userId', userId))
      .collect();

    for (const s of sentences) {
      if (s.fsrsState !== undefined && s.fsrsDue !== undefined) continue;
      const fsrsFields = fsrsStateToPrefixedFields(createInitialFsrsState(s.createdAt));
      await ctx.db.patch(s._id, { ...fsrsFields, updatedAt: now });
      sentenceCount++;
    }

    // Grammar
    const grammar = await ctx.db
      .query('user_grammar_saved')
      .withIndex('by_user_createdAt', q => q.eq('userId', userId))
      .collect();

    for (const g of grammar) {
      if (g.fsrsState !== undefined && g.fsrsDue !== undefined) continue;
      const fsrsFields = fsrsStateToPrefixedFields(createInitialFsrsState(g.createdAt));
      await ctx.db.patch(g._id, { ...fsrsFields, updatedAt: now });
      grammarCount++;
    }

    return { initialized: { sentences: sentenceCount, grammar: grammarCount } };
  },
});
