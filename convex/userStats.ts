import { mutation, query } from './_generated/server';
import { ConvexError, v } from 'convex/values';
import { getAuthUserId } from './utils';
import {
  DAILY_GOAL_MINUTES,
  ONE_DAY_MS,
  RECENT_ACTIVITY_WINDOW_DAYS,
  SCAN_PAGE_SIZE,
  buildEmptyUserStats,
  buildWeeklyActivity,
  canResolveStreak,
  computeStreak,
  createActivitySummaryState,
  recordActivityLog,
  roundMetric,
  startOfDay,
  startOfWeek,
} from './userStatsHelpers';

const buildLastActivityPatch = (activityType: string, nowMs: number) => ({
  lastActivityAt: nowMs,
  lastActivityType: activityType,
});

export const getStats = query({
  args: {},
  handler: async ctx => {
    const userId = await getAuthUserId(ctx).catch(() => null);
    if (!userId) {
      return buildEmptyUserStats();
    }

    const now = Date.now();
    const todayStart = startOfDay(now);
    const weekStart = startOfWeek(now);
    const recentActivityCutoff = todayStart - RECENT_ACTIVITY_WINDOW_DAYS * ONE_DAY_MS;

    const [user, courseProgress] = await Promise.all([
      ctx.db.get(userId),
      ctx.db
        .query('user_course_progress')
        .withIndex('by_user', q => q.eq('userId', userId))
        .collect(),
    ]);

    const [vocabProgress, grammarProgress] = await Promise.all([
      ctx.db
        .query('user_vocab_progress')
        .withIndex('by_user', q => q.eq('userId', userId))
        .collect(),
      ctx.db
        .query('user_grammar_progress')
        .withIndex('by_user_grammar', q => q.eq('userId', userId))
        .collect(),
    ]);

    let vocabTotal = 0;
    let dueReviews = 0;
    let masteredWords = 0;
    let todayWordsStudied = 0;
    for (const progress of vocabProgress) {
      vocabTotal += 1;
      if (progress.nextReviewAt && progress.nextReviewAt <= now) {
        dueReviews += 1;
      }
      if (progress.status === 'MASTERED') {
        masteredWords += 1;
      }
      if (progress.lastReviewedAt && progress.lastReviewedAt >= todayStart) {
        todayWordsStudied += 1;
      }
    }

    let grammarTotal = 0;
    let masteredGrammar = 0;
    let todayGrammarStudied = 0;
    for (const progress of grammarProgress) {
      grammarTotal += 1;
      if (progress.status === 'MASTERED') {
        masteredGrammar += 1;
      }
      if (progress.lastStudiedAt >= todayStart) {
        todayGrammarStudied += 1;
      }
    }

    const activitySummary = createActivitySummaryState(
      user?.totalStudyMinutes ?? 0,
      user?.totalStudyMinutes === undefined
    );
    let streakResolved = false;
    let streak = 0;
    let activityCursor: string | null = null;

    do {
      const page = await ctx.db
        .query('activity_logs')
        .withIndex('by_user', q => q.eq('userId', userId))
        .order('desc')
        .paginate({ cursor: activityCursor, numItems: SCAN_PAGE_SIZE });

      for (const log of page.page) {
        recordActivityLog(activitySummary, log, todayStart, weekStart);
      }

      if (
        (page.isDone ||
          canResolveStreak(
            activitySummary.activeDays,
            activitySummary.oldestSeenDay,
            todayStart
          )) &&
        !streakResolved
      ) {
        streak = computeStreak(activitySummary.activeDays, todayStart);
        streakResolved = true;
      }

      const recentWindowCovered =
        activitySummary.oldestSeenDay < recentActivityCutoff || page.isDone;
      const canStopEarly =
        recentWindowCovered && streakResolved && !activitySummary.needsTotalMinutesFallback;
      activityCursor = page.isDone || canStopEarly ? null : page.continueCursor;
    } while (activityCursor);

    if (!streakResolved) {
      streak = computeStreak(activitySummary.activeDays, todayStart);
    }

    const courseIds = [...new Set(courseProgress.map(progress => progress.courseId))];
    const institutesArray = await Promise.all(
      courseIds.map(courseId =>
        ctx.db
          .query('institutes')
          .withIndex('by_legacy_id', q => q.eq('id', courseId))
          .first()
      )
    );
    const institutesMap = new Map(
      institutesArray.filter(Boolean).map(institute => [institute!.id, institute!])
    );

    const courseDetails = courseProgress.map(progress => {
      const institute = institutesMap.get(progress.courseId);

      return {
        courseId: progress.courseId,
        courseName: institute?.name || progress.courseId,
        completedUnits: (progress.completedUnits || []).length,
        totalUnits: institute?.totalUnits || 0,
        lastAccessAt: new Date(progress.lastAccessAt || now).toISOString(),
      };
    });

    let currentProgress = null;
    if (courseDetails.length > 0) {
      const recentCourse = [...courseDetails].sort(
        (left, right) =>
          new Date(right.lastAccessAt).getTime() - new Date(left.lastAccessAt).getTime()
      )[0];

      currentProgress = {
        instituteName: recentCourse.courseName,
        level: 1,
        unit: recentCourse.completedUnits + 1,
        module: 'vocab',
      };
    }

    const todayMinutes = roundMetric(activitySummary.todayMinutesRaw);
    const totalMinutes = roundMetric(activitySummary.totalMinutesRaw);

    return {
      streak,
      weeklyActivity: buildWeeklyActivity(activitySummary.weeklyMinutes),
      todayMinutes,
      dailyGoal: DAILY_GOAL_MINUTES,
      dailyProgress: Math.min(Math.round((todayMinutes / DAILY_GOAL_MINUTES) * 100), 100),
      todayActivities: activitySummary.todayActivities,
      courseProgress: courseDetails,
      currentProgress,
      totalWordsLearned: masteredWords,
      totalGrammarLearned: masteredGrammar,
      wordsToReview: dueReviews,
      vocabStats: {
        total: vocabTotal,
        dueReviews,
        mastered: masteredWords,
      },
      grammarStats: {
        total: grammarTotal,
        mastered: masteredGrammar,
      },
      totalMinutes,
      todayWordsStudied,
      todayGrammarStudied,
    };
  },
});

export const logActivity = mutation({
  args: {
    activityType: v.string(),
    duration: v.optional(v.number()),
    itemsStudied: v.optional(v.number()),
    metadata: v.optional(v.record(v.string(), v.union(v.string(), v.number(), v.boolean()))),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    const user = await ctx.db.get(userId);
    if (!user) {
      throw new ConvexError({ code: 'USER_NOT_FOUND' });
    }

    const minutes = Math.max(0, args.duration || 0);
    const now = Date.now();

    await ctx.db.insert('activity_logs', {
      userId,
      activityType: args.activityType,
      duration: minutes,
      itemsStudied: args.itemsStudied || 0,
      metadata: args.metadata,
      createdAt: now,
    });

    await ctx.db.patch(userId, {
      totalStudyMinutes: (user.totalStudyMinutes || 0) + minutes,
      ...buildLastActivityPatch(args.activityType, now),
    });

    return { success: true };
  },
});
