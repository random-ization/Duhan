import { describe, expect, it } from 'vitest';
import {
  ACHIEVEMENT_CATALOG,
  buildAchievementOverview,
  type AchievementProgressSnapshot,
} from '../../convex/achievementCatalog';

const emptyProgress: AchievementProgressSnapshot = {
  streakDays: 0,
  vocabCount: 0,
  grammarCount: 0,
  listeningMinutes: 0,
  typingWpm: 0,
  topikPassedCount: 0,
  topikHighScoreCount: 0,
  friendCount: 0,
  groupJoinedCount: 0,
  groupCreatedCount: 0,
};

describe('achievement catalog', () => {
  it('keeps a stable first-version badge count and unique badge IDs', () => {
    const ids = ACHIEVEMENT_CATALOG.map(rule => rule.id);
    expect(ACHIEVEMENT_CATALOG).toHaveLength(22);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ACHIEVEMENT_CATALOG.every(rule => rule.rewardXp > 0)).toBe(true);
  });

  it('returns a locked grid overview when the user has no achievements', () => {
    const overview = buildAchievementOverview({
      progress: emptyProgress,
      unlockedByBadgeId: new Map(),
    });

    expect(overview.unlockedCount).toBe(0);
    expect(overview.totalCount).toBe(22);
    expect(overview.progressPct).toBe(0);
    expect(overview.sections[0].category).toBe('STREAK');
    expect(overview.sections[0].badges.every(badge => !badge.isUnlocked)).toBe(true);
  });

  it('marks unlocked and locked badges from progress plus stored unlock rows', () => {
    const progress: AchievementProgressSnapshot = {
      ...emptyProgress,
      streakDays: 30,
      vocabCount: 120,
    };
    const overview = buildAchievementOverview({
      progress,
      unlockedByBadgeId: new Map([
        ['streak_7', { unlockedAt: 1000, isNew: false }],
        ['streak_14', { unlockedAt: 2000, isNew: true }],
        ['vocab_100', { unlockedAt: 3000, isNew: false }],
      ]),
    });

    expect(overview.unlockedCount).toBe(3);
    expect(overview.progressPct).toBe(14);
    expect(overview.sections.find(section => section.category === 'STREAK')?.unlockedCount).toBe(2);
    expect(overview.sections.find(section => section.category === 'VOCAB')?.unlockedCount).toBe(1);
    expect(
      overview.sections
        .flatMap(section => section.badges)
        .find(badge => badge.badgeId === 'streak_14')?.isNew
    ).toBe(true);
  });
});
