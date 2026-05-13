import { mutation, query } from './_generated/server';
import type { Doc } from './_generated/dataModel';
import { v } from 'convex/values';
import { getAuthUserId } from './utils';
import type { LearnerStatsDto, CourseDashboardDto } from './learningStats';
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
  args: {
    courseId: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<LearnerStatsDto> => {
    const userId = await getAuthUserId(ctx).catch(() => null);
    if (!userId) {
      return buildEmptyUserStats();
    }

    const now = Date.now();
    const todayStart = startOfDay(now);
    const weekStart = startOfWeek(now);
    const recentActivityCutoff = todayStart - RECENT_ACTIVITY_WINDOW_DAYS * ONE_DAY_MS;

    const [user, userSettings, courseProgress, vocabProgress, grammarProgress, savedWords, latestLearningEvent] =
      await Promise.all([
        ctx.db.get(userId),
        ctx.db
          .query('user_settings')
          .withIndex('by_user', q => q.eq('userId', userId))
          .first(),
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

    const dailyGoalMinutes = userSettings?.dailyGoalMinutes ?? DAILY_GOAL_MINUTES;

    // 1. Resolve which courses to count for vocab
    const targetCourseIds = args.courseId 
      ? [args.courseId] 
      : courseProgress.map(p => p.courseId);

    // 2. Count total words in these courses from appearances
    const appearances = await Promise.all(
      targetCourseIds.map(courseId => 
        ctx.db.query('vocabulary_appearances')
          .withIndex('by_course_unit', q => q.eq('courseId', courseId))
          .collect()
      )
    );
    const allWordIdsInCourses = new Set(appearances.flat().map(a => String(a.wordId)));
    const totalVocabInCourses = allWordIdsInCourses.size;

    let vocabTotal = 0;
    let dueReviews = 0;
    let dueSoon = 0;
    let masteredWords = 0;
    let todayWordsStudied = 0;
    let progressInTargetCourses = 0;

    for (const progress of vocabProgress) {
      const wordIdStr = String(progress.wordId);
      const isWordInTarget = allWordIdsInCourses.has(wordIdStr);
      
      // If filtering by specific course, skip words not in that course
      if (args.courseId && !isWordInTarget) continue;
      
      if (isWordInTarget) progressInTargetCourses += 1;

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

    const unlearnedCount = Math.max(0, totalVocabInCourses - progressInTargetCourses);

    let grammarTotal = 0;
    let masteredGrammar = 0;
    let todayGrammarStudied = 0;
    for (const progress of grammarProgress) {
      // courseId field check - note: user_grammar_progress may not have courseId
      // Filtering is done based on the progress data available
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
      courseIds.map(async courseId => {
        // 1. Try legacy ID
        const byId = await ctx.db
          .query('institutes')
          .withIndex('by_legacy_id', q => q.eq('id', courseId))
          .first();
        if (byId) return byId;
        
        // 2. Try Convex _id
        const normalizedId = ctx.db.normalizeId('institutes', courseId);
        if (normalizedId) {
          try {
            return await ctx.db.get(normalizedId);
          } catch {
            return null;
          }
        }
        return null;
      })
    );
    const institutesMap = new Map(
      institutesArray.filter((i): i is Doc<'institutes'> => !!i && 'name' in i).map(institute => [institute.id || String(institute._id), institute])
    );
    // Also map by _id for robust lookup
    institutesArray.filter((i): i is Doc<'institutes'> => !!i && 'name' in i).forEach(inst => {
      institutesMap.set(String(inst._id), inst);
    });

    const courseDetails = courseProgress.map(progress => {
      const institute = institutesMap.get(progress.courseId);
      
      // Smart level resolution
      let level = institute?.displayLevel || institute?.volume;
      if (!level && institute?.levels?.[0]) {
        const firstLevel = institute.levels[0];
        level = typeof firstLevel === 'object' ? String(firstLevel.level) : String(firstLevel);
      }

      // AGGRESSIVE Formatting: 🧪 Name (Level级 Volume)
      let fullName = institute?.name || progress.courseId;
      const dLevel = institute?.displayLevel;
      const dVol = institute?.volume;
      
      if (dLevel || dVol) {
        fullName += " (";
        if (dLevel) fullName += `${dLevel}级`;
        if (dLevel && dVol) fullName += " ";
        if (dVol) fullName += dVol;
        fullName += ")";
      }
      fullName = `🧪 ${fullName}`;

      return {
        courseId: progress.courseId,
        courseName: fullName,
        displayLevel: level,
        volume: institute?.volume,
        completedUnits: (progress.completedUnits || []).length,
        totalUnits: institute?.totalUnits || 0,
        lastAccessAt: new Date(progress.lastAccessAt || now).toISOString(),
      };
    });
    const recentCourse = courseProgress
      .slice()
      .sort((left, right) => (right.lastAccessAt || 0) - (left.lastAccessAt || 0))[0];

    const formatInstituteName = (id: string) => {
      const inst = institutesMap.get(id);
      if (!inst) return id;
      let name = inst.name;
      if (inst.displayLevel || inst.volume) {
        name += " (";
        if (inst.displayLevel) name += ` ${inst.displayLevel}级`;
        if (inst.displayLevel && inst.volume) name += " ";
        if (inst.volume) name += inst.volume;
        name += ")";
      }
      return `🧪 ${name}`;
    };

    const currentProgress = buildCurrentProgress(
      user?.lastInstitute
        ? {
            instituteId: user.lastInstitute,
            instituteName: formatInstituteName(user.lastInstitute),
            level: user.lastLevel ?? null,
            unit: user.lastUnit ?? null,
            module: normalizeLastModuleValue(user.lastModule) ?? null,
          }
        : recentCourse
          ? {
              instituteId: recentCourse.courseId,
              instituteName: formatInstituteName(recentCourse.courseId),
              level: user?.lastLevel ?? null,
              unit: recentCourse.lastUnitIndex ?? null,
              module: normalizeLastModuleValue(user?.lastModule) ?? 'READING',
            }
          : null
    );

    const todayMinutes = roundMetric(activitySummary.todayMinutesRaw);
    const totalMinutes = roundMetric(activitySummary.totalMinutesRaw);

    return {
      streak,
      weeklyActivity: buildWeeklyActivity(activitySummary.weeklyMinutes),
      todayMinutes,
      dailyGoal: dailyGoalMinutes,
      dailyProgress: Math.min(Math.round((todayMinutes / dailyGoalMinutes) * 100), 100),
      todayActivities: activitySummary.todayActivities,
      courseProgress: courseDetails,
      currentProgress,
      totalWordsLearned: masteredWords,
      totalGrammarLearned: masteredGrammar,
      wordsToReview: dueReviews,
      vocabStats: {
        total: vocabTotal,
        dueReviews,
        unlearned: unlearnedCount,
        mastered: masteredWords,
      },
      grammarStats: {
        total: grammarTotal,
        mastered: masteredGrammar,
      },
      reviewStats: buildReviewStats({
        dueNow: dueReviews,
        dueSoon,
        savedWords: savedWords.length,
        unlearned: unlearnedCount,
      }),
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

export const getCourseDashboard = query({
  args: {},
  handler: async (ctx): Promise<CourseDashboardDto> => {
    const userId = await getAuthUserId(ctx).catch(() => null);
    if (!userId) {
      return {
        currentCourse: null,
        enrolledCourses: [],
        journeyUnits: [],
        stats: {
          streak: 0,
          weeklyActivity: buildWeeklyActivity([0, 0, 0, 0, 0, 0, 0]),
          totalMinutes: 0,
        },
      };
    }

    const now = Date.now();
    const todayStart = startOfDay(now);
    const weekStart = startOfWeek(now);

    const [user, courseProgress, latestLearningEvent] = await Promise.all([
      ctx.db.get(userId),
      ctx.db
        .query('user_course_progress')
        .withIndex('by_user', q => q.eq('userId', userId))
        .collect(),
      ctx.db
        .query('learning_events')
        .withIndex('by_user_eventAt', q => q.eq('userId', userId))
        .order('desc')
        .take(1),
    ]);

    // 1. Resolve Streak and Weekly Activity
    const activitySummary = createActivitySummaryState(
      user?.totalStudyMinutes ?? 0,
      user?.totalStudyMinutes === undefined
    );
    let eventCursor: string | null = null;
    let streakResolved = false;
    let streak = 0;

    if (latestLearningEvent.length > 0) {
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
        eventCursor =
          page.isDone || (streakResolved && activitySummary.oldestSeenDay < todayStart - 7 * ONE_DAY_MS)
            ? null
            : page.continueCursor;
      } while (eventCursor);
    }
    if (!streakResolved) streak = computeStreak(activitySummary.activeDays, todayStart);

    // 2. Resolve Course Data
    const recentCourseProgress = courseProgress
      .slice()
      .sort((a, b) => (b.lastAccessAt || 0) - (a.lastAccessAt || 0));
    const activeCourseId = user?.lastInstitute || recentCourseProgress[0]?.courseId;

    const enrolledCourses = await Promise.all(
      recentCourseProgress.map(async p => {
        // Robust lookup
        let institute = await ctx.db
          .query('institutes')
          .withIndex('by_legacy_id', q => q.eq('id', p.courseId))
          .first();
        if (!institute) {
          const normalizedId = ctx.db.normalizeId('institutes', p.courseId);
          if (normalizedId) {
            try { 
              const result = await ctx.db.get(normalizedId);
              if (result && 'name' in result) {
                institute = result;
              }
            } catch { /* ignore */ }
          }
        }

        let level = institute?.displayLevel || institute?.volume;
        if (!level && institute?.levels?.[0]) {
          const firstLevel = institute.levels[0];
          level = typeof firstLevel === 'object' ? String(firstLevel.level) : String(firstLevel);
        }

        // Format name like "Name Level级 Volume"
        let fullName = institute?.name || p.courseId;
        if (institute?.displayLevel) fullName += ` ${institute.displayLevel}级`;
        if (institute?.volume) fullName += ` ${institute.volume}`;

        return {
          id: p.courseId,
          name: fullName,
          displayLevel: level || '',
          completedUnitsCount: (p.completedUnits || []).length,
          totalUnits: institute?.totalUnits || 10,
          lastAccessAt: p.lastAccessAt,
        };
      })
    );

    let currentCourse: {
      id: string;
      name: string;
      displayLevel: string;
      totalUnits: number;
      completedUnitsCount: number;
      currentUnitIndex: number;
      coverUrl: string | undefined;
      publisher: string | undefined;
      totalStudyMinutes: number;
    } | null = null;
    let journeyUnits: Array<{
      unitIndex: number;
      title: string;
      isCompleted: boolean;
      isCurrent: boolean;
    }> = [];

    if (activeCourseId) {
      const institute = await ctx.db
        .query('institutes')
        .withIndex('by_legacy_id', q => q.eq('id', activeCourseId))
        .first();
      if (institute) {
        const progress = recentCourseProgress.find(p => p.courseId === activeCourseId);
        const currentUnitIndex = progress?.lastUnitIndex ?? user?.lastUnit ?? 1;

        let level = institute.displayLevel || institute.volume;
        if (!level && institute.levels?.[0]) {
          const firstLevel = institute.levels[0];
          level = typeof firstLevel === 'object' ? String(firstLevel.level) : String(firstLevel);
        }

        // Format name like "Name Level级 Volume"
        let fullName = institute.name;
        if (institute.displayLevel) fullName += ` ${institute.displayLevel}级`;
        if (institute.volume) fullName += ` ${institute.volume}`;

        currentCourse = {
          id: activeCourseId,
          name: fullName,
          displayLevel: level || '',
          totalUnits: institute.totalUnits || 10,
          completedUnitsCount: (progress?.completedUnits || []).length,
          currentUnitIndex,
          coverUrl: institute.coverUrl,
          publisher: institute.publisher,
          totalStudyMinutes: roundMetric(activitySummary.totalMinutesRaw),
        };

        const units = await ctx.db
          .query('textbook_units')
          .withIndex('by_course', q => q.eq('courseId', activeCourseId))
          .collect();
        const sortedUnits = units.sort((a, b) => a.unitIndex - b.unitIndex);

        // Window of 8 units around current
        const start = Math.max(0, currentUnitIndex - 4);
        const window = sortedUnits.slice(start, start + 8);

        journeyUnits = window.map(u => ({
          unitIndex: u.unitIndex,
          title: u.title,
          isCompleted: (progress?.completedUnits || []).includes(u.unitIndex),
          isCurrent: u.unitIndex === currentUnitIndex,
        }));
        
        // Fallback if journeyUnits is empty (e.g. no units found in DB)
        if (journeyUnits.length === 0) {
           journeyUnits = Array.from({ length: 8 }, (_, i) => ({
             unitIndex: i + 1,
             title: `Unit ${i + 1}`,
             isCompleted: i + 1 < currentUnitIndex,
             isCurrent: i + 1 === currentUnitIndex,
           }));
        }
      }
    }

    return {
      currentCourse,
      enrolledCourses,
      journeyUnits,
      stats: {
        streak,
        weeklyActivity: buildWeeklyActivity(activitySummary.weeklyMinutes),
        totalMinutes: roundMetric(activitySummary.totalMinutesRaw),
      },
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
