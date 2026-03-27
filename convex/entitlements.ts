import {
  internalMutation,
  internalQuery,
  mutation,
  query,
  type MutationCtx,
  type QueryCtx,
} from './_generated/server';
import { ConvexError, v } from 'convex/values';
import type { Doc, Id } from './_generated/dataModel';
import { getAuthUserId, getOptionalAuthUserId } from './utils';
import { hasActiveSubscription } from './subscription';

export type EntitlementPlan = 'FREE' | 'PRO' | 'LIFETIME';
export type EntitlementFeature =
  | 'course_access'
  | 'vocab_new_words_daily'
  | 'vocab_test_daily'
  | 'topik_exam_access'
  | 'topik_writing_access'
  | 'media_play_daily'
  | 'media_speed_control'
  | 'ai_credits_daily'
  | 'pdf_export'
  | 'history_analytics';

export type EntitlementReason =
  | 'OK'
  | 'UNAUTHENTICATED'
  | 'UPGRADE_REQUIRED'
  | 'DAILY_LIMIT_REACHED'
  | 'FREE_UNIT_LIMIT'
  | 'LOCKED_SAMPLE_ONLY'
  | 'SPEED_LOCKED';

export type EntitlementDecision = {
  allowed: boolean;
  reason: EntitlementReason;
  remaining: number | null;
  upgradeSource: string | null;
};

type ViewerDoc =
  | Pick<Doc<'users'>, 'tier' | 'subscriptionType' | 'subscriptionExpiry'>
  | null
  | undefined;

type UsageWindow = {
  windowStart: number;
  windowEnd: number;
};

const DEFAULT_RESOURCE_KEY = '__default__';
const DAY_MS = 24 * 60 * 60 * 1000;
const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

export const FREE_COURSE_UNIT_LIMIT = 2;
export const FREE_VOCAB_NEW_WORDS_DAILY_LIMIT = 20;
export const FREE_VOCAB_TEST_DAILY_LIMIT = 1;
export const FREE_MEDIA_PLAYS_DAILY_LIMIT = 2;
export const FREE_AI_CREDITS_DAILY_LIMIT = 5;
export const SUBSCRIBER_AI_CREDITS_DAILY_LIMIT = 100;

function normalizePaidTier(value: string | undefined): string {
  return (value || '').trim().toUpperCase();
}

function parseExpiryMs(expiry?: string): number | null {
  if (!expiry) return null;
  const numeric = Number(expiry);
  if (Number.isFinite(numeric) && numeric > 0) {
    return numeric < 1_000_000_000_000 ? numeric * 1000 : numeric;
  }
  const parsed = Date.parse(expiry);
  return Number.isFinite(parsed) ? parsed : null;
}

export function resolveEntitlementPlan(
  user: ViewerDoc,
  nowMs: number = Date.now()
): EntitlementPlan {
  const subscriptionType = normalizePaidTier(user?.subscriptionType);
  if (hasActiveSubscription(user, nowMs)) {
    return subscriptionType === 'LIFETIME' ? 'LIFETIME' : 'PRO';
  }

  const tier = normalizePaidTier(user?.tier);
  const expiryMs = parseExpiryMs(user?.subscriptionExpiry);
  const isLegacyPaidTier =
    (tier === 'PAID' || tier === 'PREMIUM') && (expiryMs === null || expiryMs > nowMs);
  return isLegacyPaidTier ? 'PRO' : 'FREE';
}

export function isPremiumPlan(plan: EntitlementPlan): boolean {
  return plan === 'PRO' || plan === 'LIFETIME';
}

function resolveUsageWindow(nowMs: number = Date.now()): UsageWindow {
  const shifted = nowMs + KST_OFFSET_MS;
  const windowStart = Math.floor(shifted / DAY_MS) * DAY_MS - KST_OFFSET_MS;
  return {
    windowStart,
    windowEnd: windowStart + DAY_MS,
  };
}

function normalizeResourceKey(resourceKey?: string): string {
  return resourceKey?.trim() || DEFAULT_RESOURCE_KEY;
}

export function getDailyLimitForFeature(
  plan: EntitlementPlan,
  feature: Extract<
    EntitlementFeature,
    'vocab_new_words_daily' | 'vocab_test_daily' | 'media_play_daily' | 'ai_credits_daily'
  >
): number | null {
  if (isPremiumPlan(plan)) {
    if (feature === 'ai_credits_daily') return SUBSCRIBER_AI_CREDITS_DAILY_LIMIT;
    return null;
  }

  if (feature === 'vocab_new_words_daily') return FREE_VOCAB_NEW_WORDS_DAILY_LIMIT;
  if (feature === 'vocab_test_daily') return FREE_VOCAB_TEST_DAILY_LIMIT;
  if (feature === 'media_play_daily') return FREE_MEDIA_PLAYS_DAILY_LIMIT;
  return FREE_AI_CREDITS_DAILY_LIMIT;
}

async function sumFeatureUsage(
  ctx: QueryCtx | MutationCtx,
  userId: Id<'users'>,
  feature: EntitlementFeature,
  windowStart: number
): Promise<number> {
  const rows = await ctx.db
    .query('entitlement_usage')
    .withIndex('by_user_feature_window', q =>
      q.eq('userId', userId).eq('feature', feature).eq('windowStart', windowStart)
    )
    .collect();

  return rows.reduce((sum, row) => sum + Math.max(0, row.amount || 0), 0);
}

async function getUsageRow(
  ctx: MutationCtx,
  userId: Id<'users'>,
  feature: EntitlementFeature,
  windowStart: number,
  resourceKey?: string
) {
  return ctx.db
    .query('entitlement_usage')
    .withIndex('by_user_feature_window_resource', q =>
      q
        .eq('userId', userId)
        .eq('feature', feature)
        .eq('windowStart', windowStart)
        .eq('resourceKey', normalizeResourceKey(resourceKey))
    )
    .unique();
}

export async function getViewerEntitlementSnapshot(
  ctx: QueryCtx | MutationCtx,
  userId: Id<'users'> | null,
  nowMs: number = Date.now()
) {
  const window = resolveUsageWindow(nowMs);
  const user = userId ? await ctx.db.get(userId) : null;
  const plan = resolveEntitlementPlan(user, nowMs);
  const aiUsed = userId
    ? await sumFeatureUsage(ctx, userId, 'ai_credits_daily', window.windowStart)
    : 0;
  const vocabNewWordsUsed = userId
    ? await sumFeatureUsage(ctx, userId, 'vocab_new_words_daily', window.windowStart)
    : 0;
  const vocabTestsUsed = userId
    ? await sumFeatureUsage(ctx, userId, 'vocab_test_daily', window.windowStart)
    : 0;
  const mediaPlaysUsed = userId
    ? await sumFeatureUsage(ctx, userId, 'media_play_daily', window.windowStart)
    : 0;

  const aiCreditsDaily = getDailyLimitForFeature(plan, 'ai_credits_daily');
  const vocabNewWordsDaily = getDailyLimitForFeature(plan, 'vocab_new_words_daily');
  const vocabTestDaily = getDailyLimitForFeature(plan, 'vocab_test_daily');
  const mediaPlayDaily = getDailyLimitForFeature(plan, 'media_play_daily');

  return {
    plan,
    isPremium: isPremiumPlan(plan),
    windowStart: window.windowStart,
    limits: {
      courseFreeUnits: FREE_COURSE_UNIT_LIMIT,
      aiCreditsDaily,
      vocabNewWordsDaily,
      vocabTestDaily,
      mediaPlayDaily,
    },
    remaining: {
      aiCreditsDaily: aiCreditsDaily === null ? null : Math.max(0, aiCreditsDaily - aiUsed),
      vocabNewWordsDaily:
        vocabNewWordsDaily === null ? null : Math.max(0, vocabNewWordsDaily - vocabNewWordsUsed),
      vocabTestDaily: vocabTestDaily === null ? null : Math.max(0, vocabTestDaily - vocabTestsUsed),
      mediaPlayDaily: mediaPlayDaily === null ? null : Math.max(0, mediaPlayDaily - mediaPlaysUsed),
    },
    flags: {
      pdfExport: isPremiumPlan(plan),
      mediaSpeedControl: isPremiumPlan(plan),
      historyAnalytics: isPremiumPlan(plan),
    },
  };
}

export function evaluateCourseUnitAccess(
  plan: EntitlementPlan,
  unitIndex: number
): EntitlementDecision {
  const relativeUnitIndex =
    unitIndex > 10 ? ((Math.max(1, unitIndex) - 1) % 10) + 1 : Math.max(1, unitIndex);
  if (isPremiumPlan(plan) || relativeUnitIndex <= FREE_COURSE_UNIT_LIMIT) {
    return { allowed: true, reason: 'OK', remaining: null, upgradeSource: null };
  }
  return {
    allowed: false,
    reason: 'FREE_UNIT_LIMIT',
    remaining: 0,
    upgradeSource: 'course_locked',
  };
}

export function resolveExamAccessLevel(exam: {
  accessLevel?: string;
  isPaid?: boolean;
}): 'FREE_SAMPLE' | 'PRO' {
  const accessLevel = normalizePaidTier(exam.accessLevel);
  if (accessLevel === 'FREE_SAMPLE') return 'FREE_SAMPLE';
  if (accessLevel === 'PRO') return 'PRO';
  return exam.isPaid ? 'PRO' : 'FREE_SAMPLE';
}

export function evaluateTopikExamAccess(
  plan: EntitlementPlan,
  exam: { accessLevel?: string; isPaid?: boolean }
): EntitlementDecision {
  const accessLevel = resolveExamAccessLevel(exam);
  if (accessLevel === 'FREE_SAMPLE' || isPremiumPlan(plan)) {
    return { allowed: true, reason: 'OK', remaining: null, upgradeSource: null };
  }
  return {
    allowed: false,
    reason: 'LOCKED_SAMPLE_ONLY',
    remaining: 0,
    upgradeSource: 'topik_locked',
  };
}

export function resolveVideoAccessLevel(video: {
  accessLevel?: string;
  level?: string | undefined;
}): 'FREE' | 'PRO' {
  const accessLevel = normalizePaidTier(video.accessLevel);
  if (accessLevel === 'FREE') return 'FREE';
  if (accessLevel === 'PRO') return 'PRO';

  const normalizedLevel = normalizePaidTier(video.level).replaceAll('_', '').replaceAll('-', '');
  if (
    normalizedLevel === 'ADVANCED' ||
    normalizedLevel === 'C1' ||
    normalizedLevel === 'C2' ||
    normalizedLevel === 'TOPIK5' ||
    normalizedLevel === 'TOPIK6' ||
    normalizedLevel.includes('ADVANCED') ||
    normalizedLevel.includes('TOPIK5') ||
    normalizedLevel.includes('TOPIK6')
  ) {
    return 'PRO';
  }
  return 'FREE';
}

export function evaluateVideoAccess(
  plan: EntitlementPlan,
  video: { accessLevel?: string; level?: string }
): EntitlementDecision {
  const accessLevel = resolveVideoAccessLevel(video);
  if (accessLevel === 'FREE' || isPremiumPlan(plan)) {
    return { allowed: true, reason: 'OK', remaining: null, upgradeSource: null };
  }
  return {
    allowed: false,
    reason: 'UPGRADE_REQUIRED',
    remaining: 0,
    upgradeSource: 'media_limit',
  };
}

export async function consumeDailyFeatureUsage(
  ctx: MutationCtx,
  args: {
    userId: Id<'users'>;
    plan: EntitlementPlan;
    feature: Extract<
      EntitlementFeature,
      'vocab_new_words_daily' | 'vocab_test_daily' | 'media_play_daily' | 'ai_credits_daily'
    >;
    amount?: number;
    resourceKey?: string;
    dedupeByResource?: boolean;
    upgradeSource?: string;
  }
) {
  const nowMs = Date.now();
  const window = resolveUsageWindow(nowMs);
  const amount = Math.max(1, args.amount ?? 1);
  const limit = getDailyLimitForFeature(args.plan, args.feature);

  const existingRow = await getUsageRow(
    ctx,
    args.userId,
    args.feature,
    window.windowStart,
    args.resourceKey
  );

  const currentUsed = await sumFeatureUsage(ctx, args.userId, args.feature, window.windowStart);
  if (args.dedupeByResource && existingRow) {
    return {
      allowed: true,
      remaining: limit === null ? null : Math.max(0, limit - currentUsed),
      consumed: false,
    };
  }

  if (limit !== null && currentUsed + amount > limit) {
    return {
      allowed: false,
      remaining: Math.max(0, limit - currentUsed),
      reason: 'DAILY_LIMIT_REACHED' as const,
      upgradeSource: args.upgradeSource ?? null,
    };
  }

  const resourceKey = normalizeResourceKey(args.resourceKey);
  if (existingRow) {
    await ctx.db.patch(existingRow._id, {
      amount: existingRow.amount + amount,
      updatedAt: nowMs,
    });
  } else {
    await ctx.db.insert('entitlement_usage', {
      userId: args.userId,
      feature: args.feature,
      windowStart: window.windowStart,
      resourceKey,
      amount,
      createdAt: nowMs,
      updatedAt: nowMs,
    });
  }

  const usedAfter = currentUsed + amount;
  return {
    allowed: true,
    remaining: limit === null ? null : Math.max(0, limit - usedAfter),
    consumed: true,
  };
}

export const viewerAccess = query({
  args: {},
  handler: async ctx => {
    const userId = await getOptionalAuthUserId(ctx);
    return getViewerEntitlementSnapshot(ctx, userId);
  },
});

export const getViewerAccessInternal = internalQuery({
  args: {
    userId: v.id('users'),
  },
  handler: async (ctx, args) => {
    return getViewerEntitlementSnapshot(ctx, args.userId);
  },
});

export const getViewerPlan = query({
  args: {},
  handler: async ctx => {
    const userId = await getOptionalAuthUserId(ctx);
    const snapshot = await getViewerEntitlementSnapshot(ctx, userId);
    return { plan: snapshot.plan, isPremium: snapshot.isPremium };
  },
});

export const consumeVocabTestAttempt = mutation({
  args: {},
  handler: async ctx => {
    const userId = await getAuthUserId(ctx);
    const snapshot = await getViewerEntitlementSnapshot(ctx, userId);
    const result = await consumeDailyFeatureUsage(ctx, {
      userId,
      plan: snapshot.plan,
      feature: 'vocab_test_daily',
      upgradeSource: 'vocab_test_limit',
    });
    if (!result.allowed) {
      throw new ConvexError({
        code: 'DAILY_LIMIT_REACHED',
        feature: 'vocab_test_daily',
        upgradeSource: 'vocab_test_limit',
        remaining: result.remaining,
      });
    }
    return result;
  },
});

export const consumeMediaPlay = mutation({
  args: {
    resourceKey: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    const snapshot = await getViewerEntitlementSnapshot(ctx, userId);
    const result = await consumeDailyFeatureUsage(ctx, {
      userId,
      plan: snapshot.plan,
      feature: 'media_play_daily',
      resourceKey: args.resourceKey,
      dedupeByResource: true,
      upgradeSource: 'media_limit',
    });
    if (!result.allowed) {
      throw new ConvexError({
        code: 'DAILY_LIMIT_REACHED',
        feature: 'media_play_daily',
        upgradeSource: 'media_limit',
        remaining: result.remaining,
      });
    }
    return {
      ...result,
      speedAllowed: snapshot.flags.mediaSpeedControl,
    };
  },
});

export const consumeFeatureUsageInternal = internalMutation({
  args: {
    userId: v.id('users'),
    plan: v.union(v.literal('FREE'), v.literal('PRO'), v.literal('LIFETIME')),
    feature: v.union(
      v.literal('vocab_new_words_daily'),
      v.literal('vocab_test_daily'),
      v.literal('media_play_daily'),
      v.literal('ai_credits_daily')
    ),
    amount: v.optional(v.number()),
    resourceKey: v.optional(v.string()),
    dedupeByResource: v.optional(v.boolean()),
    upgradeSource: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return consumeDailyFeatureUsage(ctx, args);
  },
});

export const assertHistoryAnalytics = query({
  args: {},
  handler: async ctx => {
    const userId = await getOptionalAuthUserId(ctx);
    const snapshot = await getViewerEntitlementSnapshot(ctx, userId);
    return {
      allowed: snapshot.flags.historyAnalytics,
      plan: snapshot.plan,
    };
  },
});

export function assertPremiumFeature(
  plan: EntitlementPlan,
  upgradeSource: string,
  reason: EntitlementReason = 'UPGRADE_REQUIRED'
) {
  if (isPremiumPlan(plan)) return;
  throw new ConvexError({
    code: 'SUBSCRIPTION_REQUIRED',
    reason,
    upgradeSource,
  });
}
