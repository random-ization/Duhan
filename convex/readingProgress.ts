/**
 * User Reading Progress — tracks per-content reading position and stats.
 *
 * PRD section 19: "阅读句子级数据基础"
 *
 * Supports:
 * - Resume reading from last position
 * - Track reading time per content
 * - Track saved words/sentences per content
 * - Completion tracking
 */

import { mutation, query } from './_generated/server';
import { v } from 'convex/values';
import { getAuthUserId, getOptionalAuthUserId } from './utils';

// ── Queries ──────────────────────────────────────────────────────

/**
 * Get reading progress for a specific content item.
 */
export const getProgress = query({
  args: {
    contentType: v.string(),
    contentId: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getOptionalAuthUserId(ctx);
    if (!userId) return null;

    return await ctx.db
      .query('user_reading_progress')
      .withIndex('by_user_content', q =>
        q.eq('userId', userId).eq('contentType', args.contentType).eq('contentId', args.contentId)
      )
      .first();
  },
});

/**
 * Get recent reading activity for the current user (for "Continue Learning" on dashboard).
 */
export const getRecentReading = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getOptionalAuthUserId(ctx);
    if (!userId) return [];

    return await ctx.db
      .query('user_reading_progress')
      .withIndex('by_user_updatedAt', q => q.eq('userId', userId))
      .order('desc')
      .take(args.limit ?? 5);
  },
});

/**
 * Get reading stats summary for the user.
 */
export const getReadingStats = query({
  args: {},
  handler: async ctx => {
    const userId = await getOptionalAuthUserId(ctx);
    if (!userId) return null;

    const allProgress = await ctx.db
      .query('user_reading_progress')
      .withIndex('by_user_updatedAt', q => q.eq('userId', userId))
      .take(500);

    const totalReadingTime = allProgress.reduce((sum, p) => sum + (p.readingTimeSeconds ?? 0), 0);
    const completedCount = allProgress.filter(p => p.completedAt != null).length;
    const totalSavedWords = allProgress.reduce((sum, p) => sum + (p.savedWordCount ?? 0), 0);
    const totalSavedSentences = allProgress.reduce(
      (sum, p) => sum + (p.savedSentenceCount ?? 0),
      0
    );

    return {
      totalContents: allProgress.length,
      completedContents: completedCount,
      totalReadingTimeSeconds: totalReadingTime,
      totalSavedWords,
      totalSavedSentences,
    };
  },
});

// ── Mutations ────────────────────────────────────────────────────

/**
 * Update reading progress (called when user reads/scrolls through content).
 */
export const updateProgress = mutation({
  args: {
    contentType: v.string(),
    contentId: v.string(),
    lastSentenceId: v.optional(v.string()),
    lastSentenceIndex: v.optional(v.number()),
    completedSentenceCount: v.optional(v.number()),
    totalSentenceCount: v.optional(v.number()),
    readingTimeIncrement: v.optional(v.number()), // seconds to add
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    const now = Date.now();

    const existing = await ctx.db
      .query('user_reading_progress')
      .withIndex('by_user_content', q =>
        q.eq('userId', userId).eq('contentType', args.contentType).eq('contentId', args.contentId)
      )
      .first();

    if (existing) {
      const patch: Record<string, unknown> = { updatedAt: now };

      if (args.lastSentenceId !== undefined) patch.lastSentenceId = args.lastSentenceId;
      if (args.lastSentenceIndex !== undefined) patch.lastSentenceIndex = args.lastSentenceIndex;
      if (args.completedSentenceCount !== undefined)
        patch.completedSentenceCount = args.completedSentenceCount;
      if (args.totalSentenceCount !== undefined) patch.totalSentenceCount = args.totalSentenceCount;
      if (args.readingTimeIncrement) {
        patch.readingTimeSeconds = (existing.readingTimeSeconds ?? 0) + args.readingTimeIncrement;
      }

      await ctx.db.patch(existing._id, patch);
      return existing._id;
    }

    return await ctx.db.insert('user_reading_progress', {
      userId,
      contentType: args.contentType,
      contentId: args.contentId,
      lastSentenceId: args.lastSentenceId,
      lastSentenceIndex: args.lastSentenceIndex,
      completedSentenceCount: args.completedSentenceCount,
      totalSentenceCount: args.totalSentenceCount,
      readingTimeSeconds: args.readingTimeIncrement ?? 0,
      createdAt: now,
      updatedAt: now,
    });
  },
});

/**
 * Increment saved word/sentence counts for a content item.
 * Called when user saves a word or sentence from reading context.
 */
export const incrementSavedCounts = mutation({
  args: {
    contentType: v.string(),
    contentId: v.string(),
    savedWordsDelta: v.optional(v.number()),
    savedSentencesDelta: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    const now = Date.now();

    const existing = await ctx.db
      .query('user_reading_progress')
      .withIndex('by_user_content', q =>
        q.eq('userId', userId).eq('contentType', args.contentType).eq('contentId', args.contentId)
      )
      .first();

    if (existing) {
      const patch: Record<string, unknown> = { updatedAt: now };
      if (args.savedWordsDelta) {
        patch.savedWordCount = (existing.savedWordCount ?? 0) + args.savedWordsDelta;
      }
      if (args.savedSentencesDelta) {
        patch.savedSentenceCount = (existing.savedSentenceCount ?? 0) + args.savedSentencesDelta;
      }
      await ctx.db.patch(existing._id, patch);
      return;
    }

    // Create new progress record if none exists
    await ctx.db.insert('user_reading_progress', {
      userId,
      contentType: args.contentType,
      contentId: args.contentId,
      savedWordCount: args.savedWordsDelta ?? 0,
      savedSentenceCount: args.savedSentencesDelta ?? 0,
      createdAt: now,
      updatedAt: now,
    });
  },
});

/**
 * Mark a content item as completed.
 */
export const markCompleted = mutation({
  args: {
    contentType: v.string(),
    contentId: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    const now = Date.now();

    const existing = await ctx.db
      .query('user_reading_progress')
      .withIndex('by_user_content', q =>
        q.eq('userId', userId).eq('contentType', args.contentType).eq('contentId', args.contentId)
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, { completedAt: now, updatedAt: now });
      return existing._id;
    }

    return await ctx.db.insert('user_reading_progress', {
      userId,
      contentType: args.contentType,
      contentId: args.contentId,
      completedAt: now,
      createdAt: now,
      updatedAt: now,
    });
  },
});
