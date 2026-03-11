import { describe, expect, it } from 'vitest';
import {
  buildEmptyUserStats,
  buildWeeklyActivity,
  createActivitySummaryState,
  recordActivityLog,
  startOfDay,
  startOfWeek,
} from '../../convex/userStatsHelpers';

describe('userStatsHelpers', () => {
  it('returns a stable empty stats contract for logged-out users', () => {
    const stats = buildEmptyUserStats();

    expect(stats).toHaveProperty('weeklyActivity');
    expect(stats).not.toHaveProperty('weeklyMinutes');
    expect(stats.weeklyActivity).toHaveLength(7);
    expect(stats.todayActivities).toEqual({
      wordsLearned: 0,
      readingsCompleted: 0,
      listeningsCompleted: 0,
    });
  });

  it('tracks today counters from today activity only', () => {
    const now = new Date('2026-03-11T10:30:00.000Z').getTime();
    const state = createActivitySummaryState(120, false);
    const todayStart = startOfDay(now);
    const weekStart = startOfWeek(now);

    recordActivityLog(
      state,
      {
        activityType: 'VOCAB',
        createdAt: now,
        duration: 12,
        itemsStudied: 4,
      },
      todayStart,
      weekStart
    );
    recordActivityLog(
      state,
      {
        activityType: 'READING',
        createdAt: now - 60_000,
        duration: 8,
        itemsStudied: 99,
      },
      todayStart,
      weekStart
    );
    recordActivityLog(
      state,
      {
        activityType: 'LISTENING',
        createdAt: now - 120_000,
        duration: 5,
      },
      todayStart,
      weekStart
    );
    recordActivityLog(
      state,
      {
        activityType: 'VOCAB',
        createdAt: todayStart - 1,
        duration: 20,
        itemsStudied: 50,
      },
      todayStart,
      weekStart
    );

    expect(state.todayMinutesRaw).toBe(25);
    expect(state.totalMinutesRaw).toBe(120);
    expect(state.todayActivities).toEqual({
      wordsLearned: 4,
      readingsCompleted: 1,
      listeningsCompleted: 1,
    });

    const weeklyActivity = buildWeeklyActivity(state.weeklyMinutes);
    const wednesday = weeklyActivity.find(day => day.day === 'Wed');
    expect(wednesday?.minutes).toBe(25);
  });

  it('falls back to accumulating total minutes when the user aggregate is missing', () => {
    const now = new Date('2026-03-11T10:30:00.000Z').getTime();
    const state = createActivitySummaryState(0, true);
    const todayStart = startOfDay(now);
    const weekStart = startOfWeek(now);

    recordActivityLog(
      state,
      {
        activityType: 'VOCAB',
        createdAt: now,
        duration: 7,
        itemsStudied: 2,
      },
      todayStart,
      weekStart
    );
    recordActivityLog(
      state,
      {
        activityType: 'READING',
        createdAt: now - 2 * 60_000,
        duration: 3,
      },
      todayStart,
      weekStart
    );

    expect(state.totalMinutesRaw).toBe(10);
  });
});
