import type { LearningModule } from './analytics';
import type {
  CurrentProgressDto,
  LearnerStatsDto,
  ModuleBreakdownPoint,
  RecentLearningSessionDto,
  ReviewStatsDto,
  TodayActivities,
} from './learningStats';

export const DAILY_GOAL_MINUTES = 30;
export const ONE_DAY_MS = 24 * 60 * 60 * 1000;
export const SCAN_PAGE_SIZE = 250;
export const RECENT_ACTIVITY_WINDOW_DAYS = 35;
export const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export type ActivityLogLike = {
  activityType: string;
  createdAt: number;
  duration?: number;
  itemsStudied?: number;
};

export type LearningEventLike = {
  sessionId: string;
  module: LearningModule;
  eventName: string;
  eventAt: number;
  durationSec?: number;
  itemCount?: number;
  score?: number;
  accuracy?: number;
  result?: string;
  courseId?: string;
  unitId?: number;
  contentId?: string;
};

export type ActivitySummaryState = {
  weeklyMinutes: number[];
  activeDays: Set<number>;
  todayActivities: TodayActivities;
  todayMinutesRaw: number;
  totalMinutesRaw: number;
  needsTotalMinutesFallback: boolean;
  oldestSeenDay: number;
  moduleMinutes: Record<LearningModule, number>;
  moduleSessions: Record<LearningModule, Set<string>>;
  recentSessions: RecentLearningSessionDto[];
};

export function roundMetric(value: number, decimals = 2): number {
  if (!Number.isFinite(value)) return 0;
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

export function startOfDay(timestamp: number): number {
  const date = new Date(timestamp);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

export function startOfWeek(timestamp: number): number {
  const date = new Date(timestamp);
  const day = date.getDay() || 7;
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - (day - 1));
  return date.getTime();
}

export function buildEmptyUserStats(): LearnerStatsDto {
  return {
    streak: 0,
    weeklyActivity: WEEKDAY_LABELS.map(day => ({ day, minutes: 0 })),
    todayMinutes: 0,
    dailyGoal: DAILY_GOAL_MINUTES,
    dailyProgress: 0,
    todayActivities: {
      wordsLearned: 0,
      readingsCompleted: 0,
      listeningsCompleted: 0,
      examsCompleted: 0,
    },
    courseProgress: [],
    currentProgress: null,
    totalWordsLearned: 0,
    totalGrammarLearned: 0,
    wordsToReview: 0,
    vocabStats: { total: 0, dueReviews: 0, mastered: 0 },
    grammarStats: { total: 0, mastered: 0 },
    reviewStats: { dueNow: 0, dueSoon: 0, savedWords: 0 },
    moduleBreakdown: [],
    recentSessions: [],
    totalMinutes: 0,
    todayWordsStudied: 0,
    todayGrammarStudied: 0,
  };
}

export function computeStreak(activeDays: Set<number>, todayStart: number): number {
  const yesterdayStart = todayStart - ONE_DAY_MS;
  const anchor = activeDays.has(todayStart)
    ? todayStart
    : activeDays.has(yesterdayStart)
      ? yesterdayStart
      : null;

  if (anchor === null) return 0;

  let streak = 0;
  let day = anchor;
  while (activeDays.has(day)) {
    streak += 1;
    day -= ONE_DAY_MS;
  }
  return streak;
}

export function canResolveStreak(
  activeDays: Set<number>,
  oldestSeenDay: number,
  todayStart: number
): boolean {
  const yesterdayStart = todayStart - ONE_DAY_MS;

  if (!activeDays.has(todayStart) && !activeDays.has(yesterdayStart)) {
    return oldestSeenDay < yesterdayStart;
  }

  const anchor = activeDays.has(todayStart) ? todayStart : yesterdayStart;
  const streak = computeStreak(activeDays, todayStart);
  const firstMissingDay = anchor - streak * ONE_DAY_MS;
  return oldestSeenDay < firstMissingDay;
}

export function createActivitySummaryState(
  initialTotalMinutes: number,
  needsTotalMinutesFallback: boolean
): ActivitySummaryState {
  return {
    weeklyMinutes: [0, 0, 0, 0, 0, 0, 0],
    activeDays: new Set<number>(),
    todayActivities: {
      wordsLearned: 0,
      readingsCompleted: 0,
      listeningsCompleted: 0,
      examsCompleted: 0,
    },
    todayMinutesRaw: 0,
    totalMinutesRaw: initialTotalMinutes,
    needsTotalMinutesFallback,
    oldestSeenDay: Number.POSITIVE_INFINITY,
    moduleMinutes: {
      VOCAB: 0,
      READING: 0,
      LISTENING: 0,
      GRAMMAR: 0,
      EXAM: 0,
      PODCAST: 0,
      TYPING: 0,
    },
    moduleSessions: {
      VOCAB: new Set<string>(),
      READING: new Set<string>(),
      LISTENING: new Set<string>(),
      GRAMMAR: new Set<string>(),
      EXAM: new Set<string>(),
      PODCAST: new Set<string>(),
      TYPING: new Set<string>(),
    },
    recentSessions: [],
  };
}

export function recordActivityLog(
  state: ActivitySummaryState,
  log: ActivityLogLike,
  todayStart: number,
  weekStart: number
) {
  const logDay = startOfDay(log.createdAt);
  state.oldestSeenDay = Math.min(state.oldestSeenDay, logDay);
  state.activeDays.add(logDay);

  const minutes = Math.max(0, log.duration || 0);
  if (state.needsTotalMinutesFallback) {
    state.totalMinutesRaw += minutes;
  }

  if (log.createdAt >= todayStart) {
    state.todayMinutesRaw += minutes;
    switch (log.activityType) {
      case 'VOCAB':
        state.todayActivities.wordsLearned += Math.max(0, log.itemsStudied || 0);
        break;
      case 'READING':
        state.todayActivities.readingsCompleted += 1;
        break;
      case 'LISTENING':
        state.todayActivities.listeningsCompleted += 1;
        break;
      default:
        break;
    }
  }

  if (log.createdAt >= weekStart) {
    const weekdayIndex = new Date(log.createdAt).getDay();
    const normalizedIndex = weekdayIndex === 0 ? 6 : weekdayIndex - 1;
    state.weeklyMinutes[normalizedIndex] += minutes;
  }
}

export function buildWeeklyActivity(weeklyMinutes: number[]) {
  return WEEKDAY_LABELS.map((day, index) => ({
    day,
    minutes: roundMetric(weeklyMinutes[index] || 0),
  }));
}

export function recordLearningEvent(
  state: ActivitySummaryState,
  event: LearningEventLike,
  todayStart: number,
  weekStart: number
) {
  const eventDay = startOfDay(event.eventAt);
  state.oldestSeenDay = Math.min(state.oldestSeenDay, eventDay);
  state.activeDays.add(eventDay);

  const minutes = Math.max(0, (event.durationSec || 0) / 60);
  if (state.needsTotalMinutesFallback) {
    state.totalMinutesRaw += minutes;
  }
  state.moduleMinutes[event.module] += minutes;
  state.moduleSessions[event.module].add(event.sessionId);

  if (event.eventAt >= todayStart) {
    state.todayMinutesRaw += minutes;
    if (event.module === 'VOCAB') {
      state.todayActivities.wordsLearned += Math.max(0, event.itemCount || 0);
    } else if (event.module === 'READING') {
      if (event.eventName === 'content_completed') {
        state.todayActivities.readingsCompleted += 1;
      }
    } else if (event.module === 'LISTENING') {
      if (event.eventName === 'content_completed') {
        state.todayActivities.listeningsCompleted += 1;
      }
    } else if (event.module === 'EXAM') {
      if (event.eventName === 'exam_submitted' || event.eventName === 'exam_auto_submitted') {
        state.todayActivities.examsCompleted += 1;
      }
    }
  }

  if (event.eventAt >= weekStart) {
    const weekdayIndex = new Date(event.eventAt).getDay();
    const normalizedIndex = weekdayIndex === 0 ? 6 : weekdayIndex - 1;
    state.weeklyMinutes[normalizedIndex] += minutes;
  }

  if (
    state.recentSessions.length < 5 &&
    (event.eventName.endsWith('completed') ||
      event.eventName === 'exam_submitted' ||
      event.eventName === 'exam_auto_submitted' ||
      event.eventName === 'session_progress')
  ) {
    state.recentSessions.push({
      sessionId: event.sessionId,
      module: event.module,
      eventName: event.eventName,
      courseId: event.courseId || null,
      unitId: event.unitId ?? null,
      contentId: event.contentId || null,
      durationSec: Math.max(0, event.durationSec || 0),
      itemCount: Math.max(0, event.itemCount || 0),
      score: typeof event.score === 'number' ? roundMetric(event.score) : null,
      accuracy: typeof event.accuracy === 'number' ? roundMetric(event.accuracy) : null,
      result: event.result || null,
      eventAt: event.eventAt,
    });
  }
}

export function buildModuleBreakdown(
  moduleMinutes: Record<LearningModule, number>,
  moduleSessions: Record<LearningModule, Set<string>>
): ModuleBreakdownPoint[] {
  return Object.entries(moduleMinutes)
    .map(([module, minutes]) => ({
      module: module as LearningModule,
      minutes: roundMetric(minutes),
      sessions: moduleSessions[module as LearningModule].size,
    }))
    .filter(item => item.minutes > 0 || item.sessions > 0)
    .sort((left, right) => right.minutes - left.minutes);
}

export function buildReviewStats(reviewStats: ReviewStatsDto): ReviewStatsDto {
  return reviewStats;
}

export function buildCurrentProgress(
  currentProgress: CurrentProgressDto | null
): CurrentProgressDto | null {
  return currentProgress;
}
