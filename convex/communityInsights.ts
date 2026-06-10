/**
 * Community Learning Insights — anonymous aggregation layer that computes
 * cross-user learning statistics for community insight cards.
 *
 * All data is anonymized: no user IDs are exposed. Computed stats are
 * stored in the `community_stats` table and served as read-only queries.
 *
 * Stat types:
 * - "hardest_words" — words with highest lapse rates across all users
 * - "common_errors" — most frequent writing error types (KAGAS)
 * - "trending_content" — most-studied content in the last 7 days
 * - "daily_summary" — daily aggregate metrics (active users, reviews, etc.)
 */

import { internalMutation, query } from './_generated/server';
import type { Id } from './_generated/dataModel';
import { v } from 'convex/values';
import { getOptionalAuthUserId } from './utils';

/** How many items to include in each stat category */
const TOP_N = 20;

// ── Queries (public) ─────────────────────────────────────────────

/**
 * Get the latest community insights for a given stat type.
 */
export const getInsight = query({
  args: {
    statType: v.string(),
  },
  handler: async (ctx, args) => {
    const stat = await ctx.db
      .query('community_stats')
      .withIndex('by_type_period', q => q.eq('statType', args.statType))
      .order('desc')
      .first();

    return stat;
  },
});

/**
 * Get all latest community insights (one per stat type).
 */
export const getAllInsights = query({
  args: {},
  handler: async ctx => {
    const statTypes = ['hardest_words', 'common_errors', 'trending_content', 'daily_summary'];

    const results: Record<
      string,
      {
        data: unknown;
        sampleSize: number;
        computedAt: number;
      } | null
    > = {};

    for (const statType of statTypes) {
      const stat = await ctx.db
        .query('community_stats')
        .withIndex('by_type_period', q => q.eq('statType', statType))
        .order('desc')
        .first();

      results[statType] = stat
        ? { data: stat.data, sampleSize: stat.sampleSize, computedAt: stat.computedAt }
        : null;
    }

    return results;
  },
});

/**
 * Get the user's rank in context of community stats.
 * Returns where the user stands relative to anonymous aggregates.
 */
export const getMyStanding = query({
  args: {},
  handler: async ctx => {
    const userId = await getOptionalAuthUserId(ctx);
    if (!userId) return null;

    // Get user's vocab count and mastered count
    const vocabProgress = await ctx.db
      .query('user_vocab_progress')
      .withIndex('by_user', q => q.eq('userId', userId))
      .take(500);

    const totalWords = vocabProgress.length;
    const masteredWords = vocabProgress.filter(
      r => r.state === 2 || r.status === 'MASTERED'
    ).length;

    // Get latest daily summary for community averages
    const summary = await ctx.db
      .query('community_stats')
      .withIndex('by_type_period', q => q.eq('statType', 'daily_summary'))
      .order('desc')
      .first();

    const communityAvg = summary?.data as {
      avgWordsPerUser?: number;
      activeUsers?: number;
    } | null;

    return {
      totalWords,
      masteredWords,
      communityAvgWords: communityAvg?.avgWordsPerUser ?? 0,
      communityActiveUsers: communityAvg?.activeUsers ?? 0,
    };
  },
});

// ── Internal mutations (called by scheduled jobs) ────────────────

/**
 * Compute "hardest_words" — words with highest lapse rates.
 * Called periodically (e.g. daily) by a scheduled job.
 */
export const computeHardestWords = internalMutation({
  args: {},
  handler: async ctx => {
    const now = Date.now();
    const periodStart = now - 30 * 24 * 60 * 60 * 1000; // Last 30 days

    // Scan vocab progress with lapses > 0
    // We scan a bounded set and aggregate by word.
    // order('desc') samples the NEWEST rows — the default ascending order
    // would keep sampling the same oldest rows once the table grows past
    // the cap, making the stat permanently stale.
    const allProgress = await ctx.db.query('user_vocab_progress').order('desc').take(5000);

    const wordStats = new Map<
      string,
      {
        wordId: string;
        totalLapses: number;
        totalUsers: number;
        totalReps: number;
      }
    >();

    const usersSeen = new Set<string>();

    for (const row of allProgress) {
      if (!row.lapses || row.lapses === 0) continue;

      usersSeen.add(row.userId);
      const wordId = row.wordId;
      const stats = wordStats.get(wordId) || {
        wordId,
        totalLapses: 0,
        totalUsers: 0,
        totalReps: 0,
      };
      stats.totalLapses += row.lapses;
      stats.totalUsers += 1;
      stats.totalReps += row.reps ?? 0;
      wordStats.set(wordId, stats);
    }

    // Sort by avg lapses per user (hardest = most lapses per person)
    const ranked = Array.from(wordStats.values())
      .filter(s => s.totalUsers >= 2) // At least 2 users struggled
      .map(s => ({
        wordId: s.wordId,
        avgLapses: Math.round((s.totalLapses / s.totalUsers) * 10) / 10,
        userCount: s.totalUsers,
        avgReps: Math.round((s.totalReps / s.totalUsers) * 10) / 10,
      }))
      .sort((a, b) => b.avgLapses - a.avgLapses)
      .slice(0, TOP_N);

    // Resolve word texts
    const enriched = await Promise.all(
      ranked.map(async r => {
        const word = await ctx.db.get(r.wordId as Id<'words'>);
        return {
          ...r,
          korean: word?.word ?? '?',
          meaning: word?.meaning ?? '',
        };
      })
    );

    await ctx.db.insert('community_stats', {
      statType: 'hardest_words',
      periodStart,
      periodEnd: now,
      data: enriched,
      sampleSize: usersSeen.size,
      computedAt: now,
    });
  },
});

/**
 * Compute "common_errors" — most frequent KAGAS error types from writing.
 */
export const computeCommonErrors = internalMutation({
  args: {},
  handler: async ctx => {
    const now = Date.now();
    const periodStart = now - 30 * 24 * 60 * 60 * 1000;

    // Newest rows first — see note in computeHardestWords
    const mistakes = await ctx.db.query('user_mistakes').order('desc').take(3000);

    const errorCounts = new Map<
      string,
      {
        type: string;
        count: number;
        users: Set<string>;
        examples: Array<{ original: string; corrected: string }>;
      }
    >();

    for (const m of mistakes) {
      const type = m.errorTypeKagas ?? m.errorType;
      const stats = errorCounts.get(type) || {
        type,
        count: 0,
        users: new Set(),
        examples: [],
      };
      stats.count += 1;
      stats.users.add(m.userId);
      if (stats.examples.length < 3) {
        stats.examples.push({
          original: m.originalText.slice(0, 50),
          corrected: m.correctedText.slice(0, 50),
        });
      }
      errorCounts.set(type, stats);
    }

    const ranked = Array.from(errorCounts.values())
      .map(s => ({
        errorType: s.type,
        totalCount: s.count,
        userCount: s.users.size,
        examples: s.examples,
      }))
      .sort((a, b) => b.totalCount - a.totalCount)
      .slice(0, TOP_N);

    const uniqueUsers = new Set<string>();
    for (const m of mistakes) uniqueUsers.add(m.userId);

    await ctx.db.insert('community_stats', {
      statType: 'common_errors',
      periodStart,
      periodEnd: now,
      data: ranked,
      sampleSize: uniqueUsers.size,
      computedAt: now,
    });
  },
});

/**
 * Compute "trending_content" — most-studied content in the last 7 days.
 */
export const computeTrendingContent = internalMutation({
  args: {},
  handler: async ctx => {
    const now = Date.now();
    const periodStart = now - 7 * 24 * 60 * 60 * 1000;

    // Use learning_events to track what people are studying.
    // Must be order('desc'): the default ascending order returns the OLDEST
    // 5000 events, so the recent-period filter below would match nothing
    // once the table grows past the cap.
    const recentEvents = await ctx.db.query('learning_events').order('desc').take(5000);

    // Filter to recent period
    const periodEvents = recentEvents.filter(e => e.eventAt >= periodStart);

    const contentCounts = new Map<
      string,
      {
        contentId: string;
        module: string;
        sessionCount: number;
        users: Set<string>;
        totalMinutes: number;
      }
    >();

    for (const event of periodEvents) {
      const key = event.contentId ?? event.courseId ?? event.module ?? 'unknown';
      const stats = contentCounts.get(key) || {
        contentId: key,
        module: event.module ?? 'unknown',
        sessionCount: 0,
        users: new Set(),
        totalMinutes: 0,
      };
      stats.sessionCount += 1;
      stats.users.add(event.userId);
      stats.totalMinutes += (event.durationSec ?? 0) / 60;
      contentCounts.set(key, stats);
    }

    const ranked = Array.from(contentCounts.values())
      .map(s => ({
        contentId: s.contentId,
        module: s.module,
        sessionCount: s.sessionCount,
        userCount: s.users.size,
        totalMinutes: Math.round(s.totalMinutes),
      }))
      .sort((a, b) => b.sessionCount - a.sessionCount)
      .slice(0, TOP_N);

    const uniqueUsers = new Set<string>();
    for (const e of periodEvents) uniqueUsers.add(e.userId);

    await ctx.db.insert('community_stats', {
      statType: 'trending_content',
      periodStart,
      periodEnd: now,
      data: ranked,
      sampleSize: uniqueUsers.size,
      computedAt: now,
    });
  },
});

/**
 * Compute "daily_summary" — aggregate daily metrics.
 */
export const computeDailySummary = internalMutation({
  args: {},
  handler: async ctx => {
    const now = Date.now();
    const periodStart = now - 24 * 60 * 60 * 1000;

    // Count active users from learning_events (newest first — see
    // computeTrendingContent for why order('desc') is required here)
    const recentEvents = await ctx.db.query('learning_events').order('desc').take(5000);

    const todayEvents = recentEvents.filter(e => e.eventAt >= periodStart);
    const activeUsers = new Set<string>();
    let totalReviews = 0;
    let totalMinutes = 0;

    for (const event of todayEvents) {
      activeUsers.add(event.userId);
      if (event.eventName === 'review_completed') {
        totalReviews += event.itemCount ?? 0;
      }
      totalMinutes += (event.durationSec ?? 0) / 60;
    }

    // Get total user vocab counts for averages (newest-first sample)
    const allVocab = await ctx.db.query('user_vocab_progress').order('desc').take(5000);

    const userWordCounts = new Map<string, number>();
    for (const row of allVocab) {
      userWordCounts.set(row.userId, (userWordCounts.get(row.userId) ?? 0) + 1);
    }

    const avgWordsPerUser =
      userWordCounts.size > 0
        ? Math.round(
            Array.from(userWordCounts.values()).reduce((s, c) => s + c, 0) / userWordCounts.size
          )
        : 0;

    // Count total registered users
    const users = await ctx.db.query('users').take(5000);
    const totalRegisteredUsers = users.length;

    await ctx.db.insert('community_stats', {
      statType: 'daily_summary',
      periodStart,
      periodEnd: now,
      data: {
        activeUsers: activeUsers.size,
        totalReviews,
        totalMinutes: Math.round(totalMinutes),
        avgWordsPerUser,
        totalRegisteredUsers,
      },
      sampleSize: activeUsers.size,
      computedAt: now,
    });
  },
});
