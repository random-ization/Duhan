import { internalMutation, mutation, query, type MutationCtx, type QueryCtx } from './_generated/server';
import type { Id } from './_generated/dataModel';
import { v } from 'convex/values';

type AchievementCategory = 'TYPING' | 'VOCAB' | 'STREAK';
type AchievementTier = 'BRONZE' | 'SILVER' | 'GOLD' | 'DIAMOND';

type MatchedRule = {
  category: AchievementCategory;
  tier: AchievementTier;
  milestoneValue: number;
  metadata?: {
    wpm?: number;
    accuracy?: number;
    vocabCount?: number;
  };
};

function readNumericMetric(data: unknown, key: string): number | null {
  if (!data || typeof data !== 'object') {
    return null;
  }
  const value = (data as Record<string, unknown>)[key];
  return typeof value === 'number' ? value : null;
}

function matchRule(category: AchievementCategory, data: unknown): MatchedRule | null {
  if (category === 'TYPING') {
    const wpm = readNumericMetric(data, 'wpm');
    const accuracy = readNumericMetric(data, 'accuracy');
    if (wpm !== null && accuracy !== null && wpm >= 100 && accuracy >= 95) {
      return {
        category,
        tier: 'GOLD',
        milestoneValue: 100,
        metadata: { wpm, accuracy },
      };
    }
    return null;
  }

  if (category === 'VOCAB') {
    const vocabCount = readNumericMetric(data, 'vocabCount');
    if (vocabCount !== null && vocabCount >= 500) {
      return {
        category,
        tier: 'SILVER',
        milestoneValue: 500,
        metadata: { vocabCount },
      };
    }
    return null;
  }

  return null;
}

async function findCurrentUserId(ctx: QueryCtx | MutationCtx): Promise<Id<'users'> | null> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    return null;
  }

  const userRecord =
    (await ctx.db
      .query('users')
      .withIndex('by_token', q => q.eq('token', identity.tokenIdentifier))
      .first()) ||
    (identity.email
      ? await ctx.db
        .query('users')
        .filter(q => q.eq(q.field('email'), identity.email))
        .first()
      : null);

  return userRecord?._id ?? null;
}

async function requireCurrentUserId(ctx: QueryCtx | MutationCtx): Promise<Id<'users'>> {
  const userId = await findCurrentUserId(ctx);
  if (!userId) {
    throw new Error('User not found');
  }
  return userId;
}

export const evaluate = internalMutation({
  args: {
    userId: v.id('users'),
    category: v.union(v.literal('TYPING'), v.literal('VOCAB'), v.literal('STREAK')),
    data: v.any(),
  },
  handler: async (ctx, args) => {
    const matched = matchRule(args.category, args.data);
    if (!matched) {
      return;
    }

    const existingBadge = await ctx.db
      .query('user_badges')
      .withIndex('by_user_category_tier', q =>
        q.eq('userId', args.userId).eq('category', matched.category).eq('tier', matched.tier)
      )
      .first();

    if (existingBadge) {
      return;
    }

    await ctx.db.insert('user_badges', {
      userId: args.userId,
      category: matched.category,
      tier: matched.tier,
      milestoneValue: matched.milestoneValue,
      unlockedAt: Date.now(),
      isNew: true,
      metadata: matched.metadata,
    });
  },
});

export const getPendingBadges = query({
  args: {},
  handler: async ctx => {
    const userId = await findCurrentUserId(ctx);
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
    const userId = await requireCurrentUserId(ctx);
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
    const currentUserId = await findCurrentUserId(ctx);
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
