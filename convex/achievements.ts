import { type FunctionReference, makeFunctionReference } from 'convex/server';
import { v } from 'convex/values';
import {
  internalMutation,
  mutation,
  query,
  type MutationCtx,
  type QueryCtx,
} from './_generated/server';
import type { Doc, Id } from './_generated/dataModel';
import { internal } from './_generated/api';
import {
  ACHIEVEMENT_CATALOG,
  buildAchievementOverview,
  type AchievementBadgeView,
  type AchievementCategory,
  type AchievementMetric,
  type AchievementProgressSnapshot,
  type AchievementRule,
} from './achievementCatalog';
import {
  resolveNotificationLanguage,
  type NotificationLanguage,
  type NotificationText,
} from './notificationCopy';
import { getAuthUserId, getOptionalAuthUserId } from './utils';
import { computeStreak, startOfDay } from './userStatsHelpers';

type LegacyAchievementInputData = {
  wpm?: number;
  accuracy?: number;
  vocabCount?: number;
};

type AchievementNotificationArgs = {
  userId: Id<'users'>;
  kind: 'achievement_unlocked';
  title: string;
  body: string;
  linkPath?: string;
  metadata?: Record<string, unknown>;
  dedupeKey?: string;
};

type UserBadgeDoc = Doc<'user_badges'>;

const ACHIEVEMENT_INPUT_DATA_VALIDATOR = v.object({
  wpm: v.optional(v.number()),
  accuracy: v.optional(v.number()),
  vocabCount: v.optional(v.number()),
});

const EMPTY_PROGRESS: AchievementProgressSnapshot = {
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

const enqueueAchievementNotification = makeFunctionReference<
  'mutation',
  AchievementNotificationArgs,
  unknown
>('notifications:enqueueNotification') as unknown as FunctionReference<
  'mutation',
  'internal',
  AchievementNotificationArgs,
  unknown
>;

function isAchievementMetric(value: string): value is AchievementMetric {
  return Object.prototype.hasOwnProperty.call(EMPTY_PROGRESS, value);
}

function readNumericMetric(data: LegacyAchievementInputData, key: string): number | null {
  const value = (data as Record<string, unknown>)[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function titleFromKey(rule: AchievementRule): string {
  const id = rule.id;
  if (id.startsWith('streak_')) return `${rule.targetValue} 日连续学习`;
  if (id.startsWith('vocab_')) return `词汇 ${rule.targetValue}`;
  if (id.startsWith('grammar_')) return `语法 ${rule.targetValue}`;
  if (id === 'listening_20h') return '听力 20 小时';
  if (id === 'listening_100h') return '听力 100 小时';
  if (id.startsWith('typing_')) return `打字 WPM ${rule.targetValue}`;
  if (id === 'topik_pass_1') return 'TOPIK 合格';
  if (id === 'topik_high_score_1') return 'TOPIK 高分';
  if (id === 'friends_1') return '第一位好友';
  if (id === 'friends_10') return '好友 10';
  if (id === 'group_join_1') return '加入小组';
  if (id === 'group_create_1') return '创建小组';
  return '成就徽章';
}

function buildAchievementUnlockedCopy(args: {
  language: NotificationLanguage;
  title: string;
  rewardXp: number;
}): NotificationText {
  if (args.language === 'zh') {
    return {
      title: '成就解锁',
      body: `你获得了「${args.title}」徽章，奖励 ${args.rewardXp} XP。`,
    };
  }
  if (args.language === 'vi') {
    return {
      title: 'Đã mở khóa thành tựu',
      body: `Bạn đã nhận huy hiệu "${args.title}" và ${args.rewardXp} XP.`,
    };
  }
  if (args.language === 'mn') {
    return {
      title: 'Амжилт нээгдлээ',
      body: `Та "${args.title}" тэмдэг болон ${args.rewardXp} XP авлаа.`,
    };
  }
  return {
    title: 'Achievement unlocked',
    body: `You earned "${args.title}" and ${args.rewardXp} XP.`,
  };
}

function getRuleByLegacyInput(
  category: AchievementCategory,
  data: LegacyAchievementInputData
): AchievementRule | null {
  if (category === 'TYPING') {
    const wpm = readNumericMetric(data, 'wpm');
    const accuracy = readNumericMetric(data, 'accuracy');
    if (wpm === null || accuracy === null || accuracy < 80) return null;
    return [...ACHIEVEMENT_CATALOG]
      .filter(rule => rule.metric === 'typingWpm' && wpm >= rule.targetValue)
      .sort((a, b) => b.targetValue - a.targetValue)[0] ?? null;
  }
  if (category === 'VOCAB') {
    const vocabCount = readNumericMetric(data, 'vocabCount');
    if (vocabCount === null) return null;
    return [...ACHIEVEMENT_CATALOG]
      .filter(rule => rule.metric === 'vocabCount' && vocabCount >= rule.targetValue)
      .sort((a, b) => b.targetValue - a.targetValue)[0] ?? null;
  }
  return null;
}

function patchProgress(progress: AchievementProgressSnapshot, metric: AchievementMetric, value: number) {
  return {
    ...progress,
    [metric]: Math.max(progress[metric], value),
  } satisfies AchievementProgressSnapshot;
}

function buildLegacyProgress(args: {
  category: AchievementCategory;
  data: LegacyAchievementInputData;
}): AchievementProgressSnapshot {
  let progress = { ...EMPTY_PROGRESS };
  if (args.category === 'TYPING') {
    const wpm = readNumericMetric(args.data, 'wpm');
    if (wpm !== null) progress = patchProgress(progress, 'typingWpm', wpm);
  }
  if (args.category === 'VOCAB') {
    const vocabCount = readNumericMetric(args.data, 'vocabCount');
    if (vocabCount !== null) progress = patchProgress(progress, 'vocabCount', vocabCount);
  }
  return progress;
}

function toUnlockedMap(badges: UserBadgeDoc[]) {
  const unlockedByBadgeId = new Map<string, { unlockedAt: number; isNew: boolean }>();
  for (const badge of badges) {
    if (typeof badge.badgeId !== 'string') continue;
    unlockedByBadgeId.set(badge.badgeId, {
      unlockedAt: badge.unlockedAt,
      isNew: badge.isNew,
    });
  }
  return unlockedByBadgeId;
}

function shouldCountCompletedExam(event: Doc<'learning_events'>): boolean {
  if (event.module !== 'EXAM') return false;
  if (event.eventName !== 'exam_submitted' && event.eventName !== 'exam_auto_submitted') return false;
  const score = typeof event.score === 'number' ? event.score : null;
  const accuracy = typeof event.accuracy === 'number' ? event.accuracy : null;
  return (score !== null && score >= 120) || (accuracy !== null && accuracy >= 60);
}

function shouldCountHighScoreExam(event: Doc<'learning_events'>): boolean {
  if (!shouldCountCompletedExam(event)) return false;
  const score = typeof event.score === 'number' ? event.score : null;
  const accuracy = typeof event.accuracy === 'number' ? event.accuracy : null;
  return (score !== null && score >= 160) || (accuracy !== null && accuracy >= 80);
}

async function collectProgressSnapshot(
  ctx: QueryCtx | MutationCtx,
  userId: Id<'users'>
): Promise<AchievementProgressSnapshot> {
  const [vocabProgress, grammarProgress, learningEvents, typingRecords, outgoing, incoming, groups] =
    await Promise.all([
      ctx.db
        .query('user_vocab_progress')
        .withIndex('by_user', q => q.eq('userId', userId))
        .take(5000),
      ctx.db
        .query('user_grammar_progress')
        .withIndex('by_user_grammar', q => q.eq('userId', userId))
        .take(5000),
      ctx.db
        .query('learning_events')
        .withIndex('by_user_eventAt', q => q.eq('userId', userId))
        .order('desc')
        .take(5000),
      ctx.db
        .query('typing_records')
        .withIndex('by_user_createdAt', q => q.eq('userId', userId))
        .order('desc')
        .take(1000),
      ctx.db
        .query('friendships')
        .withIndex('by_follower', q => q.eq('followerId', userId))
        .take(2000),
      ctx.db
        .query('friendships')
        .withIndex('by_following', q => q.eq('followingId', userId))
        .take(2000),
      ctx.db
        .query('study_group_members')
        .withIndex('by_user', q => q.eq('userId', userId))
        .take(200),
    ]);

  const activeDays = new Set<number>();
  let listeningMinutes = 0;
  let topikPassedCount = 0;
  let topikHighScoreCount = 0;

  for (const event of learningEvents) {
    activeDays.add(startOfDay(event.eventAt));
    if (event.module === 'LISTENING' || event.module === 'PODCAST') {
      listeningMinutes += Math.max(0, event.durationSec ?? 0) / 60;
    }
    if (shouldCountCompletedExam(event)) topikPassedCount += 1;
    if (shouldCountHighScoreExam(event)) topikHighScoreCount += 1;
  }

  const outgoingIds = new Set(outgoing.map(edge => String(edge.followingId)));
  let friendCount = 0;
  for (const edge of incoming) {
    if (outgoingIds.has(String(edge.followerId))) friendCount += 1;
  }

  const typingWpm = typingRecords.reduce((best, record) => {
    if (record.accuracy < 80) return best;
    return Math.max(best, record.wpm);
  }, 0);

  return {
    streakDays: computeStreak(activeDays, startOfDay(Date.now())),
    vocabCount: vocabProgress.filter(item => item.status === 'MASTERED' || (item.reps ?? 0) > 0)
      .length,
    grammarCount: grammarProgress.filter(item => item.status === 'MASTERED' || item.proficiency >= 80)
      .length,
    listeningMinutes: Math.round(listeningMinutes),
    typingWpm,
    topikPassedCount,
    topikHighScoreCount,
    friendCount,
    groupJoinedCount: groups.length,
    groupCreatedCount: groups.filter(group => group.role === 'owner').length,
  };
}

async function enqueueNotification(
  ctx: MutationCtx,
  userId: Id<'users'>,
  rule: AchievementRule
): Promise<void> {
  const language = await resolveNotificationLanguage(ctx, userId);
  const copy = buildAchievementUnlockedCopy({
    language,
    title: titleFromKey(rule),
    rewardXp: rule.rewardXp,
  });
  try {
    await ctx.scheduler.runAfter(0, enqueueAchievementNotification, {
      userId,
      kind: 'achievement_unlocked',
      title: copy.title,
      body: copy.body,
      linkPath: '/profile',
      metadata: { badgeId: rule.id, rewardXp: rule.rewardXp },
      dedupeKey: `achievement:${String(userId)}:${rule.id}`,
    });
  } catch {
    // Notifications are best-effort; XP and badge writes remain authoritative.
  }
}

async function unlockRule(
  ctx: MutationCtx,
  userId: Id<'users'>,
  rule: AchievementRule,
  progressValue: number
): Promise<AchievementBadgeView | null> {
  const existing = await ctx.db
    .query('user_badges')
    .withIndex('by_user_badgeId', q => q.eq('userId', userId).eq('badgeId', rule.id))
    .first();
  if (existing) return null;

  const now = Date.now();
  await ctx.db.insert('user_badges', {
    userId,
    category: rule.category,
    tier: rule.tier,
    milestoneValue: rule.targetValue,
    badgeId: rule.id,
    rewardXp: rule.rewardXp,
    titleKey: rule.titleKey,
    descriptionKey: rule.descriptionKey,
    iconKey: rule.iconKey,
    progressValue,
    targetValue: rule.targetValue,
    unlockedAt: now,
    isNew: true,
    metadata: {
      badgeId: rule.id,
      progressValue,
      targetValue: rule.targetValue,
      rewardXp: rule.rewardXp,
    },
  });

  await ctx.runMutation(internal.xp.addXP, {
    userId,
    amount: rule.rewardXp,
    source: 'ACHIEVEMENT',
  });
  await enqueueNotification(ctx, userId, rule);

  return {
    badgeId: rule.id,
    category: rule.category,
    tier: rule.tier,
    targetValue: rule.targetValue,
    progressValue,
    rewardXp: rule.rewardXp,
    titleKey: rule.titleKey,
    descriptionKey: rule.descriptionKey,
    iconKey: rule.iconKey,
    isUnlocked: true,
    unlockedAt: now,
    isNew: true,
  };
}

async function evaluateAndUnlock(
  ctx: MutationCtx,
  userId: Id<'users'>,
  progressOverride?: AchievementProgressSnapshot
) {
  const progress = progressOverride ?? (await collectProgressSnapshot(ctx, userId));
  const unlocked: AchievementBadgeView[] = [];

  for (const rule of ACHIEVEMENT_CATALOG) {
    const progressValue = Math.max(0, progress[rule.metric] ?? 0);
    if (progressValue < rule.targetValue) continue;
    const unlockedBadge = await unlockRule(ctx, userId, rule, progressValue);
    if (unlockedBadge) unlocked.push(unlockedBadge);
  }

  return {
    unlockedCount: unlocked.length,
    unlocked,
  };
}

export const evaluateUserAchievements = internalMutation({
  args: {
    userId: v.id('users'),
  },
  handler: async (ctx, args) => {
    return await evaluateAndUnlock(ctx, args.userId);
  },
});

export const evaluate = internalMutation({
  args: {
    userId: v.id('users'),
    category: v.union(
      v.literal('TYPING'),
      v.literal('VOCAB'),
      v.literal('STREAK'),
      v.literal('GRAMMAR'),
      v.literal('LISTENING'),
      v.literal('TOPIK'),
      v.literal('SOCIAL')
    ),
    data: ACHIEVEMENT_INPUT_DATA_VALIDATOR,
  },
  handler: async (ctx, args) => {
    const rule = getRuleByLegacyInput(args.category, args.data);
    if (!rule) return { unlockedCount: 0, unlocked: [] };
    const progress = buildLegacyProgress({ category: args.category, data: args.data });
    return await evaluateAndUnlock(ctx, args.userId, progress);
  },
});

export const syncMyAchievements = mutation({
  args: {},
  handler: async ctx => {
    const userId = await getAuthUserId(ctx);
    return await evaluateAndUnlock(ctx, userId);
  },
});

export const getAchievementOverview = query({
  args: {
    targetUserId: v.optional(v.id('users')),
  },
  handler: async (ctx, args) => {
    const currentUserId = await getOptionalAuthUserId(ctx);
    const targetUserId = args.targetUserId ?? currentUserId;
    if (!targetUserId) {
      return buildAchievementOverview({
        progress: EMPTY_PROGRESS,
        unlockedByBadgeId: new Map(),
      });
    }

    const [progress, badges] = await Promise.all([
      collectProgressSnapshot(ctx, targetUserId),
      ctx.db
        .query('user_badges')
        .withIndex('by_user', q => q.eq('userId', targetUserId))
        .collect(),
    ]);

    return buildAchievementOverview({
      progress,
      unlockedByBadgeId: toUnlockedMap(badges),
    });
  },
});

export const getPendingBadges = query({
  args: {},
  handler: async ctx => {
    const userId = await getOptionalAuthUserId(ctx);
    if (!userId) {
      return [];
    }
    return await ctx.db
      .query('user_badges')
      .withIndex('by_user_and_new', q => q.eq('userId', userId).eq('isNew', true))
      .collect();
  },
});

export const acknowledgeBadge = mutation({
  args: {
    badgeId: v.id('user_badges'),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    const badge = await ctx.db.get(args.badgeId);

    if (!badge) {
      throw new Error('Badge not found');
    }
    if (badge.userId !== userId) {
      throw new Error('Forbidden');
    }

    await ctx.db.patch(args.badgeId, { isNew: false });
  },
});

export const getUserGallery = query({
  args: {
    targetUserId: v.optional(v.id('users')),
  },
  handler: async (ctx, args) => {
    const currentUserId = await getOptionalAuthUserId(ctx);
    const targetUserId = args.targetUserId ?? currentUserId;
    if (!targetUserId) {
      return [];
    }

    return await ctx.db
      .query('user_badges')
      .withIndex('by_user', q => q.eq('userId', targetUserId))
      .order('desc')
      .collect();
  },
});

export const __testExports = {
  collectProgressSnapshot,
  buildAchievementUnlockedCopy,
  titleFromKey,
  isAchievementMetric,
};
