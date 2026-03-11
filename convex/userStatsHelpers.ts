export const DAILY_GOAL_MINUTES = 30;
export const ONE_DAY_MS = 24 * 60 * 60 * 1000;
export const SCAN_PAGE_SIZE = 250;
export const RECENT_ACTIVITY_WINDOW_DAYS = 35;
export const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export type TodayActivities = {
  wordsLearned: number;
  readingsCompleted: number;
  listeningsCompleted: number;
};

export type ActivityLogLike = {
  activityType: string;
  createdAt: number;
  duration?: number;
  itemsStudied?: number;
};

export type ActivitySummaryState = {
  weeklyMinutes: number[];
  activeDays: Set<number>;
  todayActivities: TodayActivities;
  todayMinutesRaw: number;
  totalMinutesRaw: number;
  needsTotalMinutesFallback: boolean;
  oldestSeenDay: number;
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

export function buildEmptyUserStats() {
  return {
    streak: 0,
    weeklyActivity: WEEKDAY_LABELS.map(day => ({ day, minutes: 0 })),
    todayMinutes: 0,
    dailyGoal: DAILY_GOAL_MINUTES,
    dailyProgress: 0,
    todayActivities: { wordsLearned: 0, readingsCompleted: 0, listeningsCompleted: 0 },
    courseProgress: [],
    currentProgress: null,
    totalWordsLearned: 0,
    totalGrammarLearned: 0,
    wordsToReview: 0,
    vocabStats: { total: 0, dueReviews: 0, mastered: 0 },
    grammarStats: { total: 0, mastered: 0 },
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
    todayActivities: { wordsLearned: 0, readingsCompleted: 0, listeningsCompleted: 0 },
    todayMinutesRaw: 0,
    totalMinutesRaw: initialTotalMinutes,
    needsTotalMinutesFallback,
    oldestSeenDay: Number.POSITIVE_INFINITY,
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
