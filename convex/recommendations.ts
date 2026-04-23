import { query } from './_generated/server';
import { v } from 'convex/values';
import { getOptionalAuthUserId } from './utils';
import { ONE_DAY_MS, startOfDay } from './userStatsHelpers';

/**
 * Recommendation engine — a tiny heuristic that picks the single
 * most-relevant "next best action" for the user to resume studying.
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

    // Rule 3 — morning commute → listening.
    if (localHour >= MORNING_COMMUTE_START_H && localHour < MORNING_COMMUTE_END_H) {
      return {
        kind: 'podcast_resume',
        path: '/media',
        seal: '聽',
        count: 0,
        reasonCode: 'morning_commute',
      };
    }

    // Rule 4 — evening → reading.
    if (localHour >= EVENING_READING_START_H && localHour <= EVENING_READING_END_H) {
      return {
        kind: 'reading_continue',
        path: '/reading',
        seal: '讀',
        count: 0,
        reasonCode: 'evening_reading',
      };
    }

    // Rule 5 — resume whatever they were doing last.
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

    // Rule 6 — if there are any reviews at all, promote them.
    if (effectiveDueReviews > 0) {
      return {
        kind: 'review_due_vocab',
        path: '/review',
        seal: '復',
        count: effectiveDueReviews,
        reasonCode: 'due_reviews_any',
      };
    }

    // Rule 7 — nothing specific: suggest exploring new vocab.
    return {
      kind: 'new_vocab',
      path: '/courses',
      seal: '新',
      count: 0,
      reasonCode: 'default_explore',
    };
  },
});
