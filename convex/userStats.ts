import { mutation, query } from './_generated/server';
import { v } from 'convex/values';
import { getAuthUserId } from './utils';
import type { LearnerStatsDto } from './learningStats';
import {
  appendActivitySummary,
  normalizeLastModuleValue,
  normalizeLearningModule,
} from './analytics';
import {
  DAILY_GOAL_MINUTES,
  ONE_DAY_MS,
  RECENT_ACTIVITY_WINDOW_DAYS,
  SCAN_PAGE_SIZE,
  buildCurrentProgress,
  buildEmptyUserStats,
  buildModuleBreakdown,
  buildReviewStats,
  buildWeeklyActivity,
  canResolveStreak,
  computeStreak,
  createActivitySummaryState,
  recordActivityLog,
  recordLearningEvent,
  roundMetric,
  startOfDay,
  startOfWeek,
} from './userStatsHelpers';

export const getStats = query({
  args: {},
  handler: async (ctx): Promise<LearnerStatsDto> => {
    const userId = await getAuthUserId(ctx).catch(() => null);
    if (!userId) {
      return buildEmptyUserStats();
    }

    const now = Date.now();
    const todayStart = startOfDay(now);
    const weekStart = startOfWeek(now);
    const recentActivityCutoff = todayStart - RECENT_ACTIVITY_WINDOW_DAYS * ONE_DAY_MS;

    const [user, courseProgress, vocabProgress, grammarProgress, savedWords, latestLearningEvent] =
      await Promise.all([
        ctx.db.get(userId),
        ctx.db
          .query('user_course_progress')
          .withIndex('by_user', q => q.eq('userId', userId))
          .collect(),
        ctx.db
          .query('user_vocab_progress')
          .withIndex('by_user', q => q.eq('userId', userId))
          .collect(),
        ctx.db
          .query('user_grammar_progress')
          .withIndex('by_user_grammar', q => q.eq('userId', userId))
          .collect(),
        ctx.db
          .query('saved_words')
          .withIndex('by_user', q => q.eq('userId', userId))
          .collect(),
        ctx.db
          .query('learning_events')
          .withIndex('by_user_eventAt', q => q.eq('userId', userId))
          .order('desc')
          .take(1),
      ]);

    let vocabTotal = 0;
    let dueReviews = 0;
    let dueSoon = 0;
    let masteredWords = 0;
    let todayWordsStudied = 0;
    for (const progress of vocabProgress) {
      vocabTotal += 1;
      const dueAt = progress.nextReviewAt ?? progress.due;
      if (dueAt && dueAt <= now) {
        dueReviews += 1;
      } else if (dueAt && dueAt <= now + ONE_DAY_MS) {
        dueSoon += 1;
      }
      if (progress.status === 'MASTERED') {
        masteredWords += 1;
      }
      if ((progress.lastReviewedAt ?? progress.last_review ?? 0) >= todayStart) {
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
      if ((progress.lastStudiedAt ?? 0) >= todayStart) {
        todayGrammarStudied += 1;
      }
    }

    const hasLearningEvents = latestLearningEvent.length > 0;
    const activitySummary = createActivitySummaryState(
      user?.totalStudyMinutes ?? 0,
      user?.totalStudyMinutes === undefined
    );
    let streakResolved = false;
    let streak = 0;

    if (hasLearningEvents) {
      let eventCursor: string | null = null;
      do {
        const page = await ctx.db
          .query('learning_events')
          .withIndex('by_user_eventAt', q => q.eq('userId', userId))
          .order('desc')
          .paginate({ cursor: eventCursor, numItems: SCAN_PAGE_SIZE });

        for (const event of page.page) {
          recordLearningEvent(
            activitySummary,
            {
              sessionId: event.sessionId,
              module: normalizeLearningModule(event.module),
              eventName: event.eventName,
              eventAt: event.eventAt,
              durationSec: event.durationSec,
              itemCount: event.itemCount,
              score: event.score,
              accuracy: event.accuracy,
              result: event.result,
              courseId: event.courseId,
              unitId: event.unitId,
              contentId: event.contentId,
            },
            todayStart,
            weekStart
          );
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
        eventCursor = page.isDone || canStopEarly ? null : page.continueCursor;
      } while (eventCursor);
    } else {
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
    }

    if (!streakResolved) {
      streak = computeStreak(activitySummary.activeDays, todayStart);
    }

    const courseIds = [
      ...new Set(
        [user?.lastInstitute || '', ...courseProgress.map(progress => progress.courseId)].filter(
          Boolean
        )
      ),
    ];
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
    const recentCourse = courseProgress
      .slice()
      .sort((left, right) => (right.lastAccessAt || 0) - (left.lastAccessAt || 0))[0];

    const currentProgress = buildCurrentProgress(
      user?.lastInstitute
        ? {
            instituteId: user.lastInstitute,
            instituteName: institutesMap.get(user.lastInstitute)?.name || user.lastInstitute,
            level: user.lastLevel ?? null,
            unit: user.lastUnit ?? null,
            module: normalizeLastModuleValue(user.lastModule) ?? null,
          }
        : recentCourse
          ? {
              instituteId: recentCourse.courseId,
              instituteName:
                institutesMap.get(recentCourse.courseId)?.name || recentCourse.courseId,
              level: user?.lastLevel ?? null,
              unit: recentCourse.lastUnitIndex ?? null,
              module: normalizeLastModuleValue(user?.lastModule) ?? 'READING',
            }
          : null
    );

    const todayMinutes = roundMetric(activitySummary.todayMinutesRaw);
    const totalMinutes = roundMetric(activitySummary.totalMinutesRaw);
    const reviewStats = buildReviewStats({
      dueNow: dueReviews,
      dueSoon,
      savedWords: savedWords.length,
    });

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
      reviewStats,
      moduleBreakdown: buildModuleBreakdown(
        activitySummary.moduleMinutes,
        activitySummary.moduleSessions
      ),
      recentSessions: activitySummary.recentSessions,
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
    sessionId: v.optional(v.string()),
    surface: v.optional(v.string()),
    courseId: v.optional(v.string()),
    unitId: v.optional(v.number()),
    contentId: v.optional(v.string()),
    score: v.optional(v.number()),
    accuracy: v.optional(v.number()),
    result: v.optional(v.string()),
    source: v.optional(v.string()),
    metadata: v.optional(v.record(v.string(), v.union(v.string(), v.number(), v.boolean()))),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    await appendActivitySummary(ctx, userId, {
      sessionId: args.sessionId || `legacy-${args.activityType.toLowerCase()}-${Date.now()}`,
      module: normalizeLearningModule(args.activityType),
      surface: args.surface,
      courseId: args.courseId,
      unitId: args.unitId,
      contentId: args.contentId,
      durationSec: Math.max(0, (args.duration || 0) * 60),
      itemCount: args.itemsStudied,
      score: args.score,
      accuracy: args.accuracy,
      result: args.result,
      source: args.source || 'legacy_activity',
      metadata: args.metadata,
      eventAt: Date.now(),
    });
    return { success: true };
  },
});
