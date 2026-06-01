import { mutation, query } from './_generated/server';
import { v } from 'convex/values';
import { getAuthUserId, getOptionalAuthUserId } from './utils';
import { ONE_DAY_MS, startOfDay } from './userStatsHelpers';

/**
 * Recommendation engine — picks the single most-relevant "next best
 * action" for the user to resume studying.
 *
 * P2 upgrade: now uses recommendation_log history to personalize
 * suggestions based on past engagement patterns (click-through rate
 * per module, time-of-day preferences, skip patterns).
 *
 * This is intentionally read-only and cheap: it uses a bounded scan of
 * user_vocab_progress, the user doc's lastActivity fields, and at most
 * one recent learning_events row. It does **not** touch exam/podcast
 * tables directly — surface routing is keyword-based so the FE can
 * deep-link using already-mounted routes.
 */

export type NextBestActionKind =
  | 'review_due_vocab'
  | 'continue_course'
  | 'exam_practice'
  | 'podcast_resume'
  | 'reading_continue'
  | 'typing_drill'
  | 'new_vocab'
  | 'explore';

export type NextBestAction = {
  kind: NextBestActionKind;
  /** Route path (no language prefix). */
  path: string;
  /** Module label for the card accent ("復" / "聽" / ...) */
  seal: string;
  /** Integer count for badges — 0 when N/A. */
  count: number;
  /** Localized strings are computed client-side from `kind`/`count`. */
  contentId?: string;
  courseId?: string;
  unitId?: number;
  /** ISO reason code (e.g. "due_reviews_high", "morning_commute"). */
  reasonCode: string;
};

const MORNING_COMMUTE_START_H = 7;
const MORNING_COMMUTE_END_H = 9;
const EVENING_READING_START_H = 19;
const EVENING_READING_END_H = 23;
// If the last activity was this long ago we treat it as "cold" and
// weight vocab reviews more heavily.
const COLD_THRESHOLD_MS = 3 * ONE_DAY_MS;

const MODULE_TO_PATH: Record<string, string> = {
  VOCAB: '/review',
  READING: '/media',
  LISTENING: '/media',
  GRAMMAR: '/courses',
  EXAM: '/topik',
  PODCAST: '/media',
  TYPING: '/typing',
};

const MODULE_TO_SEAL: Record<string, string> = {
  VOCAB: '復',
  READING: '讀',
  LISTENING: '聽',
  GRAMMAR: '文',
  EXAM: '試',
  PODCAST: '聽',
  TYPING: '打',
};

/**
 * Compute per-module engagement scores from recent recommendation logs.
 * Returns a map of module → engagement score (0-1).
 * Higher score = user engages more with that module when recommended.
 */
function computeModuleEngagement(
  logs: Array<{ module: string; interaction: string }>
): Map<string, number> {
  const moduleStats = new Map<string, { shown: number; clicked: number; completed: number }>();

  for (const log of logs) {
    const stats = moduleStats.get(log.module) || { shown: 0, clicked: 0, completed: 0 };
    stats.shown += 1;
    if (log.interaction === 'clicked') stats.clicked += 1;
    if (log.interaction === 'completed') {
      stats.clicked += 1;
      stats.completed += 1;
    }
    moduleStats.set(log.module, stats);
  }

  const engagement = new Map<string, number>();
  for (const [module, stats] of moduleStats) {
    if (stats.shown === 0) continue;
    // Weighted: click = 0.4, completed = 0.6
    const clickRate = stats.clicked / stats.shown;
    const completeRate = stats.completed / Math.max(1, stats.clicked);
    engagement.set(module, clickRate * 0.4 + completeRate * 0.6);
  }
  return engagement;
}

/**
 * Compute preferred hours for each module from logs.
 * Returns a map of module → preferred hour range.
 */
function computeTimePreferences(
  logs: Array<{ module: string; interaction: string; localHour?: number }>
): Map<string, number> {
  const moduleHours = new Map<string, number[]>();

  for (const log of logs) {
    if (log.interaction !== 'clicked' && log.interaction !== 'completed') continue;
    if (typeof log.localHour !== 'number') continue;
    const hours = moduleHours.get(log.module) || [];
    hours.push(log.localHour);
    moduleHours.set(log.module, hours);
  }

  const avgHours = new Map<string, number>();
  for (const [module, hours] of moduleHours) {
    if (hours.length < 3) continue; // Need minimum data
    avgHours.set(module, hours.reduce((s, h) => s + h, 0) / hours.length);
  }
  return avgHours;
}

/** Maximum logs to scan for personalization */
const PERSONALIZATION_LOG_LIMIT = 100;

export const getNextBestAction = query({
  args: {
    /** Caller's local hour in 24h [0,23]. The client supplies this so
     *  the server does not need timezone data. */
    localHour: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<NextBestAction | null> => {
    const userId = await getOptionalAuthUserId(ctx);
    if (!userId) return null;

    const user = await ctx.db.get(userId);
    if (!user) return null;

    const now = Date.now();
    const localHour =
      typeof args.localHour === 'number'
        ? Math.max(0, Math.min(23, Math.floor(args.localHour)))
        : new Date(now).getUTCHours();

    // Due reviews (bounded scan of up to 500 rows is plenty).
    const vocabProgress = await ctx.db
      .query('user_vocab_progress')
      .withIndex('by_user', q => q.eq('userId', userId))
      .take(500);

    let dueReviews = 0;
    for (const row of vocabProgress) {
      const dueAt = row.nextReviewAt ?? row.due;
      if (dueAt && dueAt <= now) dueReviews += 1;
    }

    const todayStart = startOfDay(now);
    const todayReviewEvents = await ctx.db
      .query('learning_events')
      .withIndex('by_user_eventAt', q => q.eq('userId', userId).gte('eventAt', todayStart))
      .collect();
    const completedReviewCountToday = todayReviewEvents.reduce((sum, event) => {
      if (event.eventName !== 'review_completed') return sum;
      return sum + Math.max(0, event.itemCount ?? 0);
    }, 0);
    const effectiveDueReviews = Math.max(0, dueReviews - completedReviewCountToday);

    const lastActivityAt = user.lastActivityAt ?? 0;
    const lastActivityType = (user.lastActivityType ?? '').toUpperCase();
    const coldStart = now - lastActivityAt > COLD_THRESHOLD_MS;

    // ── Personalization: load recent recommendation logs ──
    const recentLogs = await ctx.db
      .query('recommendation_log')
      .withIndex('by_user_createdAt', q => q.eq('userId', userId))
      .order('desc')
      .take(PERSONALIZATION_LOG_LIMIT);

    const moduleEngagement = computeModuleEngagement(recentLogs);
    const timePrefs = computeTimePreferences(recentLogs);

    // Check if there's a module the user engages with well at this hour
    let personalizedModule: string | null = null;
    if (recentLogs.length >= 10) {
      // Find module whose preferred time is closest to current hour
      let bestDist = Infinity;
      for (const [module, avgHour] of timePrefs) {
        const engagement = moduleEngagement.get(module) ?? 0;
        if (engagement < 0.2) continue; // Skip low-engagement modules
        const dist = Math.abs(localHour - avgHour);
        const wrappedDist = Math.min(dist, 24 - dist);
        if (wrappedDist < bestDist && wrappedDist <= 3) {
          bestDist = wrappedDist;
          personalizedModule = module;
        }
      }
    }

    // Rule 1 — a lot of due reviews is always priority one.
    if (effectiveDueReviews >= 10) {
      return {
        kind: 'review_due_vocab',
        path: '/review',
        seal: '復',
        count: effectiveDueReviews,
        reasonCode: 'due_reviews_high',
      };
    }

    // Rule 2 — cold start: surface reviews even if smaller.
    if (coldStart && effectiveDueReviews > 0) {
      return {
        kind: 'review_due_vocab',
        path: '/review',
        seal: '復',
        count: effectiveDueReviews,
        reasonCode: 'cold_start_with_reviews',
      };
    }

    // Rule 3 — personalized time-of-day recommendation (overrides generic time rules).
    if (personalizedModule && MODULE_TO_PATH[personalizedModule]) {
      const kindMap: Record<string, NextBestActionKind> = {
        VOCAB: 'review_due_vocab',
        READING: 'reading_continue',
        LISTENING: 'podcast_resume',
        GRAMMAR: 'continue_course',
        EXAM: 'exam_practice',
        PODCAST: 'podcast_resume',
        TYPING: 'typing_drill',
      };
      return {
        kind: kindMap[personalizedModule] ?? 'continue_course',
        path: MODULE_TO_PATH[personalizedModule],
        seal: MODULE_TO_SEAL[personalizedModule] ?? '學',
        count: personalizedModule === 'VOCAB' ? effectiveDueReviews : 0,
        reasonCode: 'personalized_time_preference',
      };
    }

    // Rule 4 — morning commute → listening.
    if (localHour >= MORNING_COMMUTE_START_H && localHour < MORNING_COMMUTE_END_H) {
      return {
        kind: 'podcast_resume',
        path: '/media',
        seal: '聽',
        count: 0,
        reasonCode: 'morning_commute',
      };
    }

    // Rule 5 — evening → reading.
    if (localHour >= EVENING_READING_START_H && localHour <= EVENING_READING_END_H) {
      return {
        kind: 'reading_continue',
        path: '/reading',
        seal: '讀',
        count: 0,
        reasonCode: 'evening_reading',
      };
    }

    // Rule 6 — resume whatever they were doing last.
    if (lastActivityType && MODULE_TO_PATH[lastActivityType]) {
      const kindMap: Record<string, NextBestActionKind> = {
        VOCAB: 'review_due_vocab',
        READING: 'reading_continue',
        LISTENING: 'podcast_resume',
        GRAMMAR: 'continue_course',
        EXAM: 'exam_practice',
        PODCAST: 'podcast_resume',
        TYPING: 'typing_drill',
      };
      return {
        kind: kindMap[lastActivityType] ?? 'continue_course',
        path: MODULE_TO_PATH[lastActivityType],
        seal: MODULE_TO_SEAL[lastActivityType] ?? '學',
        count: effectiveDueReviews,
        reasonCode: 'resume_last_module',
      };
    }

    // Rule 7 — if there are any reviews at all, promote them.
    if (effectiveDueReviews > 0) {
      return {
        kind: 'review_due_vocab',
        path: '/review',
        seal: '復',
        count: effectiveDueReviews,
        reasonCode: 'due_reviews_any',
      };
    }

    // Rule 8 — check if there's a high-engagement module to suggest.
    if (recentLogs.length >= 5) {
      let bestModule: string | null = null;
      let bestEngagement = 0;
      for (const [module, score] of moduleEngagement) {
        if (score > bestEngagement && MODULE_TO_PATH[module]) {
          bestEngagement = score;
          bestModule = module;
        }
      }
      if (bestModule && bestEngagement > 0.3) {
        const kindMap: Record<string, NextBestActionKind> = {
          VOCAB: 'new_vocab',
          READING: 'reading_continue',
          LISTENING: 'podcast_resume',
          GRAMMAR: 'continue_course',
          EXAM: 'exam_practice',
          PODCAST: 'podcast_resume',
          TYPING: 'typing_drill',
        };
        return {
          kind: kindMap[bestModule] ?? 'explore',
          path: MODULE_TO_PATH[bestModule],
          seal: MODULE_TO_SEAL[bestModule] ?? '學',
          count: 0,
          reasonCode: 'personalized_high_engagement',
        };
      }
    }

    // Rule 9 — nothing specific: suggest exploring new vocab.
    return {
      kind: 'new_vocab',
      path: '/courses',
      seal: '新',
      count: 0,
      reasonCode: 'default_explore',
    };
  },
});

// ── Interaction logging ──────────────────────────────────────────

/**
 * Log a recommendation interaction (shown/clicked/skipped/completed).
 * Called by the client when a recommendation card is displayed or acted upon.
 */
export const logRecommendationInteraction = mutation({
  args: {
    actionKind: v.string(),
    module: v.string(),
    reasonCode: v.string(),
    interaction: v.string(), // "shown" | "clicked" | "skipped" | "completed"
    contentId: v.optional(v.string()),
    localHour: v.optional(v.number()),
    engagementMs: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);

    await ctx.db.insert('recommendation_log', {
      userId,
      actionKind: args.actionKind,
      module: args.module,
      reasonCode: args.reasonCode,
      interaction: args.interaction,
      contentId: args.contentId,
      localHour: args.localHour,
      engagementMs: args.engagementMs,
      createdAt: Date.now(),
    });
  },
});

/**
 * Get recommendation engagement stats for the current user.
 * Useful for debugging and for the ability profiler.
 */
export const getRecommendationStats = query({
  args: {},
  handler: async ctx => {
    const userId = await getOptionalAuthUserId(ctx);
    if (!userId) return null;

    const logs = await ctx.db
      .query('recommendation_log')
      .withIndex('by_user_createdAt', q => q.eq('userId', userId))
      .order('desc')
      .take(200);

    if (logs.length === 0) return { totalShown: 0, modules: [] };

    const moduleStats = new Map<
      string,
      {
        shown: number;
        clicked: number;
        completed: number;
        skipped: number;
        totalEngagementMs: number;
      }
    >();

    for (const log of logs) {
      const stats = moduleStats.get(log.module) || {
        shown: 0,
        clicked: 0,
        completed: 0,
        skipped: 0,
        totalEngagementMs: 0,
      };
      stats.shown += 1;
      if (log.interaction === 'clicked') stats.clicked += 1;
      if (log.interaction === 'completed') stats.completed += 1;
      if (log.interaction === 'skipped') stats.skipped += 1;
      if (log.engagementMs) stats.totalEngagementMs += log.engagementMs;
      moduleStats.set(log.module, stats);
    }

    return {
      totalShown: logs.length,
      modules: Array.from(moduleStats.entries()).map(([module, stats]) => ({
        module,
        ...stats,
        clickRate: stats.shown > 0 ? Math.round((stats.clicked / stats.shown) * 100) : 0,
        avgEngagementMs:
          stats.completed > 0 ? Math.round(stats.totalEngagementMs / stats.completed) : 0,
      })),
    };
  },
});
